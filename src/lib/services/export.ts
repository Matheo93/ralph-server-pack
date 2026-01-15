import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getUserId } from "@/lib/auth/actions"
import { BALANCE_THRESHOLDS } from "@/lib/constants/task-weights"

// ----- Types for Export -----

export interface ExportHouseholdData {
  household: {
    id: string
    name: string
    country: string
    timezone: string
    streakCurrent: number
    streakBest: number
    createdAt: string
  }
  members: {
    userId: string
    email: string
    role: string
    joinedAt: string
  }[]
  children: {
    id: string
    firstName: string
    birthdate: string
    gender: string | null
    schoolName: string | null
    schoolLevel: string | null
    tags: string[]
  }[]
  tasks: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    deadline: string | null
    completedAt: string | null
    assignedToEmail: string | null
    childName: string | null
    category: string | null
    loadWeight: number
    isCritical: boolean
    createdAt: string
  }[]
  exportedAt: string
}

export interface ChargeReportData {
  householdName: string
  period: {
    start: string
    end: string
    label: string
  }
  totalLoad: number
  members: {
    userId: string
    userName: string
    email: string
    totalLoad: number
    percentage: number
    tasksCount: number
  }[]
  categories: {
    code: string
    label: string
    totalLoad: number
    percentage: number
    memberBreakdown: {
      userId: string
      userName: string
      load: number
      percentage: number
    }[]
  }[]
  balance: {
    isBalanced: boolean
    alertLevel: "none" | "warning" | "critical"
    ratio: string
  }
  generatedAt: string
}

export interface TaskHistoryData {
  householdName: string
  period: {
    start: string
    end: string
    label: string
  }
  tasks: {
    id: string
    title: string
    description: string | null
    status: string
    deadline: string | null
    completedAt: string | null
    assignedTo: string | null
    childName: string | null
    category: string | null
    loadWeight: number
    createdAt: string
  }[]
  statistics: {
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    totalLoad: number
    completionRate: number
  }
  generatedAt: string
}

// ----- Category Labels -----

const CATEGORY_LABELS: Record<string, string> = {
  administratif: "Administratif",
  sante: "Santé",
  ecole: "École",
  quotidien: "Quotidien",
  social: "Social",
  activites: "Activités",
  logistique: "Logistique",
}

// ----- Export Functions -----

/**
 * Export all household data for GDPR compliance
 * Returns complete JSON export of all user data
 */
export async function exportHouseholdData(
  householdId: string
): Promise<ExportHouseholdData | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Verify user belongs to this household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND household_id = $2 AND is_active = true
  `, [currentUserId, householdId])

  if (!membership) return null

  // Get household info
  const household = await queryOne<{
    id: string
    name: string
    country: string
    timezone: string
    streak_current: number
    streak_best: number
    created_at: string
  }>(`
    SELECT id, name, country, timezone, streak_current, streak_best, created_at
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household) return null

  // Get all members
  const members = await query<{
    user_id: string
    email: string
    role: string
    joined_at: string
  }>(`
    SELECT hm.user_id, u.email, hm.role, hm.joined_at
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  // Get all children
  const children = await query<{
    id: string
    first_name: string
    birthdate: string
    gender: string | null
    school_name: string | null
    school_level: string | null
    tags: string[]
  }>(`
    SELECT id, first_name, birthdate, gender, school_name, school_level, tags
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  // Get all tasks
  const tasks = await query<{
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    deadline: string | null
    completed_at: string | null
    assigned_email: string | null
    child_name: string | null
    category_code: string | null
    load_weight: number
    is_critical: boolean
    created_at: string
  }>(`
    SELECT
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.deadline,
      t.completed_at,
      u.email as assigned_email,
      c.first_name as child_name,
      cat.code as category_code,
      t.load_weight,
      t.is_critical,
      t.created_at
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN children c ON c.id = t.child_id
    LEFT JOIN categories cat ON cat.id = t.category_id
    WHERE t.household_id = $1
    ORDER BY t.created_at DESC
  `, [householdId])

  return {
    household: {
      id: household.id,
      name: household.name,
      country: household.country,
      timezone: household.timezone,
      streakCurrent: household.streak_current,
      streakBest: household.streak_best,
      createdAt: household.created_at,
    },
    members: members.map((m) => ({
      userId: m.user_id,
      email: m.email,
      role: m.role,
      joinedAt: m.joined_at,
    })),
    children: children.map((c) => ({
      id: c.id,
      firstName: c.first_name,
      birthdate: c.birthdate,
      gender: c.gender,
      schoolName: c.school_name,
      schoolLevel: c.school_level,
      tags: Array.isArray(c.tags) ? c.tags : [],
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline,
      completedAt: t.completed_at,
      assignedToEmail: t.assigned_email,
      childName: t.child_name,
      category: t.category_code ? (CATEGORY_LABELS[t.category_code] ?? t.category_code) : null,
      loadWeight: t.load_weight,
      isCritical: t.is_critical,
      createdAt: t.created_at,
    })),
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Generate charge report data for PDF generation
 * @param householdId - Household ID
 * @param periodType - "week" | "month" | "quarter"
 */
export async function getChargeReportData(
  householdId: string,
  periodType: "week" | "month" | "quarter" = "week"
): Promise<ChargeReportData | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Verify user belongs to this household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND household_id = $2 AND is_active = true
  `, [currentUserId, householdId])

  if (!membership) return null

  // Get household name
  const household = await queryOne<{ name: string }>(`
    SELECT name FROM households WHERE id = $1
  `, [householdId])

  if (!household) return null

  // Calculate period dates
  const now = new Date()
  let periodDays: number
  let periodLabel: string
  const endDate = new Date(now)
  const startDate = new Date(now)

  switch (periodType) {
    case "month":
      periodDays = 30
      startDate.setDate(now.getDate() - 30)
      periodLabel = "Dernier mois"
      break
    case "quarter":
      periodDays = 90
      startDate.setDate(now.getDate() - 90)
      periodLabel = "Dernier trimestre"
      break
    default:
      periodDays = 7
      startDate.setDate(now.getDate() - 7)
      periodLabel = "Dernière semaine"
  }

  const startDateStr = startDate.toISOString().split("T")[0] as string
  const endDateStr = endDate.toISOString().split("T")[0] as string

  // Get all household members
  const members = await query<{ user_id: string; email: string }>(`
    SELECT hm.user_id, u.email
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  // Get task weights per user for the period
  const taskWeights = await query<{
    assigned_to: string
    load_weight: number
    tasks_count: string
  }>(`
    SELECT
      assigned_to,
      SUM(load_weight) as load_weight,
      COUNT(*)::text as tasks_count
    FROM tasks
    WHERE household_id = $1
      AND status IN ('done', 'pending')
      AND assigned_to IS NOT NULL
      AND (completed_at >= $2::date
           OR (status = 'pending' AND deadline >= $2::date AND deadline <= $3::date))
    GROUP BY assigned_to
  `, [householdId, startDateStr, endDateStr])

  // Calculate totals
  let totalLoad = 0
  const memberLoads: Map<string, { load: number; count: number }> = new Map()

  for (const member of members) {
    memberLoads.set(member.user_id, { load: 0, count: 0 })
  }

  for (const tw of taskWeights) {
    const existing = memberLoads.get(tw.assigned_to)
    if (existing) {
      existing.load = tw.load_weight
      existing.count = parseInt(tw.tasks_count, 10)
      totalLoad += tw.load_weight
    }
  }

  // Build member summaries
  const memberSummaries = members.map((member) => {
    const data = memberLoads.get(member.user_id)
    const load = data?.load ?? 0
    const percentage = totalLoad > 0 ? Math.round((load / totalLoad) * 100) : 0

    return {
      userId: member.user_id,
      userName: member.email?.split("@")[0] ?? "Parent",
      email: member.email,
      totalLoad: load,
      percentage,
      tasksCount: data?.count ?? 0,
    }
  })

  // Get category breakdown
  const categoryData = await query<{
    category_code: string
    assigned_to: string
    total_load: string
  }>(`
    SELECT
      cat.code as category_code,
      t.assigned_to,
      SUM(t.load_weight)::text as total_load
    FROM tasks t
    LEFT JOIN categories cat ON cat.id = t.category_id
    WHERE t.household_id = $1
      AND t.assigned_to IS NOT NULL
      AND t.status IN ('done', 'pending')
      AND (t.completed_at >= $2::date
           OR (t.status = 'pending' AND t.deadline >= $2::date AND t.deadline <= $3::date))
    GROUP BY cat.code, t.assigned_to
    ORDER BY cat.code
  `, [householdId, startDateStr, endDateStr])

  // Build category breakdown
  const categoryMap = new Map<string, {
    code: string
    label: string
    totalLoad: number
    memberLoads: Map<string, number>
  }>()

  for (const row of categoryData) {
    const code = row.category_code ?? "autre"
    if (!categoryMap.has(code)) {
      categoryMap.set(code, {
        code,
        label: CATEGORY_LABELS[code] ?? code,
        totalLoad: 0,
        memberLoads: new Map(),
      })
    }
    const cat = categoryMap.get(code)
    if (cat) {
      const load = parseInt(row.total_load, 10)
      cat.totalLoad += load
      cat.memberLoads.set(row.assigned_to, (cat.memberLoads.get(row.assigned_to) ?? 0) + load)
    }
  }

  const categories = Array.from(categoryMap.values())
    .map((cat) => ({
      code: cat.code,
      label: cat.label,
      totalLoad: cat.totalLoad,
      percentage: totalLoad > 0 ? Math.round((cat.totalLoad / totalLoad) * 100) : 0,
      memberBreakdown: members.map((m) => ({
        userId: m.user_id,
        userName: m.email?.split("@")[0] ?? "Parent",
        load: cat.memberLoads.get(m.user_id) ?? 0,
        percentage: cat.totalLoad > 0
          ? Math.round(((cat.memberLoads.get(m.user_id) ?? 0) / cat.totalLoad) * 100)
          : 0,
      })),
    }))
    .sort((a, b) => b.totalLoad - a.totalLoad)

  // Calculate balance
  const maxPercentage = Math.max(...memberSummaries.map((m) => m.percentage), 0)
  const isBalanced = maxPercentage <= BALANCE_THRESHOLDS.WARNING
  const alertLevel: "none" | "warning" | "critical" =
    maxPercentage > BALANCE_THRESHOLDS.CRITICAL
      ? "critical"
      : maxPercentage > BALANCE_THRESHOLDS.WARNING
        ? "warning"
        : "none"

  const sortedPercentages = memberSummaries
    .map((m) => m.percentage)
    .sort((a, b) => b - a)
  const ratio = sortedPercentages.join("/")

  return {
    householdName: household.name,
    period: {
      start: startDateStr,
      end: endDateStr,
      label: periodLabel,
    },
    totalLoad,
    members: memberSummaries,
    categories,
    balance: {
      isBalanced,
      alertLevel,
      ratio,
    },
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Get tasks history data for PDF generation
 * @param householdId - Household ID
 * @param periodType - "week" | "month" | "quarter"
 */
export async function getTasksHistoryData(
  householdId: string,
  periodType: "week" | "month" | "quarter" = "week"
): Promise<TaskHistoryData | null> {
  const currentUserId = await getUserId()
  if (!currentUserId) return null

  await setCurrentUser(currentUserId)

  // Verify user belongs to this household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND household_id = $2 AND is_active = true
  `, [currentUserId, householdId])

  if (!membership) return null

  // Get household name
  const household = await queryOne<{ name: string }>(`
    SELECT name FROM households WHERE id = $1
  `, [householdId])

  if (!household) return null

  // Calculate period dates
  const now = new Date()
  let periodLabel: string
  const endDate = new Date(now)
  const startDate = new Date(now)

  switch (periodType) {
    case "month":
      startDate.setDate(now.getDate() - 30)
      periodLabel = "Dernier mois"
      break
    case "quarter":
      startDate.setDate(now.getDate() - 90)
      periodLabel = "Dernier trimestre"
      break
    default:
      startDate.setDate(now.getDate() - 7)
      periodLabel = "Dernière semaine"
  }

  const startDateStr = startDate.toISOString().split("T")[0] as string
  const endDateStr = endDate.toISOString().split("T")[0] as string

  // Get all tasks for the period
  const tasks = await query<{
    id: string
    title: string
    description: string | null
    status: string
    deadline: string | null
    completed_at: string | null
    assigned_email: string | null
    child_name: string | null
    category_code: string | null
    load_weight: number
    created_at: string
  }>(`
    SELECT
      t.id,
      t.title,
      t.description,
      t.status,
      t.deadline,
      t.completed_at,
      u.email as assigned_email,
      c.first_name as child_name,
      cat.code as category_code,
      t.load_weight,
      t.created_at
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN children c ON c.id = t.child_id
    LEFT JOIN categories cat ON cat.id = t.category_id
    WHERE t.household_id = $1
      AND (
        t.created_at >= $2::date
        OR t.completed_at >= $2::date
        OR (t.deadline >= $2::date AND t.deadline <= $3::date)
      )
    ORDER BY COALESCE(t.completed_at, t.deadline, t.created_at) DESC
  `, [householdId, startDateStr, endDateStr])

  // Calculate statistics
  const completedTasks = tasks.filter((t) => t.status === "done").length
  const pendingTasks = tasks.filter((t) => t.status === "pending").length
  const totalLoad = tasks.reduce((sum, t) => sum + t.load_weight, 0)
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  return {
    householdName: household.name,
    period: {
      start: startDateStr,
      end: endDateStr,
      label: periodLabel,
    },
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      deadline: t.deadline,
      completedAt: t.completed_at,
      assignedTo: t.assigned_email?.split("@")[0] ?? null,
      childName: t.child_name,
      category: t.category_code ? (CATEGORY_LABELS[t.category_code] ?? t.category_code) : null,
      loadWeight: t.load_weight,
      createdAt: t.created_at,
    })),
    statistics: {
      totalTasks: tasks.length,
      completedTasks,
      pendingTasks,
      totalLoad,
      completionRate,
    },
    generatedAt: new Date().toISOString(),
  }
}
