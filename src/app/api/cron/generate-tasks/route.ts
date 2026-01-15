import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/aws/database"
import {
  generateAgeBasedTasksForHousehold,
  type HouseholdAgeBasedResult,
} from "@/lib/services/age-based-tasks"
import {
  generatePeriodTasksForHousehold,
  getCurrentPeriod,
  getCurrentPeriodInfo,
  checkPeriodTransition,
} from "@/lib/services/period-tasks"
import type { TaskGenerationResult } from "@/types/template"

// Vercel cron secret for authentication
const CRON_SECRET = process.env["CRON_SECRET"] || process.env["VERCEL_CRON_SECRET"]

// =============================================================================
// TYPES
// =============================================================================

interface GenerationStats {
  householdsProcessed: number
  totalGenerated: number
  totalSkipped: number
  totalErrors: number
  details: {
    householdId: string
    ageBased: HouseholdAgeBasedResult
    periodBased: TaskGenerationResult
  }[]
}

interface CronResponse {
  success: boolean
  message: string
  timestamp: string
  currentPeriod: string
  periodInfo: {
    current: string
    daysRemaining: number
    nextPeriod: string
    daysUntilNext: number
    transition: ReturnType<typeof checkPeriodTransition>
  }
  stats: GenerationStats
  duration: number
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

function authenticateRequest(request: NextRequest): boolean {
  // Check Vercel cron signature
  const cronHeader = request.headers.get("x-vercel-cron-signature")
  if (cronHeader) return true

  // Check Authorization header
  const authHeader = request.headers.get("authorization")
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "")
    if (token === CRON_SECRET) return true
  }

  // In development, allow unauthenticated requests
  if (process.env.NODE_ENV !== "production") {
    return true
  }

  return false
}

// =============================================================================
// MAIN GENERATION LOGIC
// =============================================================================

async function generateTasksForAllHouseholds(): Promise<GenerationStats> {
  const stats: GenerationStats = {
    householdsProcessed: 0,
    totalGenerated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    details: [],
  }

  try {
    // Get all active households
    const households = await query<{ id: string; name: string }>(
      `
      SELECT DISTINCT h.id, h.name
      FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.is_active = true
      ORDER BY h.created_at DESC
      LIMIT 1000
    `
    )

    for (const household of households) {
      try {
        // Generate age-based tasks
        const ageBasedResult = await generateAgeBasedTasksForHousehold(household.id, {
          lookAheadDays: 30,
          includeOneTime: true,
          includePeriodic: true,
        })

        // Generate period-based tasks
        const periodBasedResult = await generatePeriodTasksForHousehold(household.id)

        stats.householdsProcessed++
        stats.totalGenerated += ageBasedResult.totalGenerated + periodBasedResult.generated
        stats.totalSkipped += ageBasedResult.totalSkipped + periodBasedResult.skipped
        stats.totalErrors += ageBasedResult.totalErrors + periodBasedResult.errors

        stats.details.push({
          householdId: household.id,
          ageBased: ageBasedResult,
          periodBased: periodBasedResult,
        })
      } catch (error) {
        console.error(`Error processing household ${household.id}:`, error)
        stats.totalErrors++
      }
    }
  } catch (error) {
    console.error("Error fetching households:", error)
    stats.totalErrors++
  }

  return stats
}

// =============================================================================
// GET /api/cron/generate-tasks
// =============================================================================

/**
 * GET /api/cron/generate-tasks
 *
 * Daily cron job endpoint for automatic task generation.
 * Generates tasks based on:
 * 1. Children's ages (vaccins, inscriptions, etc.)
 * 2. Current period (rentrée, noël, etc.)
 *
 * Designed for Vercel Cron or external scheduler.
 *
 * Example cron schedule (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/generate-tasks",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now()

  // Authenticate
  if (!authenticateRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
        timestamp: new Date().toISOString(),
        currentPeriod: getCurrentPeriod(),
        periodInfo: {
          current: "",
          daysRemaining: 0,
          nextPeriod: "",
          daysUntilNext: 0,
          transition: null,
        },
        stats: {
          householdsProcessed: 0,
          totalGenerated: 0,
          totalSkipped: 0,
          totalErrors: 0,
          details: [],
        },
        duration: 0,
      },
      { status: 401 }
    )
  }

  // Get period info
  const periodInfo = getCurrentPeriodInfo()
  const transition = checkPeriodTransition()

  // Generate tasks
  const stats = await generateTasksForAllHouseholds()

  const duration = Date.now() - startTime

  // Log summary
  console.log("[generate-tasks] Cron job completed", {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    householdsProcessed: stats.householdsProcessed,
    totalGenerated: stats.totalGenerated,
    totalSkipped: stats.totalSkipped,
    totalErrors: stats.totalErrors,
    currentPeriod: periodInfo.current.code,
  })

  return NextResponse.json({
    success: stats.totalErrors === 0,
    message:
      stats.totalErrors === 0
        ? `Successfully generated ${stats.totalGenerated} tasks for ${stats.householdsProcessed} households`
        : `Completed with ${stats.totalErrors} errors`,
    timestamp: new Date().toISOString(),
    currentPeriod: periodInfo.current.code,
    periodInfo: {
      current: periodInfo.current.labelFr,
      daysRemaining: periodInfo.daysRemaining,
      nextPeriod: periodInfo.nextPeriod.labelFr,
      daysUntilNext: periodInfo.daysUntilNext,
      transition,
    },
    stats,
    duration,
  })
}

// =============================================================================
// POST /api/cron/generate-tasks
// =============================================================================

/**
 * POST /api/cron/generate-tasks
 *
 * Manual trigger for task generation.
 * Supports optional body parameters:
 * - householdId: Generate only for specific household
 * - dryRun: Preview what would be generated without creating tasks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  // Authenticate
  if (!authenticateRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse body
  let body: { householdId?: string; dryRun?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is OK
  }

  const periodInfo = getCurrentPeriodInfo()
  const transition = checkPeriodTransition()

  if (body.dryRun) {
    // Return preview without generating
    return NextResponse.json({
      success: true,
      message: "Dry run - no tasks generated",
      timestamp: new Date().toISOString(),
      currentPeriod: periodInfo.current.code,
      periodInfo: {
        current: periodInfo.current.labelFr,
        daysRemaining: periodInfo.daysRemaining,
        nextPeriod: periodInfo.nextPeriod.labelFr,
        daysUntilNext: periodInfo.daysUntilNext,
        transition,
      },
      dryRun: true,
    })
  }

  // Generate for specific household or all
  let stats: GenerationStats
  if (body.householdId) {
    const ageBasedResult = await generateAgeBasedTasksForHousehold(body.householdId, {
      lookAheadDays: 30,
      includeOneTime: true,
      includePeriodic: true,
    })
    const periodBasedResult = await generatePeriodTasksForHousehold(body.householdId)

    stats = {
      householdsProcessed: 1,
      totalGenerated: ageBasedResult.totalGenerated + periodBasedResult.generated,
      totalSkipped: ageBasedResult.totalSkipped + periodBasedResult.skipped,
      totalErrors: ageBasedResult.totalErrors + periodBasedResult.errors,
      details: [
        {
          householdId: body.householdId,
          ageBased: ageBasedResult,
          periodBased: periodBasedResult,
        },
      ],
    }
  } else {
    stats = await generateTasksForAllHouseholds()
  }

  const duration = Date.now() - startTime

  return NextResponse.json({
    success: stats.totalErrors === 0,
    message:
      stats.totalErrors === 0
        ? `Successfully generated ${stats.totalGenerated} tasks`
        : `Completed with ${stats.totalErrors} errors`,
    timestamp: new Date().toISOString(),
    currentPeriod: periodInfo.current.code,
    periodInfo: {
      current: periodInfo.current.labelFr,
      daysRemaining: periodInfo.daysRemaining,
      nextPeriod: periodInfo.nextPeriod.labelFr,
      daysUntilNext: periodInfo.daysUntilNext,
      transition,
    },
    stats,
    duration,
  })
}
