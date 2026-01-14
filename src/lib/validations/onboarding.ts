import { z } from "zod"

// Step 1: Household
export const onboardingStep1Schema = z.object({
  name: z
    .string()
    .min(2, "Le nom du foyer doit contenir au moins 2 caractères")
    .max(50, "Le nom du foyer ne peut pas dépasser 50 caractères"),
  country: z.enum(["FR", "BE", "CH", "CA", "LU"], {
    required_error: "Veuillez sélectionner un pays",
  }),
  timezone: z.string().min(1, "Fuseau horaire requis"),
})

// Step 2: Children (array of children)
export const onboardingChildSchema = z.object({
  first_name: z
    .string()
    .min(1, "Le prénom est requis")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères"),
  birthdate: z
    .string()
    .refine((date) => {
      if (!date) return false
      const parsed = new Date(date)
      return !isNaN(parsed.getTime()) && parsed < new Date()
    }, "La date de naissance doit être dans le passé"),
  tags: z.array(z.string()).default([]),
})

export const onboardingStep2Schema = z.object({
  children: z.array(onboardingChildSchema).default([]),
})

// Step 3: Co-parent invitation
export const onboardingStep3Schema = z.object({
  email: z.string().email("Format d'email invalide").or(z.literal("")),
  skip: z.boolean().default(false),
})

// Step 4: Preferences
export const onboardingStep4Schema = z.object({
  daily_reminder_time: z.string().nullable(),
  email_enabled: z.boolean().default(true),
  push_enabled: z.boolean().default(false),
  weekly_summary_enabled: z.boolean().default(true),
})

// Combined schema for the whole wizard
export const onboardingWizardSchema = z.object({
  step1: onboardingStep1Schema,
  step2: onboardingStep2Schema,
  step3: onboardingStep3Schema,
  step4: onboardingStep4Schema,
})

export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>
export type OnboardingChildInput = z.infer<typeof onboardingChildSchema>
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>
export type OnboardingStep3Input = z.infer<typeof onboardingStep3Schema>
export type OnboardingStep4Input = z.infer<typeof onboardingStep4Schema>
export type OnboardingWizardInput = z.infer<typeof onboardingWizardSchema>

// Country timezones mapping
export const countryTimezones: Record<string, { value: string; label: string }[]> = {
  FR: [{ value: "Europe/Paris", label: "Paris (UTC+1)" }],
  BE: [{ value: "Europe/Brussels", label: "Bruxelles (UTC+1)" }],
  CH: [{ value: "Europe/Zurich", label: "Zurich (UTC+1)" }],
  CA: [
    { value: "America/Montreal", label: "Montréal (UTC-5)" },
    { value: "America/Toronto", label: "Toronto (UTC-5)" },
    { value: "America/Vancouver", label: "Vancouver (UTC-8)" },
  ],
  LU: [{ value: "Europe/Luxembourg", label: "Luxembourg (UTC+1)" }],
}

// Country labels
export const countryLabels: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  CA: "Canada",
  LU: "Luxembourg",
}

// Common child tags
export const commonChildTags = [
  "allergie alimentaire",
  "asthme",
  "porteur de lunettes",
  "garde alternée",
  "activité sportive",
  "activité musicale",
]
