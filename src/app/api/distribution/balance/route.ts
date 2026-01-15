/**
 * Distribution Balance API
 *
 * GET: Get rebalance suggestions
 * POST: Apply rebalance suggestions
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser, execute } from "@/lib/aws/database"
import { z } from "zod"
import {
  calculateDistribution,
  TaskLoad,
} from "@/lib/distribution/calculator"
import {
  suggestRebalance,
  getLeastLoadedParent,
} from "@/lib/distribution/assigner"

const RebalanceRequestSchema = z.object({
  taskIds: z.array(z.string().uuid()),
  targetUserId: z.string().uuid().optional(), // If not provided, auto-assign to least loaded
})

/**
 * GET /api/distribution/balance
 * Get rebalance suggestions
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const maxSuggestions = Math.min(parseInt(searchParams.get("max") ?? "5"), 20)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Foyer non trouvé" },
      { status: 404 }
    )
  }

  const householdId = membership.household_id

  // Get household members
  const members = await query<{
    user_id: string
    name: string
  }>(`
    SELECT hm.user_id, COALESCE(u.name, u.email) as name
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  const parents = members.map((m) => ({
    userId: m.user_id,
    userName: m.name ?? "Parent",
  }))

  // Get pending and recent tasks
  const tasksData = await query<{
    id: string
    title: string
    category: string
    weight: number
    completed_at: string | null
    assigned_to: string | null
  }>(`
    SELECT id, title, category, COALESCE(weight, 2) as weight, completed_at, assigned_to
    FROM tasks
    WHERE household_id = $1
      AND (completed_at IS NULL OR completed_at >= NOW() - INTERVAL '7 days')
  `, [householdId])

  const tasks: TaskLoad[] = tasksData.map((t) => ({
    taskId: t.id,
    title: t.title,
    category: t.category,
    weight: t.weight,
    completedAt: t.completed_at ? new Date(t.completed_at) : null,
    assignedTo: t.assigned_to,
  }))

  // Calculate distribution
  const distribution = calculateDistribution(tasks, parents)

  // Get suggestions
  const suggestions = suggestRebalance(tasks, distribution, maxSuggestions)

  return NextResponse.json({
    distribution,
    suggestions,
    canRebalance: suggestions.length > 0,
  })
}

/**
 * POST /api/distribution/balance
 * Apply rebalance by reassigning tasks
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

  const validation = RebalanceRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { taskIds, targetUserId } = validation.data

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Foyer non trouvé" },
      { status: 404 }
    )
  }

  const householdId = membership.household_id

  // Verify target user is in household (if specified)
  if (targetUserId) {
    const targetMember = await queryOne<{ user_id: string }>(`
      SELECT user_id
      FROM household_members
      WHERE household_id = $1 AND user_id = $2 AND is_active = true
    `, [householdId, targetUserId])

    if (!targetMember) {
      return NextResponse.json(
        { error: "Le parent cible n'est pas dans le foyer" },
        { status: 400 }
      )
    }
  }

  // Get current distribution for auto-assignment
  let assignTo = targetUserId

  if (!assignTo) {
    const members = await query<{
      user_id: string
      name: string
    }>(`
      SELECT hm.user_id, COALESCE(u.name, u.email) as name
      FROM household_members hm
      LEFT JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = $1 AND hm.is_active = true
    `, [householdId])

    const parents = members.map((m) => ({
      userId: m.user_id,
      userName: m.name ?? "Parent",
    }))

    const tasksData = await query<{
      id: string
      title: string
      category: string
      weight: number
      completed_at: string | null
      assigned_to: string | null
    }>(`
      SELECT id, title, category, COALESCE(weight, 2) as weight, completed_at, assigned_to
      FROM tasks
      WHERE household_id = $1
        AND (completed_at IS NULL OR completed_at >= NOW() - INTERVAL '7 days')
    `, [householdId])

    const tasks: TaskLoad[] = tasksData.map((t) => ({
      taskId: t.id,
      title: t.title,
      category: t.category,
      weight: t.weight,
      completedAt: t.completed_at ? new Date(t.completed_at) : null,
      assignedTo: t.assigned_to,
    }))

    const distribution = calculateDistribution(tasks, parents)
    const result = getLeastLoadedParent(distribution)

    if (!result) {
      return NextResponse.json(
        { error: "Aucun parent disponible pour l'assignation" },
        { status: 400 }
      )
    }

    assignTo = result.assignedTo
  }

  // Reassign tasks
  const updated: string[] = []
  const failed: string[] = []

  for (const taskId of taskIds) {
    try {
      const result = await execute(`
        UPDATE tasks
        SET assigned_to = $1, updated_at = NOW()
        WHERE id = $2 AND household_id = $3 AND completed_at IS NULL
      `, [assignTo, taskId, householdId])

      if (result.rowCount && result.rowCount > 0) {
        updated.push(taskId)
      } else {
        failed.push(taskId)
      }
    } catch {
      failed.push(taskId)
    }
  }

  return NextResponse.json({
    success: true,
    updated: updated.length,
    failed: failed.length,
    assignedTo: assignTo,
  })
}
