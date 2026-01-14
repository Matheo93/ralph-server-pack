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
}

interface AssignmentResult {
  assignedTo: string | null
  reason: "least_loaded" | "rotation" | "only_member" | "already_assigned" | "excluded"
}

interface MemberExclusion {
  memberId: string
  excludeFrom: Date
  excludeUntil: Date
  reason: string
}

/**
 * Determine automatic assignment for a task based on load balancing rules
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
    // All excluded - return null with reason
    return { assignedTo: null, reason: "excluded" }
  }

  if (availableMembers.length === 1) {
    return { assignedTo: availableMembers[0]?.userId ?? null, reason: "only_member" }
  }

  // Get current loads for available members
  const parentLoads = await getWeeklyLoadByParent(task.householdId)
  const availableLoads = parentLoads.filter((p) =>
    availableMembers.some((m) => m.userId === p.userId)
  )

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
 * Rotate assignment when loads are equal
 * Returns the next member in rotation (different from lastAssigned)
 */
export function rotateIfEqual(
  lastAssigned: string | null,
  members: HouseholdMember[]
): string | null {
  if (members.length === 0) return null
  if (members.length === 1) return members[0]?.userId ?? null

  // If no last assigned or not found in members, return first
  const lastIndex = members.findIndex((m) => m.userId === lastAssigned)
  if (lastIndex === -1) {
    return members[0]?.userId ?? null
  }

  // Return next in list (circular)
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
  // Validate dates
  if (excludeUntil <= excludeFrom) {
    return { success: false, id: null, error: "exclude_until must be after exclude_from" }
  }

  // Check if overlapping exclusion exists
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
  // Get household members
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

  // Get unassigned tasks
  const unassignedTasks = await query<{
    id: string
    child_id: string | null
    category_id: string | null
  }>(`
    SELECT id, child_id, category_id
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
