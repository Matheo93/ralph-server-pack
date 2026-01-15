/**
 * Catalogue Suggestions API
 *
 * GET /api/catalogue/suggestions - Get personalized task suggestions for household
 * POST /api/catalogue/suggestions - Create tasks from suggestions
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import {
  getCatalogueSuggestions,
  generateAutomaticTasks,
  createTasksFromCatalogue,
} from "@/lib/services/task-catalogue"

const CreateTasksSchema = z.object({
  suggestionIds: z.array(z.string()).min(1).max(20),
})

/**
 * GET /api/catalogue/suggestions
 * Get personalized task suggestions for the user's household
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'appartenez à aucun foyer" },
      { status: 400 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") ?? "10", 10)

  const suggestions = await getCatalogueSuggestions(membership.household_id)

  return NextResponse.json({
    success: true,
    suggestions: suggestions.slice(0, limit).map((s) => ({
      id: s.catalogueTask.id,
      title: s.catalogueTask.title_fr,
      description: s.catalogueTask.description_fr,
      category: s.catalogueTask.category_code,
      childId: s.childId,
      childName: s.childName,
      suggestedDeadline: s.suggestedDeadline.toISOString(),
      relevanceScore: s.relevanceScore,
      reason: s.reason,
      chargeWeight: s.catalogueTask.charge_weight,
    })),
    total: suggestions.length,
  })
}

/**
 * POST /api/catalogue/suggestions
 * Create tasks from selected suggestions
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'appartenez à aucun foyer" },
      { status: 400 }
    )
  }

  // Parse request body
  let body: z.infer<typeof CreateTasksSchema>
  try {
    const json = await request.json()
    body = CreateTasksSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Format de requête invalide" },
      { status: 400 }
    )
  }

  // Get all suggestions
  const suggestions = await getCatalogueSuggestions(membership.household_id)

  // Filter to selected suggestions
  const selectedSuggestions = suggestions.filter(
    (s) => body.suggestionIds.includes(s.catalogueTask.id)
  )

  if (selectedSuggestions.length === 0) {
    return NextResponse.json(
      { error: "Aucune suggestion valide sélectionnée" },
      { status: 400 }
    )
  }

  // Generate tasks from selected suggestions
  const tasksToCreate = selectedSuggestions.map((s) => ({
    title: s.catalogueTask.title_fr,
    description: s.catalogueTask.description_fr,
    childId: s.childId,
    categoryCode: s.catalogueTask.category_code,
    deadline: s.suggestedDeadline,
    chargeWeight: s.catalogueTask.charge_weight,
    source: "catalogue" as const,
    catalogueTaskId: s.catalogueTask.id,
  }))

  // Create tasks
  const result = await createTasksFromCatalogue(
    membership.household_id,
    userId,
    tasksToCreate
  )

  return NextResponse.json({
    success: true,
    created: result.created,
    skipped: result.skipped,
    message: `${result.created} tâche(s) créée(s)`,
  })
}
