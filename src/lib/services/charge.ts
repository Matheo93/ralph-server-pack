import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { BALANCE_THRESHOLDS, CATEGORY_WEIGHTS } from "@/lib/constants/task-weights"
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

/**
 * Assign a task to the parent with the least load
 * Updates the task assignment directly in the database
 */
export async function assignTaskToLeastLoadedParent(
  taskId: string,
  householdId: string
): Promise<{ success: boolean; assignedTo: string | null; error?: string }> {
  const leastLoadedUserId = await assignToLeastLoaded(householdId)

  if (!leastLoadedUserId) {
    return { success: false, assignedTo: null, error: "No available member in household" }
  }

  // Update the task with the new assignment
  await query(`
    UPDATE tasks
    SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2 AND household_id = $3
  `, [leastLoadedUserId, taskId, householdId])

  return { success: true, assignedTo: leastLoadedUserId }
}

interface ParentLoad {
  userId: string
  email: string
  totalLoad: number
  tasksCount: number
}

/**
 * Get weekly load for all parents in a household
 * Returns load breakdown by parent for the last 7 days
 */
export async function getWeeklyLoadByParent(
  householdId: string
): Promise<ParentLoad[]> {
  const result = await query<{
    user_id: string
    email: string
    total_load: string
    tasks_count: string
  }>(`
    SELECT
      hm.user_id,
      u.email,
      COALESCE(SUM(t.load_weight), 0)::text as total_load,
      COUNT(t.id)::text as tasks_count
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    LEFT JOIN tasks t ON t.assigned_to = hm.user_id
      AND t.household_id = hm.household_id
      AND t.status IN ('done', 'pending')
      AND (t.completed_at >= NOW() - INTERVAL '7 days'
           OR (t.status = 'pending' AND t.deadline >= CURRENT_DATE))
    WHERE hm.household_id = $1 AND hm.is_active = true
    GROUP BY hm.user_id, u.email
    ORDER BY total_load DESC
  `, [householdId])

  return result.map((r) => ({
    userId: r.user_id,
    email: r.email,
    totalLoad: parseInt(r.total_load, 10),
    tasksCount: parseInt(r.tasks_count, 10),
  }))
}

interface LoadBalanceResult {
  percentages: { userId: string; email: string; percentage: number }[]
  isBalanced: boolean
  alertLevel: "none" | "warning" | "critical"
  imbalanceRatio: string // e.g., "60/40"
}

/**
 * Get load balance percentage for a household
 * Returns the percentage split between parents (e.g., 60/40)
 */
export async function getLoadBalancePercentage(
  householdId: string
): Promise<LoadBalanceResult> {
  const parentLoads = await getWeeklyLoadByParent(householdId)

  const totalLoad = parentLoads.reduce((sum, p) => sum + p.totalLoad, 0)

  const percentages = parentLoads.map((p) => ({
    userId: p.userId,
    email: p.email,
    percentage: totalLoad > 0 ? Math.round((p.totalLoad / totalLoad) * 100) : 0,
  }))

  // Sort by percentage descending
  percentages.sort((a, b) => b.percentage - a.percentage)

  const maxPercentage = percentages[0]?.percentage ?? 0
  const isBalanced = maxPercentage <= BALANCE_THRESHOLDS.WARNING
  const alertLevel: "none" | "warning" | "critical" =
    maxPercentage > BALANCE_THRESHOLDS.CRITICAL
      ? "critical"
      : maxPercentage > BALANCE_THRESHOLDS.WARNING
        ? "warning"
        : "none"

  // Create ratio string (e.g., "60/40" or "50/50")
  const ratioValues = percentages.map((p) => p.percentage).join("/")
  const imbalanceRatio = ratioValues || "0/0"

  return {
    percentages,
    isBalanced,
    alertLevel,
    imbalanceRatio,
  }
}

interface DayLoad {
  date: string
  dayName: string
  loads: {
    userId: string
    userName: string
    load: number
  }[]
  totalLoad: number
}

/**
 * Get daily load breakdown for the current week
 * Used for the ChargeWeekChart component
 */
export async function getWeeklyChartData(): Promise<DayLoad[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  if (!membership) return []

  const householdId = membership.household_id

  // Get all household members
  const members = await query<{ user_id: string; email: string }>(`
    SELECT hm.user_id, u.email
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  // Get task weights by day and user for the current week
  const tasksByDay = await query<{
    day: string
    assigned_to: string
    daily_load: string
  }>(`
    SELECT
      DATE(COALESCE(completed_at, deadline))::text as day,
      assigned_to,
      SUM(load_weight)::text as daily_load
    FROM tasks
    WHERE household_id = $1
      AND assigned_to IS NOT NULL
      AND status IN ('done', 'pending')
      AND (
        (completed_at >= DATE_TRUNC('week', CURRENT_DATE))
        OR (status = 'pending' AND deadline >= DATE_TRUNC('week', CURRENT_DATE) AND deadline < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days')
      )
    GROUP BY DATE(COALESCE(completed_at, deadline)), assigned_to
    ORDER BY day ASC
  `, [householdId])

  // Build day-by-day structure for the week
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
  const today = new Date()
  const startOfWeek = new Date(today)
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday start
  startOfWeek.setDate(today.getDate() + diff)
  startOfWeek.setHours(0, 0, 0, 0)

  const result: DayLoad[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const dateStr = date.toISOString().split("T")[0] as string

    const dayLoads: DayLoad["loads"] = []
    let totalLoad = 0

    for (const member of members) {
      const dayData = tasksByDay.find(
        (t) => t.day === dateStr && t.assigned_to === member.user_id
      )
      const load = dayData ? parseInt(dayData.daily_load, 10) : 0
      totalLoad += load

      dayLoads.push({
        userId: member.user_id,
        userName: member.email?.split("@")[0] ?? "Parent",
        load,
      })
    }

    result.push({
      date: dateStr,
      dayName: dayNames[i] ?? "",
      loads: dayLoads,
      totalLoad,
    })
  }

  return result
}

interface WeekHistory {
  weekStart: string
  weekEnd: string
  weekLabel: string
  members: {
    userId: string
    userName: string
    load: number
    percentage: number
  }[]
  totalLoad: number
  isBalanced: boolean
}

/**
 * Get charge history for the last 4 weeks
 * Used for the ChargeHistoryCard component
 */
export async function getChargeHistory(): Promise<WeekHistory[]> {
  const currentUserId = await getUserId()
  if (!currentUserId) return []

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  if (!membership) return []

  const householdId = membership.household_id

  // Get all household members
  const members = await query<{ user_id: string; email: string }>(`
    SELECT hm.user_id, u.email
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  const history: WeekHistory[] = []

  // Get data for last 4 weeks
  for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
    const today = new Date()
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(today.getDate() + diff - weekOffset * 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const weekStartStr = startOfWeek.toISOString().split("T")[0] as string
    const weekEndStr = endOfWeek.toISOString().split("T")[0] as string

    // Get task weights for this week
    const weekLoads = await query<{
      assigned_to: string
      total_load: string
    }>(`
      SELECT
        assigned_to,
        SUM(load_weight)::text as total_load
      FROM tasks
      WHERE household_id = $1
        AND assigned_to IS NOT NULL
        AND status IN ('done', 'pending')
        AND (
          (completed_at >= $2::date AND completed_at < $3::date + INTERVAL '1 day')
          OR (status = 'pending' AND deadline >= $2::date AND deadline <= $3::date)
        )
      GROUP BY assigned_to
    `, [householdId, weekStartStr, weekEndStr])

    let totalLoad = 0
    const memberLoads: WeekHistory["members"] = []

    for (const member of members) {
      const memberData = weekLoads.find((w) => w.assigned_to === member.user_id)
      const load = memberData ? parseInt(memberData.total_load, 10) : 0
      totalLoad += load

      memberLoads.push({
        userId: member.user_id,
        userName: member.email?.split("@")[0] ?? "Parent",
        load,
        percentage: 0, // Will calculate after
      })
    }

    // Calculate percentages
    for (const member of memberLoads) {
      member.percentage = totalLoad > 0 ? Math.round((member.load / totalLoad) * 100) : 0
    }

    // Check if balanced
    const maxPercentage = Math.max(...memberLoads.map((m) => m.percentage), 0)
    const isBalanced = maxPercentage <= BALANCE_THRESHOLDS.WARNING

    // Week label
    const weekLabel =
      weekOffset === 0
        ? "Cette semaine"
        : weekOffset === 1
          ? "Semaine derni\u00e8re"
          : `Il y a ${weekOffset} semaines`

    history.push({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      weekLabel,
      members: memberLoads,
      totalLoad,
      isBalanced,
    })
  }

  return history
}

interface CategoryLoad {
  category: string
  categoryLabel: string
  totalLoad: number
  tasksCount: number
  percentage: number
  members: {
    userId: string
    userName: string
    load: number
    percentage: number
  }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  administratif: "Administratif",
  sante: "Sant\u00e9",
  ecole: "\u00c9cole",
  quotidien: "Quotidien",
  social: "Social",
  activites: "Activit\u00e9s",
  logistique: "Logistique",
}

/**
 * Get charge breakdown by category
 * Used for the dedicated charge page
 */
export async function getChargeByCategory(): Promise<{
  categories: CategoryLoad[]
  totalLoad: number
}> {
  const currentUserId = await getUserId()
  if (!currentUserId) return { categories: [], totalLoad: 0 }

  await setCurrentUser(currentUserId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [currentUserId])

  if (!membership) return { categories: [], totalLoad: 0 }

  const householdId = membership.household_id

  // Get all household members
  const members = await query<{ user_id: string; email: string }>(`
    SELECT hm.user_id, u.email
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  // Get task loads by category and user
  const tasksByCategory = await query<{
    category_code: string
    assigned_to: string
    total_load: string
    tasks_count: string
  }>(`
    SELECT
      c.code as category_code,
      t.assigned_to,
      SUM(t.load_weight)::text as total_load,
      COUNT(t.id)::text as tasks_count
    FROM tasks t
    JOIN categories c ON c.id = t.category_id
    WHERE t.household_id = $1
      AND t.assigned_to IS NOT NULL
      AND t.status IN ('done', 'pending')
      AND (t.completed_at >= NOW() - INTERVAL '7 days'
           OR (t.status = 'pending' AND t.deadline >= CURRENT_DATE))
    GROUP BY c.code, t.assigned_to
    ORDER BY c.code
  `, [householdId])

  // Build category breakdown
  const categoryMap = new Map<string, CategoryLoad>()
  let grandTotal = 0

  // Initialize categories from CATEGORY_WEIGHTS
  for (const categoryCode of Object.keys(CATEGORY_WEIGHTS)) {
    categoryMap.set(categoryCode, {
      category: categoryCode,
      categoryLabel: CATEGORY_LABELS[categoryCode] ?? categoryCode,
      totalLoad: 0,
      tasksCount: 0,
      percentage: 0,
      members: members.map((m) => ({
        userId: m.user_id,
        userName: m.email?.split("@")[0] ?? "Parent",
        load: 0,
        percentage: 0,
      })),
    })
  }

  // Populate with actual data
  for (const row of tasksByCategory) {
    const category = categoryMap.get(row.category_code)
    if (!category) continue

    const load = parseInt(row.total_load, 10)
    const count = parseInt(row.tasks_count, 10)

    category.totalLoad += load
    category.tasksCount += count
    grandTotal += load

    const memberData = category.members.find((m) => m.userId === row.assigned_to)
    if (memberData) {
      memberData.load += load
    }
  }

  // Calculate percentages
  const categories: CategoryLoad[] = []
  for (const category of categoryMap.values()) {
    if (category.totalLoad === 0) continue

    category.percentage = grandTotal > 0 ? Math.round((category.totalLoad / grandTotal) * 100) : 0

    for (const member of category.members) {
      member.percentage = category.totalLoad > 0
        ? Math.round((member.load / category.totalLoad) * 100)
        : 0
    }

    categories.push(category)
  }

  // Sort by total load descending
  categories.sort((a, b) => b.totalLoad - a.totalLoad)

  return {
    categories,
    totalLoad: grandTotal,
  }
}
