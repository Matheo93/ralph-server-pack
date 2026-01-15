/**
 * Distribution Stats API
 *
 * GET: Get task load distribution statistics for household
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import {
  calculateDistribution,
  calculateWeeklyStats,
  getWeeklyHistory,
  generateBalanceAlert,
  TaskLoad,
} from "@/lib/distribution/calculator"

const QuerySchema = z.object({
  weeks: z.coerce.number().min(1).max(12).default(4),
  includeHistory: z.coerce.boolean().default(true),
})

/**
 * GET /api/distribution/stats
 * Get distribution statistics for the household
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const validation = QuerySchema.safeParse({
    weeks: searchParams.get("weeks"),
    includeHistory: searchParams.get("includeHistory"),
  })

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Paramètres invalides" },
      { status: 400 }
    )
  }

  const { weeks, includeHistory } = validation.data

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

  // Get household members (parents)
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

  // Get tasks from last 30 days for stats
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
      AND created_at >= NOW() - INTERVAL '30 days'
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

  // Generate balance alert
  const alert = generateBalanceAlert(distribution)

  // Get current week stats
  const currentWeek = calculateWeeklyStats(tasks, parents)

  // Build response
  const response: {
    distribution: typeof distribution
    alert: typeof alert
    currentWeek: typeof currentWeek
    weeklyHistory?: ReturnType<typeof getWeeklyHistory>
  } = {
    distribution,
    alert,
    currentWeek,
  }

  // Include history if requested
  if (includeHistory) {
    response.weeklyHistory = getWeeklyHistory(tasks, parents, weeks)
  }

  return NextResponse.json(response)
}
