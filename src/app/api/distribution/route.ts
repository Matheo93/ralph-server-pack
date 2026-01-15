/**
 * Distribution API V2
 *
 * GET: Get load distribution with enhanced metrics
 * POST: Set exclusion period for a member
 * PUT: Manual task reassignment
 * PATCH: Update distribution preferences
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser, execute } from "@/lib/aws/database"
import { z } from "zod"
import {
  calculateLoadDistributionV2,
  calculateTaskWeight,
  buildFatigueState,
  type TaskWeightInput,
  type HistoricalLoadEntry,
} from "@/lib/distribution/load-calculator-v2"
import {
  analyzeBalanceStatus,
  generateWeeklyDigest,
  analyzeTrend,
  type AlertConfig,
} from "@/lib/distribution/balance-alerts"
import {
  findOptimalAssignee,
  createRotationTracker,
  createMemberAvailability,
  addExclusionPeriod,
  type MemberAvailability,
} from "@/lib/distribution/assignment-optimizer"

// =============================================================================
// SCHEMAS
// =============================================================================

const ExclusionPeriodSchema = z.object({
  userId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
})

const ReassignmentSchema = z.object({
  taskId: z.string().uuid(),
  toUserId: z.string().uuid(),
  reason: z.string().optional(),
})

const PreferencesSchema = z.object({
  userId: z.string().uuid(),
  preferredCategories: z.array(z.string()).optional(),
  blockedCategories: z.array(z.string()).optional(),
  maxWeeklyLoad: z.number().min(1).max(100).optional(),
})

// =============================================================================
// GET - Load Distribution
// =============================================================================

/**
 * GET /api/distribution
 * Get comprehensive load distribution with enhanced metrics
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const includeDigest = searchParams.get("digest") === "true"
  const includeTrends = searchParams.get("trends") === "true"
  const historyDays = Math.min(parseInt(searchParams.get("days") ?? "30"), 90)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Get household members with preferences
  const members = await query<{
    user_id: string
    name: string
    preferred_categories: string[] | null
    blocked_categories: string[] | null
    max_weekly_load: number | null
    last_rest_day: string | null
  }>(`
    SELECT
      hm.user_id,
      COALESCE(u.name, u.email) as name,
      hm.preferred_categories,
      hm.blocked_categories,
      hm.max_weekly_load,
      hm.last_rest_day
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  // Get exclusion periods
  const exclusions = await query<{
    user_id: string
    start_date: string
    end_date: string
    reason: string | null
  }>(`
    SELECT user_id, start_date, end_date, reason
    FROM member_exclusions
    WHERE household_id = $1 AND end_date >= NOW()
  `, [householdId])

  // Build member availability
  const userInfos: Array<{ id: string; name: string; lastRestDay?: Date }> = []
  const memberAvailabilities: MemberAvailability[] = []

  for (const member of members) {
    const memberExclusions = exclusions
      .filter((e) => e.user_id === member.user_id)
      .map((e) => ({
        startDate: new Date(e.start_date),
        endDate: new Date(e.end_date),
        reason: e.reason ?? undefined,
      }))

    const availability = createMemberAvailability(member.user_id, member.name, {
      preferredCategories: member.preferred_categories ?? [],
      blockedCategories: member.blocked_categories ?? [],
      maxWeeklyLoad: member.max_weekly_load ?? 20,
      exclusionPeriods: memberExclusions,
    })

    memberAvailabilities.push(availability)
    userInfos.push({
      id: member.user_id,
      name: member.name,
      lastRestDay: member.last_rest_day ? new Date(member.last_rest_day) : undefined,
    })
  }

  // Get pending tasks
  const pendingTasksData = await query<{
    id: string
    title: string
    category: string
    priority: number
    due_date: string | null
    is_recurring: boolean
    recurrence_pattern: string | null
    is_critical: boolean
    child_id: string | null
    assigned_to: string | null
    estimated_minutes: number | null
  }>(`
    SELECT
      id, title, category, priority, due_date,
      is_recurring, recurrence_pattern, is_critical,
      child_id, assigned_to, estimated_minutes
    FROM tasks
    WHERE household_id = $1 AND completed_at IS NULL
  `, [householdId])

  // Group pending tasks by user
  const pendingTasksByUser = new Map<string, TaskWeightInput[]>()

  for (const task of pendingTasksData) {
    if (task.assigned_to) {
      const taskInput: TaskWeightInput = {
        taskId: task.id,
        title: task.title,
        category: task.category,
        priority: task.priority,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        isRecurring: task.is_recurring,
        recurrencePattern: task.recurrence_pattern ?? undefined,
        isCritical: task.is_critical,
        childId: task.child_id ?? undefined,
        estimatedMinutes: task.estimated_minutes ?? undefined,
      }

      if (!pendingTasksByUser.has(task.assigned_to)) {
        pendingTasksByUser.set(task.assigned_to, [])
      }
      pendingTasksByUser.get(task.assigned_to)!.push(taskInput)
    }
  }

  // Get historical data
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - historyDays)

  const historyData = await query<{
    id: string
    user_id: string
    category: string
    weight: number
    completed_at: string
    minutes_spent: number | null
  }>(`
    SELECT
      id, assigned_to as user_id, category,
      COALESCE(weight, 2) as weight, completed_at,
      actual_minutes as minutes_spent
    FROM tasks
    WHERE household_id = $1
      AND completed_at IS NOT NULL
      AND completed_at >= $2
  `, [householdId, cutoffDate.toISOString()])

  const historicalEntries: HistoricalLoadEntry[] = historyData.map((h) => ({
    date: new Date(h.completed_at),
    userId: h.user_id,
    taskId: h.id,
    category: h.category,
    weight: h.weight,
    wasCompleted: true,
    minutesSpent: h.minutes_spent ?? undefined,
  }))

  // Calculate distribution
  const distribution = calculateLoadDistributionV2(
    householdId,
    userInfos,
    pendingTasksByUser,
    historicalEntries
  )

  // Analyze balance status
  const balanceStatus = analyzeBalanceStatus(householdId, distribution.users)

  // Build response
  const response: {
    distribution: typeof distribution
    balanceStatus: typeof balanceStatus
    digest?: ReturnType<typeof generateWeeklyDigest>
    trends?: ReturnType<typeof analyzeTrend>[]
    memberExclusions: Array<{
      userId: string
      userName: string
      periods: Array<{ start: Date; end: Date; reason?: string }>
    }>
  } = {
    distribution,
    balanceStatus,
    memberExclusions: members.map((m) => ({
      userId: m.user_id,
      userName: m.name,
      periods: exclusions
        .filter((e) => e.user_id === m.user_id)
        .map((e) => ({
          start: new Date(e.start_date),
          end: new Date(e.end_date),
          reason: e.reason ?? undefined,
        })),
    })),
  }

  // Include weekly digest if requested
  if (includeDigest) {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    response.digest = generateWeeklyDigest(
      householdId,
      distribution.users,
      historicalEntries,
      weekStart,
      weekEnd
    )
  }

  // Include trends if requested
  if (includeTrends) {
    response.trends = members.map((m) =>
      analyzeTrend(m.user_id, m.name, historicalEntries)
    )
  }

  return NextResponse.json(response)
}

// =============================================================================
// POST - Set Exclusion Period
// =============================================================================

/**
 * POST /api/distribution
 * Set exclusion period for a member
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = ExclusionPeriodSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { userId: targetUserId, startDate, endDate, reason } = validation.data

  // Validate dates
  if (endDate <= startDate) {
    return NextResponse.json(
      { error: "La date de fin doit être après la date de début" },
      { status: 400 }
    )
  }

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Verify target user is in household
  const targetMember = await queryOne<{ user_id: string }>(`
    SELECT user_id
    FROM household_members
    WHERE household_id = $1 AND user_id = $2 AND is_active = true
  `, [householdId, targetUserId])

  if (!targetMember) {
    return NextResponse.json(
      { error: "Le membre n'est pas dans le foyer" },
      { status: 400 }
    )
  }

  // Create exclusion period
  await execute(`
    INSERT INTO member_exclusions (household_id, user_id, start_date, end_date, reason, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (household_id, user_id, start_date)
    DO UPDATE SET end_date = $4, reason = $5
  `, [householdId, targetUserId, startDate.toISOString(), endDate.toISOString(), reason ?? null, userId])

  return NextResponse.json({
    success: true,
    exclusion: {
      userId: targetUserId,
      startDate,
      endDate,
      reason,
    },
  })
}

// =============================================================================
// PUT - Manual Reassignment
// =============================================================================

/**
 * PUT /api/distribution
 * Manually reassign a task
 */
export async function PUT(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = ReassignmentSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { taskId, toUserId, reason } = validation.data

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Verify target user is in household
  const targetMember = await queryOne<{ user_id: string; name: string }>(`
    SELECT hm.user_id, COALESCE(u.name, u.email) as name
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.user_id = $2 AND hm.is_active = true
  `, [householdId, toUserId])

  if (!targetMember) {
    return NextResponse.json(
      { error: "Le membre cible n'est pas dans le foyer" },
      { status: 400 }
    )
  }

  // Get task
  const task = await queryOne<{
    id: string
    title: string
    assigned_to: string | null
  }>(`
    SELECT id, title, assigned_to
    FROM tasks
    WHERE id = $1 AND household_id = $2 AND completed_at IS NULL
  `, [taskId, householdId])

  if (!task) {
    return NextResponse.json(
      { error: "Tâche non trouvée ou déjà terminée" },
      { status: 404 }
    )
  }

  const previousAssignee = task.assigned_to

  // Reassign
  await execute(`
    UPDATE tasks
    SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2
  `, [toUserId, taskId])

  // Log reassignment
  await execute(`
    INSERT INTO task_reassignments (
      task_id, household_id, from_user_id, to_user_id,
      reassigned_by, reason, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [taskId, householdId, previousAssignee, toUserId, userId, reason ?? null])

  return NextResponse.json({
    success: true,
    reassignment: {
      taskId,
      taskTitle: task.title,
      fromUserId: previousAssignee,
      toUserId,
      toUserName: targetMember.name,
      reason,
    },
  })
}

// =============================================================================
// PATCH - Update Preferences
// =============================================================================

/**
 * PATCH /api/distribution
 * Update member distribution preferences
 */
export async function PATCH(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = PreferencesSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { userId: targetUserId, preferredCategories, blockedCategories, maxWeeklyLoad } = validation.data

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Verify target user is in household
  const targetMember = await queryOne<{ user_id: string }>(`
    SELECT user_id
    FROM household_members
    WHERE household_id = $1 AND user_id = $2 AND is_active = true
  `, [householdId, targetUserId])

  if (!targetMember) {
    return NextResponse.json(
      { error: "Le membre n'est pas dans le foyer" },
      { status: 400 }
    )
  }

  // Build update query
  const updates: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (preferredCategories !== undefined) {
    updates.push(`preferred_categories = $${paramIndex++}`)
    params.push(preferredCategories)
  }

  if (blockedCategories !== undefined) {
    updates.push(`blocked_categories = $${paramIndex++}`)
    params.push(blockedCategories)
  }

  if (maxWeeklyLoad !== undefined) {
    updates.push(`max_weekly_load = $${paramIndex++}`)
    params.push(maxWeeklyLoad)
  }

  if (updates.length === 0) {
    return NextResponse.json({ success: true, updated: false })
  }

  updates.push(`updated_at = NOW()`)
  params.push(householdId, targetUserId)

  await execute(`
    UPDATE household_members
    SET ${updates.join(", ")}
    WHERE household_id = $${paramIndex++} AND user_id = $${paramIndex}
  `, params)

  return NextResponse.json({
    success: true,
    updated: true,
    preferences: {
      userId: targetUserId,
      preferredCategories,
      blockedCategories,
      maxWeeklyLoad,
    },
  })
}
