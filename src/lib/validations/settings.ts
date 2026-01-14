import { z } from "zod"

/**
 * Profile Update Schema
 */
export const ProfileUpdateSchema = z.object({
  name: z
    .string()
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .nullable(),
  language: z.enum(["fr", "en"], {
    errorMap: () => ({ message: "Langue invalide" }),
  }),
  timezone: z.string().min(1, "Fuseau horaire requis"),
})

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>

/**
 * Household Update Schema
 */
export const HouseholdUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom du foyer est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  country: z.enum(["FR", "BE", "CH", "CA", "LU"], {
    errorMap: () => ({ message: "Pays invalide" }),
  }),
  timezone: z.string().min(1, "Fuseau horaire requis"),
})

export type HouseholdUpdateInput = z.infer<typeof HouseholdUpdateSchema>

/**
 * Notification Preferences Schema
 */
export const NotificationPreferencesSchema = z.object({
  push_enabled: z.boolean(),
  email_enabled: z.boolean(),
  daily_reminder_time: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:MM)")
    .nullable(),
  reminder_before_deadline_hours: z
    .number()
    .int("Doit être un nombre entier")
    .min(1, "Minimum 1 heure avant")
    .max(168, "Maximum 1 semaine (168 heures) avant"),
  weekly_summary_enabled: z.boolean(),
  balance_alert_enabled: z.boolean(),
})

export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>

/**
 * Delete Account Schema (RGPD)
 */
export const DeleteAccountSchema = z.object({
  confirmation: z.literal("SUPPRIMER", {
    errorMap: () => ({
      message: "Veuillez taper SUPPRIMER pour confirmer la suppression",
    }),
  }),
})

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>

/**
 * Template Toggle Schema
 */
export const TemplateToggleSchema = z.object({
  template_id: z.string().uuid("ID de template invalide"),
  is_enabled: z.boolean(),
})

export type TemplateToggleInput = z.infer<typeof TemplateToggleSchema>

/**
 * Invite Member Schema
 */
export const InviteMemberSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  role: z.enum(["admin", "member"], {
    errorMap: () => ({ message: "Rôle invalide" }),
  }).default("member"),
})

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>

/**
 * Transfer Admin Schema
 */
export const TransferAdminSchema = z.object({
  new_admin_user_id: z.string().uuid("ID utilisateur invalide"),
  confirmation: z.literal("TRANSFERER", {
    errorMap: () => ({
      message: "Veuillez taper TRANSFERER pour confirmer le transfert",
    }),
  }),
})

export type TransferAdminInput = z.infer<typeof TransferAdminSchema>

/**
 * Validation helper
 */
export function validateSettings<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    error: result.error.issues[0]?.message ?? "Données invalides",
  }
}
