import { query, queryOne } from "@/lib/aws/database"
import { assignToLeastLoaded, getWeeklyLoadByParent } from "./charge"

interface HouseholdMember {
  userId: string
  email: string
  role: string
}

interface TaskInfo {
  id: string
  householdId: string
  childId: string | null
  categoryId: string | null
  assignedTo: string | null
  loadWeight?: number
}

interface AssignmentResult {
  assignedTo: string | null
  reason:
    | "least_loaded"
    | "rotation"
    | "only_member"
    | "already_assigned"
    | "excluded"
    | "preferred"
    | "competent"
}

interface MemberExclusion {
  memberId: string
  excludeFrom: Date
  excludeUntil: Date
  reason: string
}

/**
 * Category preference types
 */
export type PreferenceLevel = "prefer" | "neutral" | "dislike" | "expert"

export interface CategoryPreference {
  userId: string
  categoryId: string
  preferenceLevel: PreferenceLevel
  reason?: string
}

export interface MemberPreferences {
  userId: string
  categoryPreferences: CategoryPreference[]
  preferredLoadMax?: number // Max weekly points preference
  preferredDays?: string[] // Preferred days for tasks (mon, tue, etc.)
}

/**
 * Assignment history entry for long-term balancing
 */
interface AssignmentHistory {
  userId: string
  categoryId: string
  assignmentCount: number
  totalPoints: number
}

/**
 * Determine automatic assignment for a task based on load balancing rules
 * Enhanced with preferences, competency, and long-term balancing
 */
export async function determineAssignment(
  task: TaskInfo,
  householdMembers: HouseholdMember[]
): Promise<AssignmentResult> {
  // If already assigned, keep assignment
  if (task.assignedTo) {
    return { assignedTo: task.assignedTo, reason: "already_assigned" }
  }

  // Single member household - assign directly
  if (householdMembers.length === 1) {
    return { assignedTo: householdMembers[0]?.userId ?? null, reason: "only_member" }
  }

  // Filter out excluded members
  const availableMembers = await filterExcludedMembers(
    householdMembers,
    task.householdId
  )

  if (availableMembers.length === 0) {
    return { assignedTo: null, reason: "excluded" }
  }

  if (availableMembers.length === 1) {
    return { assignedTo: availableMembers[0]?.userId ?? null, reason: "only_member" }
  }

  // Check for expert/competent member for this category
  if (task.categoryId) {
    const expertMember = await findExpertMember(
      task.categoryId,
      availableMembers,
      task.householdId
    )
    if (expertMember) {
      return { assignedTo: expertMember, reason: "competent" }
    }
  }

  // Check category preferences
  if (task.categoryId) {
    const preferredMember = await findPreferredMember(
      task.categoryId,
      availableMembers,
      task.householdId
    )
    if (preferredMember) {
      // Check if assigning to preferred member wouldn't cause severe imbalance
      const wouldCauseImbalance = await checkWouldCauseImbalance(
        preferredMember,
        task.loadWeight ?? 3,
        task.householdId
      )
      if (!wouldCauseImbalance) {
        return { assignedTo: preferredMember, reason: "preferred" }
      }
    }
  }

  // Get current loads for available members
  const parentLoads = await getWeeklyLoadByParent(task.householdId)
  const availableLoads = parentLoads.filter((p) =>
    availableMembers.some((m) => m.userId === p.userId)
  )

  // Filter out members who dislike this category (unless all members dislike it)
  if (task.categoryId) {
    const membersWhoDoNotDislike = await filterDislikingMembers(
      task.categoryId,
      availableMembers,
      task.householdId
    )
    if (membersWhoDoNotDislike.length > 0) {
      // Use filtered list for load balancing
      const filteredLoads = availableLoads.filter((l) =>
        membersWhoDoNotDislike.some((m) => m.userId === l.userId)
      )

      if (filteredLoads.length > 0) {
        // Check for long-term balancing within this category
        const leastAssignedInCategory = await findLeastAssignedInCategory(
          task.categoryId,
          membersWhoDoNotDislike,
          task.householdId
        )
        if (leastAssignedInCategory && filteredLoads.length >= 2) {
          // Only use history balancing if loads are relatively close
          const minLoad = Math.min(...filteredLoads.map((l) => l.totalLoad))
          const leastAssignedLoad =
            filteredLoads.find((l) => l.userId === leastAssignedInCategory)?.totalLoad ?? minLoad

          if (leastAssignedLoad <= minLoad + 5) {
            return { assignedTo: leastAssignedInCategory, reason: "rotation" }
          }
        }
      }
    }
  }

  // Check if loads are equal (or very close)
  if (availableLoads.length >= 2) {
    const minLoad = Math.min(...availableLoads.map((l) => l.totalLoad))
    const maxLoad = Math.max(...availableLoads.map((l) => l.totalLoad))
    const loadDiff = maxLoad - minLoad

    // If loads are equal or within 2 points, use rotation
    if (loadDiff <= 2) {
      const lastAssigned = await getLastAssignedMember(task.householdId)
      const rotatedMember = rotateIfEqual(lastAssigned, availableMembers)
      if (rotatedMember) {
        return { assignedTo: rotatedMember, reason: "rotation" }
      }
    }
  }

  // Default: assign to least loaded
  const leastLoaded = await assignToLeastLoaded(task.householdId)
  return { assignedTo: leastLoaded, reason: "least_loaded" }
}

/**
 * Find member with "expert" preference for a category
 */
async function findExpertMember(
  categoryId: string,
  members: HouseholdMember[],
  householdId: string
): Promise<string | null> {
  const memberIds = members.map((m) => m.userId)
  if (memberIds.length === 0) return null

  const result = await queryOne<{ user_id: string }>(`
    SELECT user_id
    FROM member_category_preferences
    WHERE category_id = $1
      AND household_id = $2
      AND user_id = ANY($3)
      AND preference_level = 'expert'
    LIMIT 1
  `, [categoryId, householdId, memberIds])

  return result?.user_id ?? null
}

/**
 * Find member with "prefer" preference for a category
 */
async function findPreferredMember(
  categoryId: string,
  members: HouseholdMember[],
  householdId: string
): Promise<string | null> {
  const memberIds = members.map((m) => m.userId)
  if (memberIds.length === 0) return null

  const result = await queryOne<{ user_id: string }>(`
    SELECT user_id
    FROM member_category_preferences
    WHERE category_id = $1
      AND household_id = $2
      AND user_id = ANY($3)
      AND preference_level = 'prefer'
    ORDER BY created_at ASC
    LIMIT 1
  `, [categoryId, householdId, memberIds])

  return result?.user_id ?? null
}

/**
 * Filter out members who marked "dislike" for this category
 */
async function filterDislikingMembers(
  categoryId: string,
  members: HouseholdMember[],
  householdId: string
): Promise<HouseholdMember[]> {
  const memberIds = members.map((m) => m.userId)
  if (memberIds.length === 0) return []

  const dislikingMembers = await query<{ user_id: string }>(`
    SELECT user_id
    FROM member_category_preferences
    WHERE category_id = $1
      AND household_id = $2
      AND user_id = ANY($3)
      AND preference_level = 'dislike'
  `, [categoryId, householdId, memberIds])

  const dislikingIds = new Set(dislikingMembers.map((d) => d.user_id))

  return members.filter((m) => !dislikingIds.has(m.userId))
}

/**
 * Check if assigning to a member would cause severe imbalance (>65/35)
 */
async function checkWouldCauseImbalance(
  memberId: string,
  taskWeight: number,
  householdId: string
): Promise<boolean> {
  const parentLoads = await getWeeklyLoadByParent(householdId)

  if (parentLoads.length < 2) return false

  const totalLoad = parentLoads.reduce((sum, p) => sum + p.totalLoad, 0) + taskWeight
  const memberLoad = (parentLoads.find((p) => p.userId === memberId)?.totalLoad ?? 0) + taskWeight

  if (totalLoad === 0) return false

  const memberPercent = (memberLoad / totalLoad) * 100

  // Consider imbalanced if would exceed 65%
  return memberPercent > 65
}

/**
 * Find member with least assignments in a specific category (long-term balancing)
 */
async function findLeastAssignedInCategory(
  categoryId: string,
  members: HouseholdMember[],
  householdId: string
): Promise<string | null> {
  const memberIds = members.map((m) => m.userId)
  if (memberIds.length === 0) return null

  // Get assignment history for last 30 days
  const history = await query<{ assigned_to: string; task_count: number }>(`
    SELECT assigned_to, COUNT(*) as task_count
    FROM tasks
    WHERE household_id = $1
      AND category_id = $2
      AND assigned_to = ANY($3)
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY assigned_to
    ORDER BY task_count ASC
  `, [householdId, categoryId, memberIds])

  // Find member with least assignments
  const assignedMemberIds = new Set(history.map((h) => h.assigned_to))

  // Prefer member who has never been assigned
  for (const member of members) {
    if (!assignedMemberIds.has(member.userId)) {
      return member.userId
    }
  }

  // Otherwise, return least assigned
  return history[0]?.assigned_to ?? members[0]?.userId ?? null
}

/**
 * Rotate assignment when loads are equal
 */
export function rotateIfEqual(
  lastAssigned: string | null,
  members: HouseholdMember[]
): string | null {
  if (members.length === 0) return null
  if (members.length === 1) return members[0]?.userId ?? null

  const lastIndex = members.findIndex((m) => m.userId === lastAssigned)
  if (lastIndex === -1) {
    return members[0]?.userId ?? null
  }

  const nextIndex = (lastIndex + 1) % members.length
  return members[nextIndex]?.userId ?? null
}

/**
 * Check if a member is excluded from assignments
 */
export async function checkExclusion(
  memberId: string,
  householdId: string
): Promise<{ isExcluded: boolean; exclusion: MemberExclusion | null }> {
  const now = new Date()

  const result = await queryOne<{
    id: string
    member_id: string
    exclude_from: string
    exclude_until: string
    reason: string
  }>(`
    SELECT id, member_id, exclude_from, exclude_until, reason
    FROM member_exclusions
    WHERE member_id = $1
      AND household_id = $2
      AND exclude_from <= $3
      AND exclude_until >= $3
    ORDER BY exclude_until DESC
    LIMIT 1
  `, [memberId, householdId, now.toISOString()])

  if (!result) {
    return { isExcluded: false, exclusion: null }
  }

  return {
    isExcluded: true,
    exclusion: {
      memberId: result.member_id,
      excludeFrom: new Date(result.exclude_from),
      excludeUntil: new Date(result.exclude_until),
      reason: result.reason,
    },
  }
}

/**
 * Filter out members who are currently excluded
 */
async function filterExcludedMembers(
  members: HouseholdMember[],
  householdId: string
): Promise<HouseholdMember[]> {
  const available: HouseholdMember[] = []

  for (const member of members) {
    const { isExcluded } = await checkExclusion(member.userId, householdId)
    if (!isExcluded) {
      available.push(member)
    }
  }

  return available
}

/**
 * Get the last assigned member for a household (for rotation)
 */
async function getLastAssignedMember(
  householdId: string
): Promise<string | null> {
  const result = await queryOne<{ assigned_to: string }>(`
    SELECT assigned_to
    FROM tasks
    WHERE household_id = $1
      AND assigned_to IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `, [householdId])

  return result?.assigned_to ?? null
}

/**
 * Create a temporary exclusion for a member
 */
export async function createExclusion(
  memberId: string,
  householdId: string,
  excludeFrom: Date,
  excludeUntil: Date,
  reason: string
): Promise<{ success: boolean; id: string | null; error?: string }> {
  if (excludeUntil <= excludeFrom) {
    return { success: false, id: null, error: "exclude_until must be after exclude_from" }
  }

  const existing = await queryOne<{ id: string }>(`
    SELECT id
    FROM member_exclusions
    WHERE member_id = $1
      AND household_id = $2
      AND NOT (exclude_until < $3 OR exclude_from > $4)
  `, [memberId, householdId, excludeFrom.toISOString(), excludeUntil.toISOString()])

  if (existing) {
    return { success: false, id: null, error: "Overlapping exclusion already exists" }
  }

  const result = await queryOne<{ id: string }>(`
    INSERT INTO member_exclusions (member_id, household_id, exclude_from, exclude_until, reason)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [memberId, householdId, excludeFrom.toISOString(), excludeUntil.toISOString(), reason])

  return { success: true, id: result?.id ?? null }
}

/**
 * Delete an exclusion
 */
export async function deleteExclusion(
  exclusionId: string,
  householdId: string
): Promise<{ success: boolean }> {
  await query(`
    DELETE FROM member_exclusions
    WHERE id = $1 AND household_id = $2
  `, [exclusionId, householdId])

  return { success: true }
}

/**
 * Get all active exclusions for a household
 */
export async function getActiveExclusions(
  householdId: string
): Promise<MemberExclusion[]> {
  const now = new Date()

  const results = await query<{
    member_id: string
    exclude_from: string
    exclude_until: string
    reason: string
  }>(`
    SELECT member_id, exclude_from, exclude_until, reason
    FROM member_exclusions
    WHERE household_id = $1
      AND exclude_until >= $2
    ORDER BY exclude_from ASC
  `, [householdId, now.toISOString()])

  return results.map((r) => ({
    memberId: r.member_id,
    excludeFrom: new Date(r.exclude_from),
    excludeUntil: new Date(r.exclude_until),
    reason: r.reason,
  }))
}

/**
 * Auto-assign all unassigned tasks in a household
 */
export async function autoAssignUnassignedTasks(
  householdId: string
): Promise<{ assignedCount: number; errors: string[] }> {
  const members = await query<{ user_id: string; email: string; role: string }>(`
    SELECT user_id, email, role
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  const householdMembers: HouseholdMember[] = members.map((m) => ({
    userId: m.user_id,
    email: m.email,
    role: m.role,
  }))

  const unassignedTasks = await query<{
    id: string
    child_id: string | null
    category_id: string | null
    load_weight: number
  }>(`
    SELECT id, child_id, category_id, load_weight
    FROM tasks
    WHERE household_id = $1
      AND assigned_to IS NULL
      AND status = 'pending'
  `, [householdId])

  let assignedCount = 0
  const errors: string[] = []

  for (const task of unassignedTasks) {
    const taskInfo: TaskInfo = {
      id: task.id,
      householdId,
      childId: task.child_id,
      categoryId: task.category_id,
      assignedTo: null,
      loadWeight: task.load_weight,
    }

    const result = await determineAssignment(taskInfo, householdMembers)

    if (result.assignedTo) {
      await query(`
        UPDATE tasks
        SET assigned_to = $1, updated_at = NOW()
        WHERE id = $2
      `, [result.assignedTo, task.id])
      assignedCount++
    } else if (result.reason === "excluded") {
      errors.push(`Task ${task.id}: All members are excluded`)
    }
  }

  return { assignedCount, errors }
}

// ============ PREFERENCE MANAGEMENT ============

/**
 * Get all category preferences for a member
 */
export async function getMemberPreferences(
  userId: string,
  householdId: string
): Promise<MemberPreferences> {
  const prefs = await query<{
    category_id: string
    preference_level: string
    reason: string | null
  }>(`
    SELECT category_id, preference_level, reason
    FROM member_category_preferences
    WHERE user_id = $1 AND household_id = $2
    ORDER BY created_at ASC
  `, [userId, householdId])

  return {
    userId,
    categoryPreferences: prefs.map((p) => ({
      userId,
      categoryId: p.category_id,
      preferenceLevel: p.preference_level as PreferenceLevel,
      reason: p.reason ?? undefined,
    })),
  }
}

/**
 * Set a category preference for a member
 */
export async function setCategoryPreference(
  userId: string,
  householdId: string,
  categoryId: string,
  preferenceLevel: PreferenceLevel,
  reason?: string
): Promise<{ success: boolean }> {
  // Upsert preference
  await query(`
    INSERT INTO member_category_preferences (user_id, household_id, category_id, preference_level, reason)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, household_id, category_id)
    DO UPDATE SET preference_level = $4, reason = $5, updated_at = NOW()
  `, [userId, householdId, categoryId, preferenceLevel, reason ?? null])

  return { success: true }
}

/**
 * Delete a category preference for a member (reset to neutral)
 */
export async function deleteCategoryPreference(
  userId: string,
  householdId: string,
  categoryId: string
): Promise<{ success: boolean }> {
  await query(`
    DELETE FROM member_category_preferences
    WHERE user_id = $1 AND household_id = $2 AND category_id = $3
  `, [userId, householdId, categoryId])

  return { success: true }
}

/**
 * Get household-wide preferences summary
 */
export async function getHouseholdPreferencesSummary(
  householdId: string
): Promise<{
  categoryId: string
  expertUsers: string[]
  preferUsers: string[]
  dislikeUsers: string[]
}[]> {
  const prefs = await query<{
    category_id: string
    preference_level: string
    user_id: string
  }>(`
    SELECT category_id, preference_level, user_id
    FROM member_category_preferences
    WHERE household_id = $1
    ORDER BY category_id, preference_level
  `, [householdId])

  // Group by category
  const byCategory = new Map<
    string,
    { expertUsers: string[]; preferUsers: string[]; dislikeUsers: string[] }
  >()

  for (const pref of prefs) {
    if (!byCategory.has(pref.category_id)) {
      byCategory.set(pref.category_id, {
        expertUsers: [],
        preferUsers: [],
        dislikeUsers: [],
      })
    }

    const entry = byCategory.get(pref.category_id)!
    switch (pref.preference_level) {
      case "expert":
        entry.expertUsers.push(pref.user_id)
        break
      case "prefer":
        entry.preferUsers.push(pref.user_id)
        break
      case "dislike":
        entry.dislikeUsers.push(pref.user_id)
        break
    }
  }

  return Array.from(byCategory.entries()).map(([categoryId, data]) => ({
    categoryId,
    ...data,
  }))
}

// ============ LOAD BALANCING ALERTS ============

/**
 * Check if household has load imbalance
 * Returns alert level and details for notification
 */
export async function checkLoadImbalance(
  householdId: string
): Promise<{
  hasImbalance: boolean
  alertLevel: "none" | "warning" | "critical"
  ratio: string
  suggestions: string[]
}> {
  const parentLoads = await getWeeklyLoadByParent(householdId)

  if (parentLoads.length < 2) {
    return { hasImbalance: false, alertLevel: "none", ratio: "N/A", suggestions: [] }
  }

  const totalLoad = parentLoads.reduce((sum, p) => sum + p.totalLoad, 0)
  if (totalLoad === 0) {
    return { hasImbalance: false, alertLevel: "none", ratio: "50/50", suggestions: [] }
  }

  // Sort by load to get highest and lowest
  const sorted = [...parentLoads].sort((a, b) => b.totalLoad - a.totalLoad)
  const highestLoad = sorted[0]!
  const lowestLoad = sorted[sorted.length - 1]!

  const highestPercent = Math.round((highestLoad.totalLoad / totalLoad) * 100)
  const lowestPercent = 100 - highestPercent
  const ratio = `${highestPercent}/${lowestPercent}`

  // Determine alert level
  let alertLevel: "none" | "warning" | "critical" = "none"
  if (highestPercent >= 70) {
    alertLevel = "critical"
  } else if (highestPercent >= 60) {
    alertLevel = "warning"
  }

  // Generate suggestions
  const suggestions: string[] = []
  if (alertLevel !== "none") {
    suggestions.push(
      `La répartition actuelle est de ${ratio}. Un équilibre de 50/50 est idéal.`
    )

    // Find categories where one person is overrepresented
    const categoryImbalance = await findCategoryImbalances(householdId)
    for (const cat of categoryImbalance.slice(0, 2)) {
      suggestions.push(
        `Catégorie "${cat.categoryName}": ${cat.highUser} fait ${cat.highPercent}% des tâches`
      )
    }

    suggestions.push(
      "Conseil: Définissez vos préférences de catégories pour une répartition plus équilibrée"
    )
  }

  return {
    hasImbalance: alertLevel !== "none",
    alertLevel,
    ratio,
    suggestions,
  }
}

/**
 * Find categories with significant imbalance
 */
async function findCategoryImbalances(
  householdId: string
): Promise<
  { categoryId: string; categoryName: string; highUser: string; highPercent: number }[]
> {
  const categoryStats = await query<{
    category_id: string
    category_name: string
    assigned_to: string
    user_email: string
    task_count: number
  }>(`
    SELECT
      t.category_id,
      tc.name_fr as category_name,
      t.assigned_to,
      u.email as user_email,
      COUNT(*) as task_count
    FROM tasks t
    JOIN task_categories tc ON tc.id = t.category_id
    JOIN users u ON u.id = t.assigned_to
    WHERE t.household_id = $1
      AND t.created_at >= NOW() - INTERVAL '7 days'
      AND t.assigned_to IS NOT NULL
      AND t.category_id IS NOT NULL
    GROUP BY t.category_id, tc.name_fr, t.assigned_to, u.email
    ORDER BY t.category_id, task_count DESC
  `, [householdId])

  // Group by category and find imbalances
  const byCategory = new Map<
    string,
    { categoryName: string; users: { userId: string; email: string; count: number }[] }
  >()

  for (const stat of categoryStats) {
    if (!byCategory.has(stat.category_id)) {
      byCategory.set(stat.category_id, { categoryName: stat.category_name, users: [] })
    }
    byCategory.get(stat.category_id)!.users.push({
      userId: stat.assigned_to,
      email: stat.user_email,
      count: stat.task_count,
    })
  }

  const imbalances: {
    categoryId: string
    categoryName: string
    highUser: string
    highPercent: number
  }[] = []

  for (const [categoryId, data] of byCategory) {
    const totalInCategory = data.users.reduce((sum, u) => sum + u.count, 0)
    if (totalInCategory >= 3 && data.users.length >= 2) {
      const highest = data.users[0]!
      const highPercent = Math.round((highest.count / totalInCategory) * 100)

      if (highPercent >= 65) {
        imbalances.push({
          categoryId,
          categoryName: data.categoryName,
          highUser: highest.email.split("@")[0] ?? highest.email,
          highPercent,
        })
      }
    }
  }

  return imbalances.sort((a, b) => b.highPercent - a.highPercent)
}

/**
 * Get rebalancing suggestions for a household
 */
export async function getRebalancingSuggestions(
  householdId: string
): Promise<{
  overloadedMember: string | null
  suggestedTransfers: {
    taskId: string
    taskTitle: string
    fromUser: string
    toUser: string
    reason: string
  }[]
}> {
  const imbalance = await checkLoadImbalance(householdId)
  if (!imbalance.hasImbalance) {
    return { overloadedMember: null, suggestedTransfers: [] }
  }

  const parentLoads = await getWeeklyLoadByParent(householdId)
  const sorted = [...parentLoads].sort((a, b) => b.totalLoad - a.totalLoad)

  if (sorted.length < 2) {
    return { overloadedMember: null, suggestedTransfers: [] }
  }

  const overloaded = sorted[0]!
  const underloaded = sorted[sorted.length - 1]!

  // Find pending tasks assigned to overloaded member that could be transferred
  const transferableTasks = await query<{
    id: string
    title: string
    category_id: string | null
    load_weight: number
  }>(`
    SELECT id, title, category_id, load_weight
    FROM tasks
    WHERE household_id = $1
      AND assigned_to = $2
      AND status = 'pending'
      AND deadline > NOW()
    ORDER BY load_weight DESC
    LIMIT 5
  `, [householdId, overloaded.userId])

  // Check which tasks the underloaded member could take
  const suggestedTransfers: {
    taskId: string
    taskTitle: string
    fromUser: string
    toUser: string
    reason: string
  }[] = []

  for (const task of transferableTasks) {
    // Check if underloaded member doesn't dislike this category
    if (task.category_id) {
      const dislikesPref = await queryOne<{ id: string }>(`
        SELECT id
        FROM member_category_preferences
        WHERE user_id = $1
          AND household_id = $2
          AND category_id = $3
          AND preference_level = 'dislike'
      `, [underloaded.userId, householdId, task.category_id])

      if (!dislikesPref) {
        suggestedTransfers.push({
          taskId: task.id,
          taskTitle: task.title,
          fromUser: overloaded.email,
          toUser: underloaded.email,
          reason: "Rééquilibrage de charge",
        })
      }
    } else {
      // No category - can be transferred
      suggestedTransfers.push({
        taskId: task.id,
        taskTitle: task.title,
        fromUser: overloaded.email,
        toUser: underloaded.email,
        reason: "Rééquilibrage de charge",
      })
    }

    // Limit to 3 suggestions
    if (suggestedTransfers.length >= 3) break
  }

  return {
    overloadedMember: overloaded.email,
    suggestedTransfers,
  }
}
