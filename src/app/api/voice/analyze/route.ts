/**
 * Voice Semantic Analysis API
 *
 * POST: Analyze transcribed text to extract task information
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, query, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import {
  analyzeText,
  isAnalysisConfigured,
  getCategoryDisplayName,
  getUrgencyDisplayName,
} from "@/lib/voice/semantic-analysis"

const AnalyzeRequestSchema = z.object({
  text: z.string().min(3).max(1000),
  language: z.enum(["fr", "en"]).optional().default("fr"),
})

/**
 * POST /api/voice/analyze
 * Analyze text to extract task information
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Check if analysis is configured
  if (!isAnalysisConfigured()) {
    return NextResponse.json(
      { error: "Analyse non configurée" },
      { status: 503 }
    )
  }

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const validation = AnalyzeRequestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { text, language } = validation.data

  try {
    // Get user's household and children for context
    const membership = await queryOne<{ household_id: string }>(`
      SELECT household_id
      FROM household_members
      WHERE user_id = $1 AND is_active = true
    `, [userId])

    let childrenNames: string[] = []
    if (membership) {
      const children = await query<{ name: string }>(`
        SELECT name
        FROM children
        WHERE household_id = $1
      `, [membership.household_id])
      childrenNames = children.map((c) => c.name)
    }

    // Analyze text
    const result = await analyzeText(text, {
      childrenNames,
      language,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Erreur d'analyse" },
        { status: 500 }
      )
    }

    const { extraction } = result

    return NextResponse.json({
      success: true,
      extraction: {
        ...extraction,
        categoryDisplay: getCategoryDisplayName(extraction!.category, language),
        urgencyDisplay: getUrgencyDisplayName(extraction!.urgency, language),
      },
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'analyse" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/voice/analyze
 * Get analysis configuration info
 */
export async function GET() {
  return NextResponse.json({
    configured: isAnalysisConfigured(),
    categories: [
      { id: "ecole", name: "École" },
      { id: "sante", name: "Santé" },
      { id: "administratif", name: "Administratif" },
      { id: "quotidien", name: "Quotidien" },
      { id: "social", name: "Social" },
      { id: "activites", name: "Activités" },
      { id: "logistique", name: "Logistique" },
      { id: "autre", name: "Autre" },
    ],
    urgencyLevels: [
      { id: "haute", name: "Haute" },
      { id: "normale", name: "Normale" },
      { id: "basse", name: "Basse" },
    ],
  })
}
