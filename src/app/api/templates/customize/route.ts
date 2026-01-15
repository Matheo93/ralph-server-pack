/**
 * Template Customization API
 *
 * Allows households to customize template preferences:
 * - Enable/disable specific templates
 * - Adjust reminder days before deadline
 * - Set custom weights for load calculation
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, update, remove, setCurrentUser } from "@/lib/aws/database"

// =============================================================================
// SCHEMAS
// =============================================================================

const CustomizeTemplateSchema = z.object({
  template_id: z.string().uuid(),
  is_enabled: z.boolean().optional(),
  custom_days_before: z.number().min(0).max(90).optional(),
  custom_weight: z.number().min(1).max(10).optional(),
})

const BatchCustomizeSchema = z.object({
  settings: z.array(CustomizeTemplateSchema).min(1).max(100),
})

// =============================================================================
// TYPES
// =============================================================================

interface HouseholdTemplateSetting {
  id: string
  household_id: string
  template_id: string
  is_enabled: boolean
  custom_days_before: number | null
  custom_weight: number | null
  created_at: string
  updated_at: string
}

interface HouseholdMembership {
  household_id: string
  role: string
}

// =============================================================================
// HELPERS
// =============================================================================

async function getHouseholdId(userId: string): Promise<string | null> {
  const membership = await queryOne<HouseholdMembership>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  return membership?.household_id ?? null
}

// =============================================================================
// GET - Get template settings for household
// =============================================================================

/**
 * GET /api/templates/customize
 *
 * Get all template customization settings for the user's household
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  try {
    const settings = await query<HouseholdTemplateSetting>(`
      SELECT
        hts.*,
        tt.title as template_title,
        tt.category as template_category,
        tt.days_before_deadline as default_days_before,
        tt.weight as default_weight
      FROM household_template_settings hts
      JOIN task_templates tt ON tt.id = hts.template_id
      WHERE hts.household_id = $1
      ORDER BY tt.category, tt.title
    `, [householdId])

    return NextResponse.json({
      household_id: householdId,
      settings,
      count: settings.length,
    })
  } catch {
    // Table might not exist yet
    return NextResponse.json({
      household_id: householdId,
      settings: [],
      count: 0,
    })
  }
}

// =============================================================================
// POST - Create or update template customization
// =============================================================================

/**
 * POST /api/templates/customize
 *
 * Create or update template customization settings
 *
 * Request body:
 * {
 *   "settings": [
 *     {
 *       "template_id": "uuid",
 *       "is_enabled": true,
 *       "custom_days_before": 14,
 *       "custom_weight": 5
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  // Parse and validate request body
  let body: z.infer<typeof BatchCustomizeSchema>
  try {
    const json = await request.json()
    body = BatchCustomizeSchema.parse(json)
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

  const results: Array<{
    template_id: string
    success: boolean
    error?: string
  }> = []

  for (const setting of body.settings) {
    try {
      // Check if setting already exists
      const existing = await queryOne<HouseholdTemplateSetting>(`
        SELECT id FROM household_template_settings
        WHERE household_id = $1 AND template_id = $2
      `, [householdId, setting.template_id])

      if (existing) {
        // Update existing setting
        const updates: string[] = []
        const params: unknown[] = []
        let paramIndex = 1

        if (setting.is_enabled !== undefined) {
          updates.push(`is_enabled = $${paramIndex++}`)
          params.push(setting.is_enabled)
        }
        if (setting.custom_days_before !== undefined) {
          updates.push(`custom_days_before = $${paramIndex++}`)
          params.push(setting.custom_days_before)
        }
        if (setting.custom_weight !== undefined) {
          updates.push(`custom_weight = $${paramIndex++}`)
          params.push(setting.custom_weight)
        }

        if (updates.length > 0) {
          updates.push(`updated_at = NOW()`)
          params.push(existing.id)

          await query(`
            UPDATE household_template_settings
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
          `, params)
        }

        results.push({ template_id: setting.template_id, success: true })
      } else {
        // Insert new setting
        await insert<HouseholdTemplateSetting>("household_template_settings", {
          household_id: householdId,
          template_id: setting.template_id,
          is_enabled: setting.is_enabled ?? true,
          custom_days_before: setting.custom_days_before ?? null,
          custom_weight: setting.custom_weight ?? null,
        })

        results.push({ template_id: setting.template_id, success: true })
      }
    } catch (error) {
      results.push({
        template_id: setting.template_id,
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length

  return NextResponse.json({
    success: errorCount === 0,
    results,
    summary: {
      total: results.length,
      success: successCount,
      errors: errorCount,
    },
  })
}

// =============================================================================
// DELETE - Remove template customization (reset to default)
// =============================================================================

/**
 * DELETE /api/templates/customize
 *
 * Remove template customization settings (reset to defaults)
 *
 * Query params:
 * - template_id: UUID of specific template to reset
 * - all: "true" to reset all customizations
 */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const templateId = searchParams.get("template_id")
  const resetAll = searchParams.get("all") === "true"

  if (!templateId && !resetAll) {
    return NextResponse.json(
      { error: "template_id ou all=true requis" },
      { status: 400 }
    )
  }

  try {
    if (resetAll) {
      await query(`
        DELETE FROM household_template_settings
        WHERE household_id = $1
      `, [householdId])

      return NextResponse.json({
        success: true,
        message: "Toutes les personnalisations ont été réinitialisées",
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (templateId && !uuidRegex.test(templateId)) {
      return NextResponse.json(
        { error: "template_id invalide" },
        { status: 400 }
      )
    }

    await query(`
      DELETE FROM household_template_settings
      WHERE household_id = $1 AND template_id = $2
    `, [householdId, templateId])

    return NextResponse.json({
      success: true,
      message: "Personnalisation réinitialisée",
      template_id: templateId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    )
  }
}
