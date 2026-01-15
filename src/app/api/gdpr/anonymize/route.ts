/**
 * GDPR Data Anonymization API
 *
 * Allows users to anonymize their personal data while preserving
 * statistical records for the household
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser, queryOne } from "@/lib/aws/database"
import { anonymizeUserData, getConsentStatus, updateConsent } from "@/lib/services/gdpr"

// =============================================================================
// SCHEMAS
// =============================================================================

const AnonymizeConfirmationSchema = z.object({
  confirmation: z.literal("ANONYMIZE_MY_DATA"),
  understand_effects: z.literal(true),
})

const ConsentUpdateSchema = z.object({
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
})

// =============================================================================
// GET - Get anonymization preview and consent status
// =============================================================================

/**
 * GET /api/gdpr/anonymize
 *
 * Returns preview of what data will be anonymized and current consent status
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get consent status
  const consent = await getConsentStatus()

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({
      success: true,
      has_household: false,
      consent,
      preview: {
        will_anonymize: {
          children: 0,
          vocal_commands: 0,
          task_descriptions: 0,
        },
      },
    })
  }

  // Count data that will be anonymized
  const childrenCount = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count FROM children WHERE household_id = $1
  `, [membership.household_id])

  const vocalCount = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count FROM vocal_commands WHERE household_id = $1
  `, [membership.household_id]).catch(() => ({ count: "0" }))

  const tasksCount = await queryOne<{ count: string }>(`
    SELECT COUNT(*)::text as count FROM tasks
    WHERE household_id = $1 AND description IS NOT NULL
  `, [membership.household_id])

  return NextResponse.json({
    success: true,
    has_household: true,
    consent,
    preview: {
      will_anonymize: {
        children: parseInt(childrenCount?.count ?? "0", 10),
        vocal_commands: parseInt(vocalCount?.count ?? "0", 10),
        task_descriptions: parseInt(tasksCount?.count ?? "0", 10),
      },
    },
    effects: {
      children: "Les prénoms seront remplacés par des identifiants génériques",
      vocal_commands: "Les transcriptions seront effacées, seules les métadonnées sont conservées",
      tasks: "Les descriptions détaillées seront supprimées, les titres sont conservés",
    },
    confirmation_required: "ANONYMIZE_MY_DATA",
  })
}

// =============================================================================
// POST - Perform anonymization
// =============================================================================

/**
 * POST /api/gdpr/anonymize
 *
 * Anonymize user data while preserving household statistics
 *
 * Body:
 * {
 *   "confirmation": "ANONYMIZE_MY_DATA",
 *   "understand_effects": true
 * }
 */
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse and validate request body
  let body: z.infer<typeof AnonymizeConfirmationSchema>
  try {
    const json = await request.json()
    body = AnonymizeConfirmationSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Confirmation invalide",
          details: error.issues,
          required: {
            confirmation: "ANONYMIZE_MY_DATA",
            understand_effects: true,
          },
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Format de requête invalide" },
      { status: 400 }
    )
  }

  // Double-check confirmation
  if (body.confirmation !== "ANONYMIZE_MY_DATA" || !body.understand_effects) {
    return NextResponse.json(
      { error: "Confirmation requise" },
      { status: 400 }
    )
  }

  // Perform anonymization
  const result = await anonymizeUserData()

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        anonymizedRecords: result.anonymizedRecords,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Vos données ont été anonymisées",
    anonymizedRecords: result.anonymizedRecords,
    anonymized_at: new Date().toISOString(),
  })
}

// =============================================================================
// PATCH - Update consent preferences
// =============================================================================

/**
 * PATCH /api/gdpr/anonymize
 *
 * Update user consent preferences for analytics/marketing
 *
 * Body:
 * {
 *   "analytics": boolean,
 *   "marketing": boolean
 * }
 */
export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse and validate request body
  let body: z.infer<typeof ConsentUpdateSchema>
  try {
    const json = await request.json()
    body = ConsentUpdateSchema.parse(json)
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

  // Update consent
  const result = await updateConsent(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    )
  }

  // Get updated consent status
  const consent = await getConsentStatus()

  return NextResponse.json({
    success: true,
    message: "Préférences mises à jour",
    consent,
  })
}
