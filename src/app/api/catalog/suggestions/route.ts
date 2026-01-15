/**
 * Task Suggestions API
 *
 * GET: Get quick suggestions based on current context
 * POST: Create tasks from suggestions
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import {
  generateSuggestions,
  getPeriodSpecificSuggestions,
  createChildInfo,
  suggestionToTask,
} from "@/lib/catalog/generator"
import { ChildInfo } from "@/lib/catalog/types"

const CreateTasksSchema = z.object({
  templateIds: z.array(z.string().uuid()).min(1).max(20),
  childId: z.string().uuid().optional(),
})

/**
 * GET /api/catalog/suggestions
 * Get quick suggestions for the household
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 20)
  const periodOnly = searchParams.get("periodOnly") === "true"

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

  // Get children
  const childrenData = await query<{
    id: string
    name: string
    birth_date: string
  }>(`
    SELECT id, name, birth_date
    FROM children
    WHERE household_id = $1
    ORDER BY birth_date ASC
  `, [householdId])

  const children: ChildInfo[] = childrenData.map((c) =>
    createChildInfo(c.id, c.name, new Date(c.birth_date))
  )

  if (children.length === 0) {
    return NextResponse.json({
      suggestions: [],
      message: "Ajoutez des enfants pour recevoir des suggestions",
    })
  }

  // Generate suggestions
  let suggestions
  if (periodOnly) {
    suggestions = getPeriodSpecificSuggestions(children)
  } else {
    suggestions = generateSuggestions(children, { maxSuggestions: limit })
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, limit),
    count: suggestions.length,
  })
}

/**
 * POST /api/catalog/suggestions
 * Create tasks from selected suggestions
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

  const validation = CreateTasksSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { templateIds, childId } = validation.data

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

  // Get children for suggestion generation
  const childrenData = await query<{
    id: string
    name: string
    birth_date: string
  }>(`
    SELECT id, name, birth_date
    FROM children
    WHERE household_id = $1
    ORDER BY birth_date ASC
  `, [householdId])

  const children: ChildInfo[] = childrenData.map((c) =>
    createChildInfo(c.id, c.name, new Date(c.birth_date))
  )

  // Generate all suggestions to find matching templates
  const allSuggestions = generateSuggestions(children, { maxSuggestions: 100 })
  const selectedSuggestions = allSuggestions.filter((s) =>
    templateIds.includes(s.template.id)
  )

  if (selectedSuggestions.length === 0) {
    return NextResponse.json(
      { error: "Aucun template valide trouvé" },
      { status: 400 }
    )
  }

  // Create tasks from suggestions
  const createdTasks: Array<{
    id: string
    title: string
    category: string
    childId: string | null
  }> = []

  for (const suggestion of selectedSuggestions) {
    const task = suggestionToTask(suggestion)

    try {
      const created = await insert<{ id: string }>("tasks", {
        household_id: householdId,
        title: task.title,
        description: task.description ?? null,
        category: task.category,
        priority: task.priority,
        due_date: task.suggestedDueDate?.toISOString() ?? null,
        child_id: childId ?? task.childId ?? null,
        source: "catalog",
        status: "pending",
        template_id: task.templateId,
        weight: task.weight,
        created_by: userId,
        created_at: new Date().toISOString(),
      })

      if (created) {
        createdTasks.push({
          id: created.id,
          title: task.title,
          category: task.category,
          childId: childId ?? task.childId ?? null,
        })
      }
    } catch (error) {
      console.error("Error creating task from template:", error)
      // Continue with other tasks
    }
  }

  return NextResponse.json({
    success: true,
    created: createdTasks.length,
    tasks: createdTasks,
  })
}
