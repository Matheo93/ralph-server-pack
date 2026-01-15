import { z } from "zod"

export const householdSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom du foyer doit contenir au moins 2 caractères")
    .max(50, "Le nom du foyer ne peut pas dépasser 50 caractères"),
  country: z.string().length(2, "Code pays invalide"),
  timezone: z.string().min(1, "Fuseau horaire requis"),
})

export const invitationSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  role: z.enum(["co_parent", "tiers"]),
})

export type HouseholdInput = z.infer<typeof householdSchema>
export type InvitationInput = z.infer<typeof invitationSchema>
