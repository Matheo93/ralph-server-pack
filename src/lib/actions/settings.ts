"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, update, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================
// PROFILE
// ============================================================

const ProfileUpdateSchema = z.object({
  name: z.string().max(100).nullable(),
  language: z.enum(["fr", "en"]),
  timezone: z.string(),
})

export async function updateProfile(
  data: z.infer<typeof ProfileUpdateSchema>
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const validation = ProfileUpdateSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Données invalides" }
  }

  await setCurrentUser(userId)

  const result = await query(
    `UPDATE users
     SET name = $1, language = $2, timezone = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING id`,
    [validation.data.name, validation.data.language, validation.data.timezone, userId]
  )

  if (result.length === 0) {
    return { success: false, error: "Utilisateur introuvable" }
  }

  revalidatePath("/settings/profile")
  return { success: true }
}

// ============================================================
// HOUSEHOLD
// ============================================================

const HouseholdUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  country: z.enum(["FR", "BE", "CH", "CA", "LU"]),
  timezone: z.string(),
})

export async function updateHousehold(
  data: z.infer<typeof HouseholdUpdateSchema>
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const validation = HouseholdUpdateSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Données invalides" }
  }

  await setCurrentUser(userId)

  // Get user's household and verify admin role
  const membership = await queryOne<{ household_id: string; role: string }>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  if (membership.role !== "admin") {
    return { success: false, error: "Seul l'administrateur peut modifier le foyer" }
  }

  const result = await query(
    `UPDATE households
     SET name = $1, country = $2, timezone = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING id`,
    [validation.data.name, validation.data.country, validation.data.timezone, membership.household_id]
  )

  if (result.length === 0) {
    return { success: false, error: "Foyer introuvable" }
  }

  revalidatePath("/settings/household")
  return { success: true }
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

const NotificationPreferencesSchema = z.object({
  push_enabled: z.boolean(),
  email_enabled: z.boolean(),
  daily_reminder_time: z.string().nullable(),
  reminder_before_deadline_hours: z.number().int().min(1).max(168),
  weekly_summary_enabled: z.boolean(),
  balance_alert_enabled: z.boolean(),
})

export async function updateNotificationPreferences(
  data: z.infer<typeof NotificationPreferencesSchema>
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const validation = NotificationPreferencesSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Données invalides" }
  }

  await setCurrentUser(userId)

  // Upsert preferences
  const result = await query(
    `INSERT INTO user_preferences (
      user_id,
      push_enabled,
      email_enabled,
      daily_reminder_time,
      reminder_before_deadline_hours,
      weekly_summary_enabled,
      balance_alert_enabled,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      push_enabled = EXCLUDED.push_enabled,
      email_enabled = EXCLUDED.email_enabled,
      daily_reminder_time = EXCLUDED.daily_reminder_time,
      reminder_before_deadline_hours = EXCLUDED.reminder_before_deadline_hours,
      weekly_summary_enabled = EXCLUDED.weekly_summary_enabled,
      balance_alert_enabled = EXCLUDED.balance_alert_enabled,
      updated_at = NOW()
    RETURNING user_id`,
    [
      userId,
      validation.data.push_enabled,
      validation.data.email_enabled,
      validation.data.daily_reminder_time,
      validation.data.reminder_before_deadline_hours,
      validation.data.weekly_summary_enabled,
      validation.data.balance_alert_enabled,
    ]
  )

  if (result.length === 0) {
    return { success: false, error: "Erreur lors de la mise à jour" }
  }

  revalidatePath("/settings/notifications")
  return { success: true }
}

// ============================================================
// DELETE ACCOUNT (RGPD)
// ============================================================

const DeleteAccountSchema = z.object({
  confirmation: z.literal("SUPPRIMER"),
})

export async function deleteAccount(
  data: z.infer<typeof DeleteAccountSchema>
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const validation = DeleteAccountSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: "Veuillez taper SUPPRIMER pour confirmer" }
  }

  await setCurrentUser(userId)

  // Check if user is the only admin of their household
  const membership = await queryOne<{ household_id: string; role: string }>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (membership?.role === "admin") {
    const otherAdmins = await query<{ user_id: string }>(`
      SELECT user_id
      FROM household_members
      WHERE household_id = $1 AND role = 'admin' AND is_active = true AND user_id != $2
    `, [membership.household_id, userId])

    if (otherAdmins.length === 0) {
      // Check if there are other members
      const otherMembers = await query<{ user_id: string }>(`
        SELECT user_id
        FROM household_members
        WHERE household_id = $1 AND is_active = true AND user_id != $2
      `, [membership.household_id, userId])

      if (otherMembers.length > 0) {
        return {
          success: false,
          error: "Vous devez d'abord transférer les droits admin à un autre membre",
        }
      }
    }
  }

  // Delete in order (cascade should handle most, but be explicit)
  // 1. User preferences
  await query(`DELETE FROM user_preferences WHERE user_id = $1`, [userId])

  // 2. Deactivate household memberships
  await query(
    `UPDATE household_members SET is_active = false, updated_at = NOW() WHERE user_id = $1`,
    [userId]
  )

  // 3. Anonymize tasks assigned to user
  await query(
    `UPDATE tasks SET assigned_to = NULL, updated_at = NOW() WHERE assigned_to = $1`,
    [userId]
  )

  // 4. Mark user as deleted (soft delete for audit)
  await query(
    `UPDATE users
     SET email = CONCAT('deleted_', id, '@deleted.familyload.com'),
         name = 'Compte supprimé',
         deleted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  )

  // Note: Full deletion would require Cognito user deletion and sign out
  // This is a soft delete for RGPD compliance

  return { success: true }
}

// ============================================================
// TEMPLATE SETTINGS
// ============================================================

const TemplateToggleSchema = z.object({
  template_id: z.string().uuid(),
  is_enabled: z.boolean(),
})

export async function toggleTemplate(
  data: z.infer<typeof TemplateToggleSchema>
): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const validation = TemplateToggleSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Données invalides" }
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  // Upsert template setting
  await query(
    `INSERT INTO household_template_settings (
      household_id,
      template_id,
      is_enabled,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, NOW(), NOW())
    ON CONFLICT (household_id, template_id)
    DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      updated_at = NOW()`,
    [membership.household_id, validation.data.template_id, validation.data.is_enabled]
  )

  revalidatePath("/settings/templates")
  return { success: true }
}

// ============================================================
// GET ACTIVE TEMPLATES
// ============================================================

export async function getActiveTemplates(): Promise<{ id: string; title: string; is_enabled: boolean }[]> {
  const userId = await getUserId()
  if (!userId) return []

  await setCurrentUser(userId)

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return []

  const templates = await query<{ id: string; title: string; is_enabled: boolean }>(`
    SELECT
      tt.id,
      tt.title,
      COALESCE(hts.is_enabled, true) as is_enabled
    FROM task_templates tt
    LEFT JOIN household_template_settings hts
      ON hts.template_id = tt.id AND hts.household_id = $1
    WHERE tt.is_active = true
    ORDER BY tt.category, tt.title
  `, [membership.household_id])

  return templates
}

// ============================================================
// MEMBER EXCLUSIONS
// ============================================================

const ExclusionReasonEnum = z.enum(["voyage", "maladie", "surcharge_travail", "garde_alternee", "autre"])

export type ExclusionReason = z.infer<typeof ExclusionReasonEnum>

export const EXCLUSION_REASONS: Record<ExclusionReason, { label: string; icon: string }> = {
  voyage: { label: "Voyage / Vacances", icon: "✈️" },
  maladie: { label: "Maladie", icon: "🤒" },
  surcharge_travail: { label: "Surcharge de travail", icon: "💼" },
  garde_alternee: { label: "Garde alternée (absent)", icon: "🏠" },
  autre: { label: "Autre", icon: "📝" },
}

const CreateExclusionSchema = z.object({
  member_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: ExclusionReasonEnum,
})

export interface MemberExclusion {
  id: string
  member_id: string
  member_name: string | null
  member_email: string
  household_id: string
  exclude_from: string
  exclude_until: string
  reason: ExclusionReason
  is_active: boolean
  created_at: string
}

export async function createExclusion(
  data: z.infer<typeof CreateExclusionSchema>
): Promise<ActionResult<{ id: string }>> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  const validation = CreateExclusionSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Données invalides" }
  }

  // Validate dates
  const startDate = new Date(validation.data.start_date)
  const endDate = new Date(validation.data.end_date)

  if (endDate <= startDate) {
    return { success: false, error: "La date de fin doit être après la date de début" }
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  // Verify target member is in the same household
  const targetMember = await queryOne<{ user_id: string }>(`
    SELECT user_id
    FROM household_members
    WHERE user_id = $1 AND household_id = $2 AND is_active = true
  `, [validation.data.member_id, membership.household_id])

  if (!targetMember) {
    return { success: false, error: "Membre non trouvé dans votre foyer" }
  }

  // Check for overlapping exclusions
  const overlapping = await queryOne<{ id: string }>(`
    SELECT id FROM member_exclusions
    WHERE member_id = $1
    AND household_id = $2
    AND NOT (exclude_until <= $3 OR exclude_from >= $4)
  `, [validation.data.member_id, membership.household_id, startDate.toISOString(), endDate.toISOString()])

  if (overlapping) {
    return { success: false, error: "Une exclusion existe déjà pour cette période" }
  }

  // Create exclusion
  const result = await query<{ id: string }>(`
    INSERT INTO member_exclusions (member_id, household_id, exclude_from, exclude_until, reason)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [validation.data.member_id, membership.household_id, startDate.toISOString(), endDate.toISOString(), validation.data.reason])

  if (result.length === 0) {
    return { success: false, error: "Erreur lors de la création" }
  }

  revalidatePath("/settings/exclusions")
  return { success: true, data: { id: result[0]!.id } }
}

export async function getActiveExclusions(): Promise<MemberExclusion[]> {
  const userId = await getUserId()
  if (!userId) return []

  await setCurrentUser(userId)

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return []

  const exclusions = await query<{
    id: string
    member_id: string
    member_name: string | null
    member_email: string
    household_id: string
    exclude_from: string
    exclude_until: string
    reason: ExclusionReason
    created_at: string
  }>(`
    SELECT
      me.id,
      me.member_id,
      u.name as member_name,
      u.email as member_email,
      me.household_id,
      me.exclude_from::text,
      me.exclude_until::text,
      me.reason,
      me.created_at::text
    FROM member_exclusions me
    JOIN users u ON u.id = me.member_id
    WHERE me.household_id = $1
    AND me.exclude_until >= NOW()
    ORDER BY me.exclude_from ASC
  `, [membership.household_id])

  return exclusions.map(e => ({
    ...e,
    is_active: new Date(e.exclude_from) <= new Date() && new Date(e.exclude_until) >= new Date(),
  }))
}

export async function getAllExclusions(): Promise<MemberExclusion[]> {
  const userId = await getUserId()
  if (!userId) return []

  await setCurrentUser(userId)

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) return []

  const exclusions = await query<{
    id: string
    member_id: string
    member_name: string | null
    member_email: string
    household_id: string
    exclude_from: string
    exclude_until: string
    reason: ExclusionReason
    created_at: string
  }>(`
    SELECT
      me.id,
      me.member_id,
      u.name as member_name,
      u.email as member_email,
      me.household_id,
      me.exclude_from::text,
      me.exclude_until::text,
      me.reason,
      me.created_at::text
    FROM member_exclusions me
    JOIN users u ON u.id = me.member_id
    WHERE me.household_id = $1
    ORDER BY me.exclude_from DESC
    LIMIT 50
  `, [membership.household_id])

  return exclusions.map(e => ({
    ...e,
    is_active: new Date(e.exclude_from) <= new Date() && new Date(e.exclude_until) >= new Date(),
  }))
}

export async function deleteExclusion(exclusionId: string): Promise<ActionResult> {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, error: "Utilisateur non connecté" }
  }

  if (!z.string().uuid().safeParse(exclusionId).success) {
    return { success: false, error: "ID invalide" }
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return { success: false, error: "Vous n'avez pas de foyer" }
  }

  // Delete only if in same household
  const result = await query<{ id: string }>(`
    DELETE FROM member_exclusions
    WHERE id = $1 AND household_id = $2
    RETURNING id
  `, [exclusionId, membership.household_id])

  if (result.length === 0) {
    return { success: false, error: "Exclusion non trouvée" }
  }

  revalidatePath("/settings/exclusions")
  return { success: true }
}

export async function isUserExcluded(userId: string, householdId: string): Promise<boolean> {
  const exclusion = await queryOne<{ id: string }>(`
    SELECT id FROM member_exclusions
    WHERE member_id = $1
    AND household_id = $2
    AND exclude_from <= NOW()
    AND exclude_until >= NOW()
  `, [userId, householdId])

  return !!exclusion
}
