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
  calculateFairnessTrend,
  getAllCategoryFairness,
  generateScoreBasedMessages,
  generateMemberMessages,
  generateWeeklySummary,
  generateWeeklyReport,
  generateMonthlyReport,
  generateWeeklyReportEmail,
  type TaskCompletion,
  type MemberExclusion,
  type WeeklyScoreData,
} from "@/lib/justice"

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const TaskDataSchema = z.object({
  taskId: z.string(),
  category: z.string(),
  weight: z.number().min(1).max(10),
  completedAt: z.string(),
  userId: z.string(),
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
  periodStart: z.string(),
  periodEnd: z.string(),
  historicalScores: z.array(
    z.object({
      startDate: z.string(),
      endDate: z.string(),
      score: z.number(),
      gini: z.number(),
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
  periodStart: z.string(),
  periodEnd: z.string(),
  weeklyScores: z.array(
    z.object({
      weekNumber: z.number(),
      score: z.number(),
      status: z.string(),
      memberLoads: z.array(z.any()),
      categoryFairness: z.array(z.any()),
    })
  ).optional(),
  historicalScores: z.array(
    z.object({
      startDate: z.string(),
      endDate: z.string(),
      score: z.number(),
      gini: z.number(),
    })
  ).optional(),
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Transform task data to TaskCompletion[]
 */
function transformToTaskCompletions(
  tasks: z.infer<typeof TaskDataSchema>[]
): TaskCompletion[] {
  return tasks.map((t) => ({
    taskId: t.taskId,
    userId: t.userId,
    category: t.category,
    weight: t.weight,
    completedAt: new Date(t.completedAt),
  }))
}

/**
 * Transform member data to Map and exclusions
 */
function transformMembers(
  members: z.infer<typeof MemberDataSchema>[]
): { memberInfo: Map<string, string>; exclusions: MemberExclusion[] } {
  const memberInfo = new Map<string, string>()
  const exclusions: MemberExclusion[] = []

  for (const member of members) {
    memberInfo.set(member.userId, member.userName)

    for (const period of member.exclusionPeriods ?? []) {
      exclusions.push({
        userId: member.userId,
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate),
        reason: period.reason,
      })
    }
  }

  return { memberInfo, exclusions }
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

    const { householdId, tasks, members, periodStart, periodEnd, historicalScores } = parsed.data

    // Transform data
    const taskCompletions = transformToTaskCompletions(tasks)
    const { memberInfo, exclusions } = transformMembers(members)
    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    // Calculate fairness score
    const fairnessScore = calculateFairnessScore(
      householdId,
      taskCompletions,
      memberInfo,
      exclusions,
      start,
      end
    )

    // Calculate category fairness
    const categoryAnalyses = getAllCategoryFairness(fairnessScore.memberLoads)

    // Calculate trend
    const trend = historicalScores && historicalScores.length > 0
      ? calculateFairnessTrend(
          householdId,
          historicalScores.map((h) => ({
            startDate: new Date(h.startDate),
            endDate: new Date(h.endDate),
            score: h.score,
            gini: h.gini,
          }))
        )
      : {
          householdId,
          periods: [],
          trend: "stable" as const,
          averageScore: fairnessScore.overallScore,
          bestPeriod: null,
          worstPeriod: null,
        }

    // Generate messages
    const messages = [
      ...generateScoreBasedMessages(fairnessScore, trend),
      ...generateMemberMessages(fairnessScore.memberLoads),
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
      periodStart,
      periodEnd,
      weeklyScores,
      historicalScores,
    } = parsed.data

    if (type === "weekly") {
      // Transform data
      const taskCompletions = transformToTaskCompletions(tasks)
      const { memberInfo, exclusions } = transformMembers(members)
      const start = new Date(periodStart)
      const end = new Date(periodEnd)

      // Calculate fairness score
      const fairnessScore = calculateFairnessScore(
        householdId,
        taskCompletions,
        memberInfo,
        exclusions,
        start,
        end
      )

      // Calculate category fairness
      const categoryAnalyses = getAllCategoryFairness(fairnessScore.memberLoads)

      // Calculate trend
      const trend = historicalScores && historicalScores.length > 0
        ? calculateFairnessTrend(
            householdId,
            historicalScores.map((h) => ({
              startDate: new Date(h.startDate),
              endDate: new Date(h.endDate),
              score: h.score,
              gini: h.gini,
            }))
          )
        : {
            householdId,
            periods: [],
            trend: "stable" as const,
            averageScore: fairnessScore.overallScore,
            bestPeriod: null,
            worstPeriod: null,
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

      return NextResponse.json({
        success: true,
        data: {
          report,
          email,
        },
      })
    } else if (type === "monthly") {
      if (!weeklyScores || weeklyScores.length === 0) {
        return NextResponse.json(
          { error: "weeklyScores requis pour rapport mensuel" },
          { status: 400 }
        )
      }

      const report = generateMonthlyReport(
        householdId,
        householdName,
        weeklyScores as WeeklyScoreData[],
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
