/**
 * Family Justice API
 *
 * Endpoints for fairness metrics and reports:
 * - GET: Retrieve fairness score, trends, messages
 * - POST: Generate weekly/monthly report
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import {
  calculateFairnessScore,
  calculateCategoryFairness,
  calculateFairnessTrend,
  generateScoreBasedMessages,
  generateMemberMessages,
  generateWeeklySummary,
  generateWeeklyReport,
  generateMonthlyReport,
  generateWeeklyReportEmail,
  generateWeeklyReportPush,
  type MemberLoad,
  type ExclusionPeriod,
  type FairnessTrend,
  type WeeklyScoreData,
} from "@/lib/justice"

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const TaskDataSchema = z.object({
  id: z.string(),
  category: z.string(),
  weight: z.number().min(1).max(10),
  completedAt: z.string(),
  completedBy: z.string(),
  completedByName: z.string(),
})

const MemberDataSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  exclusionPeriods: z.array(
    z.object({
      startDate: z.string(),
      endDate: z.string(),
      reason: z.string().optional(),
    })
  ).optional(),
})

const GetFairnessInputSchema = z.object({
  householdId: z.string(),
  tasks: z.array(TaskDataSchema),
  members: z.array(MemberDataSchema),
  periodDays: z.number().min(1).max(365).default(7),
  historicalScores: z.array(
    z.object({
      date: z.string(),
      score: z.number(),
    })
  ).optional(),
})

const GenerateReportInputSchema = z.object({
  type: z.enum(["weekly", "monthly"]),
  householdId: z.string(),
  householdName: z.string(),
  weekNumber: z.number().optional(),
  month: z.number().optional(),
  year: z.number().optional(),
  tasks: z.array(TaskDataSchema),
  members: z.array(MemberDataSchema),
  weeklyScores: z.array(
    z.object({
      weekNumber: z.number(),
      score: z.number(),
      status: z.string(),
      memberLoads: z.array(
        z.object({
          userId: z.string(),
          userName: z.string(),
          tasksCompleted: z.number(),
          totalWeight: z.number(),
          percentage: z.number(),
          adjustedPercentage: z.number(),
          exclusionDays: z.number(),
        })
      ),
      categoryFairness: z.array(
        z.object({
          category: z.string(),
          fairnessScore: z.number(),
          totalTasks: z.number(),
          memberContributions: z.array(
            z.object({
              userId: z.string(),
              userName: z.string(),
              taskCount: z.number(),
              percentage: z.number(),
            })
          ),
        })
      ),
    })
  ).optional(),
  historicalScores: z.array(
    z.object({
      date: z.string(),
      score: z.number(),
    })
  ).optional(),
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Transform task data to member loads
 */
function transformToMemberLoads(
  tasks: z.infer<typeof TaskDataSchema>[],
  members: z.infer<typeof MemberDataSchema>[],
  periodDays: number
): MemberLoad[] {
  const loadMap = new Map<string, MemberLoad>()

  // Initialize all members
  for (const member of members) {
    const exclusionDays = calculateExclusionDays(
      member.exclusionPeriods ?? [],
      periodDays
    )

    loadMap.set(member.userId, {
      userId: member.userId,
      userName: member.userName,
      tasksCompleted: 0,
      totalWeight: 0,
      percentage: 0,
      adjustedPercentage: 0,
      exclusionDays,
    })
  }

  // Aggregate task completions
  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0)

  for (const task of tasks) {
    const load = loadMap.get(task.completedBy)
    if (load) {
      load.tasksCompleted += 1
      load.totalWeight += task.weight
    }
  }

  // Calculate percentages
  for (const load of loadMap.values()) {
    load.percentage = totalWeight > 0
      ? (load.totalWeight / totalWeight) * 100
      : 0

    // Adjust for exclusion days
    const activeDays = periodDays - load.exclusionDays
    if (activeDays > 0 && activeDays < periodDays) {
      const adjustmentFactor = periodDays / activeDays
      load.adjustedPercentage = load.percentage * adjustmentFactor
    } else {
      load.adjustedPercentage = load.percentage
    }
  }

  return Array.from(loadMap.values())
}

/**
 * Calculate exclusion days from periods
 */
function calculateExclusionDays(
  periods: Array<{ startDate: string; endDate: string }>,
  periodDays: number
): number {
  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - periodDays)

  let totalDays = 0

  for (const period of periods) {
    const start = new Date(period.startDate)
    const end = new Date(period.endDate)

    // Clip to period bounds
    const effectiveStart = start < periodStart ? periodStart : start
    const effectiveEnd = end > now ? now : end

    if (effectiveEnd >= effectiveStart) {
      const days = Math.ceil(
        (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      totalDays += days
    }
  }

  return Math.min(totalDays, periodDays)
}

/**
 * Transform to exclusion periods
 */
function transformToExclusionPeriods(
  members: z.infer<typeof MemberDataSchema>[]
): ExclusionPeriod[] {
  const periods: ExclusionPeriod[] = []

  for (const member of members) {
    for (const period of member.exclusionPeriods ?? []) {
      periods.push({
        userId: member.userId,
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate),
        reason: period.reason,
      })
    }
  }

  return periods
}

/**
 * Group tasks by category
 */
function groupTasksByCategory(
  tasks: z.infer<typeof TaskDataSchema>[]
): Map<string, z.infer<typeof TaskDataSchema>[]> {
  const groups = new Map<string, z.infer<typeof TaskDataSchema>[]>()

  for (const task of tasks) {
    const existing = groups.get(task.category)
    if (existing) {
      existing.push(task)
    } else {
      groups.set(task.category, [task])
    }
  }

  return groups
}

// =============================================================================
// GET HANDLER - Retrieve fairness metrics
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") ?? "score"

    // Parse body for POST-like GET with body
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { error: "Corps de requête requis" },
        { status: 400 }
      )
    }

    const parsed = GetFairnessInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { householdId, tasks, members, periodDays, historicalScores } = parsed.data

    // Calculate member loads
    const memberLoads = transformToMemberLoads(tasks, members, periodDays)
    const exclusionPeriods = transformToExclusionPeriods(members)

    // Calculate fairness score
    const fairnessScore = calculateFairnessScore(
      memberLoads,
      exclusionPeriods,
      periodDays
    )

    // Calculate category fairness
    const tasksByCategory = groupTasksByCategory(tasks)
    const categoryAnalyses = Array.from(tasksByCategory.entries()).map(
      ([category, categoryTasks]) => {
        const categoryLoads = transformToMemberLoads(categoryTasks, members, periodDays)
        return calculateCategoryFairness(category, categoryLoads)
      }
    )

    // Calculate trend
    const trend: FairnessTrend = historicalScores && historicalScores.length > 0
      ? calculateFairnessTrend(
          historicalScores.map((h) => ({
            date: new Date(h.date),
            score: h.score,
          }))
        )
      : {
          trend: "stable",
          previousScore: null,
          change: 0,
          weeklyScores: [],
          averageScore: fairnessScore.overallScore,
        }

    // Generate messages
    const messages = [
      ...generateScoreBasedMessages(fairnessScore, trend),
      ...generateMemberMessages(memberLoads),
    ]

    // Generate summary
    const summary = generateWeeklySummary(
      householdId,
      fairnessScore,
      trend,
      categoryAnalyses
    )

    return NextResponse.json({
      success: true,
      data: {
        fairnessScore,
        categoryAnalyses,
        trend,
        messages,
        summary,
      },
    })
  } catch (error) {
    console.error("Justice GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST HANDLER - Generate report
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = GenerateReportInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const {
      type,
      householdId,
      householdName,
      weekNumber,
      month,
      year,
      tasks,
      members,
      weeklyScores,
      historicalScores,
    } = parsed.data

    if (type === "weekly") {
      // Calculate current data
      const memberLoads = transformToMemberLoads(tasks, members, 7)
      const exclusionPeriods = transformToExclusionPeriods(members)
      const fairnessScore = calculateFairnessScore(memberLoads, exclusionPeriods, 7)

      const tasksByCategory = groupTasksByCategory(tasks)
      const categoryAnalyses = Array.from(tasksByCategory.entries()).map(
        ([category, categoryTasks]) => {
          const categoryLoads = transformToMemberLoads(categoryTasks, members, 7)
          return calculateCategoryFairness(category, categoryLoads)
        }
      )

      const trend: FairnessTrend = historicalScores && historicalScores.length > 0
        ? calculateFairnessTrend(
            historicalScores.map((h) => ({
              date: new Date(h.date),
              score: h.score,
            }))
          )
        : {
            trend: "stable",
            previousScore: null,
            change: 0,
            weeklyScores: [],
            averageScore: fairnessScore.overallScore,
          }

      const report = generateWeeklyReport(
        householdId,
        householdName,
        fairnessScore,
        trend,
        categoryAnalyses,
        weekNumber,
        year
      )

      const email = generateWeeklyReportEmail(report)
      const push = generateWeeklyReportPush(report)

      return NextResponse.json({
        success: true,
        data: {
          report,
          email,
          push,
        },
      })
    } else if (type === "monthly") {
      if (!weeklyScores || weeklyScores.length === 0) {
        return NextResponse.json(
          { error: "weeklyScores requis pour rapport mensuel" },
          { status: 400 }
        )
      }

      const weeklyScoreData: WeeklyScoreData[] = weeklyScores.map((w) => ({
        weekNumber: w.weekNumber,
        score: w.score,
        status: w.status,
        memberLoads: w.memberLoads,
        categoryFairness: w.categoryFairness,
      }))

      const report = generateMonthlyReport(
        householdId,
        householdName,
        weeklyScoreData,
        month,
        year
      )

      return NextResponse.json({
        success: true,
        data: {
          report,
        },
      })
    }

    return NextResponse.json(
      { error: "Type de rapport invalide" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Justice POST error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
