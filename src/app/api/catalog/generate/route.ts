/**
 * Task Generation API
 *
 * POST: Generate task suggestions based on household children
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, setCurrentUser, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  generateSuggestions,
  generateCriticalTasks,
  createChildInfo,
} from "@/lib/catalog/generator"
import { TASK_CATEGORIES, ChildInfo } from "@/lib/catalog/types"

const GenerateRequestSchema = z.object({
  maxSuggestions: z.number().min(1).max(50).optional().default(20),
  includeGeneral: z.boolean().optional().default(true),
  categories: z.array(z.enum(TASK_CATEGORIES)).optional(),
  criticalOnly: z.boolean().optional().default(false),
})

/**
 * POST /api/catalog/generate
 * Generate task suggestions for household
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

  const validation = GenerateRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { maxSuggestions, includeGeneral, categories, criticalOnly } = validation.data

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

  // Get children from household
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

  // Convert to ChildInfo
  const children: ChildInfo[] = childrenData.map((c) =>
    createChildInfo(c.id, c.name, new Date(c.birth_date))
  )

  if (children.length === 0) {
    return NextResponse.json({
      suggestions: [],
      message: "Aucun enfant dans le foyer. Ajoutez des enfants pour recevoir des suggestions personnalisées.",
    })
  }

  // Generate suggestions
  let suggestions
  if (criticalOnly) {
    suggestions = generateCriticalTasks(children)
  } else {
    suggestions = generateSuggestions(children, {
      maxSuggestions,
      includeGeneral,
      categories,
    })
  }

  return NextResponse.json({
    suggestions,
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      ageInYears: c.ageInYears,
      ageRange: c.ageRange,
    })),
    count: suggestions.length,
  })
}
