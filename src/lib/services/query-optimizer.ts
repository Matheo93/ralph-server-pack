/**
 * Query Optimizer
 *
 * Helper functions to prevent N+1 queries and optimize database access.
 * Provides batch loading and caching utilities.
 */

import { query } from "@/lib/aws/database"

// =============================================================================
// TYPES
// =============================================================================

interface Task {
  id: string
  title: string
  status: string
  deadline: string | null
  child_id: string | null
  assigned_to: string | null
  household_id: string
}

interface Child {
  id: string
  first_name: string
  birthdate: string
  household_id: string
}

interface Member {
  user_id: string
  household_id: string
  role: string
  email?: string
  name?: string
}

// =============================================================================
// BATCH LOADERS (Prevent N+1)
// =============================================================================

/**
 * Batch load children by IDs
 * Use this instead of loading children one by one in a loop
 */
export async function batchLoadChildren(
  childIds: string[]
): Promise<Map<string, Child>> {
  if (childIds.length === 0) return new Map()

  const uniqueIds = [...new Set(childIds)]
  const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(", ")

  const children = await query<Child>(`
    SELECT id, first_name, birthdate, household_id
    FROM children
    WHERE id IN (${placeholders}) AND is_active = true
  `, uniqueIds)

  return new Map(children.map((c) => [c.id, c]))
}

/**
 * Batch load members by user IDs
 */
export async function batchLoadMembers(
  userIds: string[],
  householdId: string
): Promise<Map<string, Member>> {
  if (userIds.length === 0) return new Map()

  const uniqueIds = [...new Set(userIds)]
  const placeholders = uniqueIds.map((_, i) => `$${i + 2}`).join(", ")

  const members = await query<Member>(`
    SELECT hm.user_id, hm.household_id, hm.role, u.email, u.name
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1
      AND hm.user_id IN (${placeholders})
      AND hm.is_active = true
  `, [householdId, ...uniqueIds])

  return new Map(members.map((m) => [m.user_id, m]))
}

/**
 * Load tasks with children and assignees in one query
 * Prevents N+1 when displaying task lists
 */
export async function loadTasksWithRelations(
  householdId: string,
  options: {
    status?: string
    limit?: number
    offset?: number
    childId?: string
    assignedTo?: string
  } = {}
): Promise<Array<Task & { child_name: string | null; assignee_name: string | null }>> {
  const conditions = ["t.household_id = $1"]
  const params: unknown[] = [householdId]
  let paramIndex = 2

  if (options.status) {
    conditions.push(`t.status = $${paramIndex++}`)
    params.push(options.status)
  }

  if (options.childId) {
    conditions.push(`t.child_id = $${paramIndex++}`)
    params.push(options.childId)
  }

  if (options.assignedTo) {
    conditions.push(`t.assigned_to = $${paramIndex++}`)
    params.push(options.assignedTo)
  }

  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  return query<Task & { child_name: string | null; assignee_name: string | null }>(`
    SELECT
      t.id, t.title, t.status, t.deadline, t.child_id, t.assigned_to, t.household_id,
      c.first_name as child_name,
      u.name as assignee_name
    FROM tasks t
    LEFT JOIN children c ON c.id = t.child_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE ${conditions.join(" AND ")}
    ORDER BY
      CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END,
      t.deadline ASC,
      t.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `, params)
}

// =============================================================================
// DASHBOARD OPTIMIZED QUERIES
// =============================================================================

/**
 * Load dashboard summary in a single query
 */
export async function loadDashboardSummary(householdId: string): Promise<{
  pendingTasks: number
  overdueTasks: number
  completedToday: number
  totalChildren: number
  streakCurrent: number
  criticalTasks: number
}> {
  const result = await query<{
    pending_tasks: string
    overdue_tasks: string
    completed_today: string
    total_children: string
    streak_current: string
    critical_tasks: string
  }>(`
    SELECT
      (SELECT COUNT(*) FROM tasks WHERE household_id = $1 AND status = 'pending') as pending_tasks,
      (SELECT COUNT(*) FROM tasks WHERE household_id = $1 AND status = 'pending' AND deadline < CURRENT_DATE) as overdue_tasks,
      (SELECT COUNT(*) FROM tasks WHERE household_id = $1 AND status = 'done' AND completed_at::date = CURRENT_DATE) as completed_today,
      (SELECT COUNT(*) FROM children WHERE household_id = $1 AND is_active = true) as total_children,
      (SELECT COALESCE(streak_current, 0) FROM households WHERE id = $1) as streak_current,
      (SELECT COUNT(*) FROM tasks WHERE household_id = $1 AND status = 'pending' AND is_critical = true) as critical_tasks
  `, [householdId])

  const row = result[0]
  return {
    pendingTasks: parseInt(row?.pending_tasks ?? "0", 10),
    overdueTasks: parseInt(row?.overdue_tasks ?? "0", 10),
    completedToday: parseInt(row?.completed_today ?? "0", 10),
    totalChildren: parseInt(row?.total_children ?? "0", 10),
    streakCurrent: parseInt(row?.streak_current ?? "0", 10),
    criticalTasks: parseInt(row?.critical_tasks ?? "0", 10),
  }
}

/**
 * Load load balance for all members efficiently
 */
export async function loadMemberLoadBalance(
  householdId: string,
  daysBack: number = 30
): Promise<Array<{
  userId: string
  userName: string
  tasksCompleted: number
  totalWeight: number
  percentage: number
}>> {
  const result = await query<{
    user_id: string
    user_name: string
    tasks_completed: string
    total_weight: string
  }>(`
    SELECT
      u.id as user_id,
      COALESCE(u.name, u.email) as user_name,
      COUNT(t.id)::text as tasks_completed,
      COALESCE(SUM(t.load_weight), 0)::text as total_weight
    FROM household_members hm
    JOIN users u ON u.id = hm.user_id
    LEFT JOIN tasks t ON t.assigned_to = hm.user_id
      AND t.household_id = hm.household_id
      AND t.status = 'done'
      AND t.completed_at >= (CURRENT_DATE - $2 * INTERVAL '1 day')
    WHERE hm.household_id = $1 AND hm.is_active = true
    GROUP BY u.id, u.name, u.email
  `, [householdId, daysBack])

  const totalWeight = result.reduce(
    (sum, r) => sum + parseInt(r.total_weight, 10),
    0
  )

  return result.map((r) => {
    const weight = parseInt(r.total_weight, 10)
    return {
      userId: r.user_id,
      userName: r.user_name ?? "Unknown",
      tasksCompleted: parseInt(r.tasks_completed, 10),
      totalWeight: weight,
      percentage: totalWeight > 0 ? (weight / totalWeight) * 100 : 0,
    }
  })
}

// =============================================================================
// CACHING UTILITIES
// =============================================================================

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, { data: unknown; expiry: number }>()

/**
 * Get or set cache with TTL
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlMs: number = 60000 // 1 minute default
): Promise<T> {
  const now = Date.now()
  const cached = cache.get(key)

  if (cached && cached.expiry > now) {
    return cached.data as T
  }

  const data = await queryFn()
  cache.set(key, { data, expiry: now + ttlMs })

  // Clean up old entries periodically
  if (cache.size > 1000) {
    for (const [k, v] of cache.entries()) {
      if (v.expiry < now) cache.delete(k)
    }
  }

  return data
}

/**
 * Invalidate cache by prefix
 */
export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  cache.clear()
}

// =============================================================================
// PAGINATION UTILITIES
// =============================================================================

export interface PaginationResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Paginate query results with total count
 */
export async function paginatedQuery<T>(
  baseQuery: string,
  countQuery: string,
  params: unknown[],
  page: number = 1,
  pageSize: number = 20
): Promise<PaginationResult<T>> {
  const offset = (page - 1) * pageSize
  const dataQuery = `${baseQuery} LIMIT ${pageSize} OFFSET ${offset}`

  const [data, countResult] = await Promise.all([
    query<T>(dataQuery, params),
    query<{ count: string }>(countQuery, params),
  ])

  const total = parseInt(countResult[0]?.count ?? "0", 10)
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}
