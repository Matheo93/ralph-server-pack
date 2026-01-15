/**
 * Family Insights API Route
 * Handles analytics, comparisons, and recommendations
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  familyAnalytics,
  type Member,
  type TaskRecord,
  type TimeRange,
} from "@/lib/insights/family-analytics"
import {
  comparisonEngine,
  type MemberPerformance,
  type ComparisonMetric,
} from "@/lib/insights/comparison-engine"
import {
  recommendationEngine,
  type MemberProfile,
  type TaskContext,
  type FamilyContext,
} from "@/lib/insights/recommendation-engine"

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const MemberInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["parent", "child", "other"]),
  age: z.number().nullable(),
  joinedAt: z.string().datetime(),
})

const TaskRecordInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  assigneeId: z.string().nullable(),
  creatorId: z.string(),
  estimatedMinutes: z.number().nullable(),
  actualMinutes: z.number().nullable(),
  deadline: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

const GenerateInsightsSchema = z.object({
  action: z.literal("generate_insights"),
  householdId: z.string(),
  members: z.array(MemberInputSchema),
  tasks: z.array(TaskRecordInputSchema),
  range: z.enum(["day", "week", "month", "quarter", "year"]),
})

const MemberPerformanceInputSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  role: z.string(),
  metrics: z.object({
    completionRate: z.number(),
    tasksCompleted: z.number(),
    timeContributedMinutes: z.number(),
    onTimeRate: z.number(),
    streak: z.number(),
    points: z.number(),
    productivity: z.number(),
  }),
})

const GenerateLeaderboardSchema = z.object({
  action: z.literal("generate_leaderboard"),
  performances: z.array(MemberPerformanceInputSchema),
  metric: z.enum([
    "completion_rate",
    "tasks_completed",
    "time_contributed",
    "on_time_rate",
    "streak",
    "points",
    "productivity",
  ]),
  period: z.string(),
})

const CompareMembersSchema = z.object({
  action: z.literal("compare_members"),
  memberA: MemberPerformanceInputSchema,
  memberB: MemberPerformanceInputSchema,
})

const AnalyzeFairShareSchema = z.object({
  action: z.literal("analyze_fair_share"),
  performances: z.array(MemberPerformanceInputSchema),
  members: z.array(z.object({
    id: z.string(),
    role: z.string(),
    age: z.number().nullable(),
  })),
})

const CalculateAchievementsSchema = z.object({
  action: z.literal("calculate_achievements"),
  memberId: z.string(),
  performance: MemberPerformanceInputSchema,
  additionalContext: z.object({
    tasksBeforeDeadline: z.number().optional(),
    helpedMembers: z.array(z.string()).optional(),
    weeklyLeaderRuns: z.number().optional(),
    weekendTasks: z.number().optional(),
    earlyTasks: z.number().optional(),
    lateTasks: z.number().optional(),
    fastTasks: z.number().optional(),
  }).optional(),
})

const MemberProfileInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  age: z.number().nullable(),
  preferredCategories: z.array(z.string()),
  availableHours: z.array(z.number()),
  strengths: z.array(z.string()),
  currentWorkload: z.number(),
  completionRate: z.number(),
  recentTrend: z.enum(["improving", "stable", "declining"]),
})

const TaskContextInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  priority: z.string(),
  estimatedMinutes: z.number().nullable(),
  deadline: z.string().datetime().nullable(),
  skills: z.array(z.string()),
  preferredTime: z.enum(["morning", "afternoon", "evening", "any"]).nullable(),
})

const GenerateRecommendationsSchema = z.object({
  action: z.literal("generate_recommendations"),
  householdId: z.string(),
  members: z.array(MemberProfileInputSchema),
  pendingTasks: z.array(TaskContextInputSchema),
  averageCompletionRate: z.number(),
  overdueTasks: z.number(),
  categoryDistribution: z.record(z.string(), z.number()),
  weeklyGoal: z.number().nullable(),
  currentProgress: z.number(),
})

const RequestSchema = z.discriminatedUnion("action", [
  GenerateInsightsSchema,
  GenerateLeaderboardSchema,
  CompareMembersSchema,
  AnalyzeFairShareSchema,
  CalculateAchievementsSchema,
  GenerateRecommendationsSchema,
])

// =============================================================================
// HELPERS
// =============================================================================

function parseMember(input: z.infer<typeof MemberInputSchema>): Member {
  return {
    ...input,
    joinedAt: new Date(input.joinedAt),
  }
}

function parseTaskRecord(input: z.infer<typeof TaskRecordInputSchema>): TaskRecord {
  return {
    ...input,
    deadline: input.deadline ? new Date(input.deadline) : null,
    completedAt: input.completedAt ? new Date(input.completedAt) : null,
    createdAt: new Date(input.createdAt),
  }
}

function parseMemberProfile(input: z.infer<typeof MemberProfileInputSchema>): MemberProfile {
  return input
}

function parseTaskContext(input: z.infer<typeof TaskContextInputSchema>): TaskContext {
  return {
    ...input,
    deadline: input.deadline ? new Date(input.deadline) : null,
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

function handleGenerateInsights(
  data: z.infer<typeof GenerateInsightsSchema>
) {
  const members = data.members.map(parseMember)
  const tasks = data.tasks.map(parseTaskRecord)

  return familyAnalytics.generateFamilyInsights(
    data.householdId,
    members,
    tasks,
    data.range as TimeRange
  )
}

function handleGenerateLeaderboard(
  data: z.infer<typeof GenerateLeaderboardSchema>
) {
  return comparisonEngine.generateLeaderboard(
    data.performances as MemberPerformance[],
    data.metric as ComparisonMetric,
    data.period
  )
}

function handleCompareMembers(
  data: z.infer<typeof CompareMembersSchema>
) {
  return comparisonEngine.compareTwoMembers(
    data.memberA as MemberPerformance,
    data.memberB as MemberPerformance
  )
}

function handleAnalyzeFairShare(
  data: z.infer<typeof AnalyzeFairShareSchema>
) {
  return comparisonEngine.analyzeFairShare(
    data.performances as MemberPerformance[],
    data.members
  )
}

function handleCalculateAchievements(
  data: z.infer<typeof CalculateAchievementsSchema>
) {
  return comparisonEngine.calculateUnlockedAchievements(
    data.memberId,
    data.performance as MemberPerformance,
    data.additionalContext
  )
}

function handleGenerateRecommendations(
  data: z.infer<typeof GenerateRecommendationsSchema>
) {
  const context: FamilyContext = {
    householdId: data.householdId,
    members: data.members.map(parseMemberProfile),
    pendingTasks: data.pendingTasks.map(parseTaskContext),
    averageCompletionRate: data.averageCompletionRate,
    overdueTasks: data.overdueTasks,
    categoryDistribution: data.categoryDistribution,
    weeklyGoal: data.weeklyGoal,
    currentProgress: data.currentProgress,
  }

  const all = recommendationEngine.generateAllRecommendations(context)
  const top = recommendationEngine.getTopRecommendations(all, 10)

  return {
    recommendations: all,
    topRecommendations: top,
    totalCount: all.length,
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    let result: unknown

    switch (data.action) {
      case "generate_insights":
        result = handleGenerateInsights(data)
        break
      case "generate_leaderboard":
        result = handleGenerateLeaderboard(data)
        break
      case "compare_members":
        result = handleCompareMembers(data)
        break
      case "analyze_fair_share":
        result = handleAnalyzeFairShare(data)
        break
      case "calculate_achievements":
        result = handleCalculateAchievements(data)
        break
      case "generate_recommendations":
        result = handleGenerateRecommendations(data)
        break
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Insights API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")

  try {
    switch (action) {
      case "achievements": {
        return NextResponse.json({
          success: true,
          data: comparisonEngine.ACHIEVEMENTS,
        })
      }

      case "metric_labels": {
        return NextResponse.json({
          success: true,
          data: comparisonEngine.METRIC_LABELS,
        })
      }

      case "date_range": {
        const range = searchParams.get("range") as TimeRange
        const refDate = searchParams.get("date")
        const reference = refDate ? new Date(refDate) : new Date()

        if (!range || !["day", "week", "month", "quarter", "year"].includes(range)) {
          return NextResponse.json(
            { success: false, error: "Invalid range parameter" },
            { status: 400 }
          )
        }

        const dateRange = familyAnalytics.getDateRange(range, reference)
        return NextResponse.json({
          success: true,
          data: dateRange,
        })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
            validActions: ["achievements", "metric_labels", "date_range"],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Insights API GET error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
