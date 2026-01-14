import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { BALANCE_THRESHOLDS } from "@/lib/constants/task-weights"
import type { HouseholdBalance, UserLoadSummary } from "@/types/task"

interface TaskWeight {
  assigned_to: string
  load_weight: number
}

interface HouseholdMember {
  user_id: string
  email: string
}

export async function calculateCharge(
  userId: string,
  periodDays: number = 7
): Promise<{ totalLoad: number; tasksCount: number }> {
  const result = await queryOne<{ total_load: string; tasks_count: string }>(`
    SELECT
      COALESCE(SUM(load_weight), 0) as total_load,
      COUNT(*) as tasks_count
    FROM tasks
    WHERE assigned_to = $1
      AND status IN ('done', 'pending')
      AND (completed_at >= NOW() - INTERVAL '${periodDays} days'
           OR (status = 'pending' AND deadline >= CURRENT_DATE - INTERVAL '${periodDays} days'))
  `, [userId])

  return {
    totalLoad: parseInt(result?.total_load ?? "0", 10),
    tasksCount: parseInt(result?.tasks_count ?? "0", 10),
  }
}

export async function getHouseholdBalance(
  periodDays: number = 7
): Promise<HouseholdBalance | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  if (!membership) return null

  const householdId = membership.household_id

  // Get all household members
  const members = await query<HouseholdMember>(`
    SELECT hm.user_id, u.email
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  // Get task weights per user for the period
  const taskWeights = await query<TaskWeight>(`
    SELECT assigned_to, load_weight
    FROM tasks
    WHERE household_id = $1
      AND status IN ('done', 'pending')
      AND assigned_to IS NOT NULL
      AND (completed_at >= NOW() - INTERVAL '${periodDays} days'
           OR (status = 'pending' AND deadline >= CURRENT_DATE))
  `, [householdId])

  // Calculate totals per member
  const memberLoads: Map<string, { load: number; count: number }> = new Map()

  for (const member of members) {
    memberLoads.set(member.user_id, { load: 0, count: 0 })
  }

  let totalHouseholdLoad = 0
  for (const tw of taskWeights) {
    const existing = memberLoads.get(tw.assigned_to)
    if (existing) {
      existing.load += tw.load_weight
      existing.count += 1
      totalHouseholdLoad += tw.load_weight
    }
  }

  // Build member summaries
  const memberSummaries: UserLoadSummary[] = []
  for (const member of members) {
    const data = memberLoads.get(member.user_id)
    const load = data?.load ?? 0
    const percentage = totalHouseholdLoad > 0 ? (load / totalHouseholdLoad) * 100 : 0

    memberSummaries.push({
      userId: member.user_id,
      userName: member.email?.split("@")[0] ?? "Parent",
      totalLoad: load,
      percentage,
      tasksCount: data?.count ?? 0,
    })
  }

  // Calculate balance status
  const maxPercentage = Math.max(...memberSummaries.map((m) => m.percentage), 0)
  const isBalanced = maxPercentage <= BALANCE_THRESHOLDS.WARNING
  const alertLevel: "none" | "warning" | "critical" =
    maxPercentage > BALANCE_THRESHOLDS.CRITICAL
      ? "critical"
      : maxPercentage > BALANCE_THRESHOLDS.WARNING
        ? "warning"
        : "none"

  return {
    householdId,
    totalLoad: totalHouseholdLoad,
    members: memberSummaries,
    isBalanced,
    alertLevel,
  }
}

export async function assignToLeastLoaded(
  householdId: string
): Promise<string | null> {
  // Get all active members
  const members = await query<{ user_id: string }>(`
    SELECT user_id
    FROM household_members
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  if (members.length === 0) return null
  if (members.length === 1) return members[0]?.user_id ?? null

  // Calculate current load for each member this week
  const loads: { userId: string; load: number }[] = []

  for (const member of members) {
    const result = await queryOne<{ total_load: string }>(`
      SELECT COALESCE(SUM(load_weight), 0) as total_load
      FROM tasks
      WHERE household_id = $1
        AND assigned_to = $2
        AND status IN ('done', 'pending')
        AND (completed_at >= NOW() - INTERVAL '7 days'
             OR (status = 'pending' AND deadline >= CURRENT_DATE))
    `, [householdId, member.user_id])

    loads.push({
      userId: member.user_id,
      load: parseInt(result?.total_load ?? "0", 10),
    })
  }

  // Sort by load ascending
  loads.sort((a, b) => a.load - b.load)

  // Return the least loaded member
  return loads[0]?.userId ?? null
}

export async function getWeeklyLoadByUser(
  householdId: string,
  userId: string
): Promise<{ byDay: { date: string; load: number }[]; total: number }> {
  const result = await query<{ day: string; daily_load: string }>(`
    SELECT
      DATE(COALESCE(completed_at, deadline))::text as day,
      SUM(load_weight) as daily_load
    FROM tasks
    WHERE household_id = $1
      AND assigned_to = $2
      AND status IN ('done', 'pending')
      AND (completed_at >= NOW() - INTERVAL '7 days'
           OR (status = 'pending' AND deadline >= CURRENT_DATE AND deadline <= CURRENT_DATE + INTERVAL '7 days'))
    GROUP BY DATE(COALESCE(completed_at, deadline))
    ORDER BY day ASC
  `, [householdId, userId])

  const byDay = result.map((r) => ({
    date: r.day,
    load: parseInt(r.daily_load, 10),
  }))

  const total = byDay.reduce((sum, d) => sum + d.load, 0)

  return { byDay, total }
}
