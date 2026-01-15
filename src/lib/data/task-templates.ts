/**
 * Task Templates - Catalogue Automatique
 *
 * The "Or Massif" (Gold Mine) - automatic task generation based on child age.
 * These templates generate tasks automatically for French families.
 */

import { z } from "zod"

// ============================================================================
// TYPES
// ============================================================================

export const TaskTemplateSchema = z.object({
  id: z.string(),
  category: z.enum([
    "ecole",
    "sante",
    "administratif",
    "quotidien",
    "social",
    "activites",
    "logistique",
  ]),
  title: z.string(),
  description: z.string().nullable(),
  // Age range in months
  ageMinMonths: z.number().min(0),
  ageMaxMonths: z.number().max(216), // 18 years
  // Timing
  triggerMonth: z.number().min(1).max(12).nullable(), // Specific month (1-12)
  triggerDaysBeforeAge: z.number().nullable(), // Days before child reaches age
  // Recurrence (null = one-time, otherwise cron-like pattern)
  recurrence: z.enum(["yearly", "monthly", "once"]).default("once"),
  // Weight for load calculation
  weight: z.number().min(1).max(10).default(3),
  // Priority
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  // Deadline offset in days
  deadlineOffsetDays: z.number().default(7),
  // Country (for localization)
  country: z.string().default("FR"),
})

export type TaskTemplate = z.infer<typeof TaskTemplateSchema>

// ============================================================================
// AGE BRACKETS (in months)
// ============================================================================

export const AGE_BRACKETS = {
  BABY: { min: 0, max: 36, label: "0-3 ans" },
  MATERNELLE: { min: 36, max: 72, label: "3-6 ans (maternelle)" },
  PRIMAIRE: { min: 72, max: 132, label: "6-11 ans (primaire)" },
  COLLEGE: { min: 132, max: 180, label: "11-15 ans (collège)" },
  LYCEE: { min: 180, max: 216, label: "15-18 ans (lycée)" },
} as const

// ============================================================================
// WEIGHT CONFIGURATION
// ============================================================================

export const TASK_WEIGHTS = {
  // Administrative tasks (high mental load)
  papier_administratif: 3,
  inscription: 4,
  dossier_complet: 5,

  // Health (medium-high)
  rendez_vous_medical: 5,
  vaccin: 4,
  pharmacie: 2,

  // School
  reunion_parents: 4,
  fournitures: 3,
  sortie_scolaire: 3,

  // Daily
  course_quotidienne: 1,
  repas: 1,
  vetements: 2,

  // Social
  anniversaire: 6,
  cadeau: 3,
  invitation: 2,

  // Activities
  inscription_activite: 4,
  transport_activite: 2,

  // Logistics
  transport: 2,
  vacances: 5,
  garde: 4,
} as const

// ============================================================================
// TEMPLATES BY AGE
// ============================================================================

// 0-3 ans (Bébé)
export const BABY_TEMPLATES: TaskTemplate[] = [
  // Santé - Vaccins obligatoires
  {
    id: "vaccine_2months",
    category: "sante",
    title: "Vaccin DTP-Coqueluche-Hib",
    description: "1ère injection vaccin hexavalent (2 mois)",
    ageMinMonths: 0,
    ageMaxMonths: 3,
    triggerMonth: null,
    triggerDaysBeforeAge: 14, // 2 weeks before 2 months
    recurrence: "once",
    weight: TASK_WEIGHTS.vaccin,
    priority: "critical",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "vaccine_4months",
    category: "sante",
    title: "Vaccin DTP-Coqueluche-Hib (2e dose)",
    description: "2ème injection vaccin hexavalent (4 mois)",
    ageMinMonths: 3,
    ageMaxMonths: 5,
    triggerMonth: null,
    triggerDaysBeforeAge: 14,
    recurrence: "once",
    weight: TASK_WEIGHTS.vaccin,
    priority: "critical",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "vaccine_11months",
    category: "sante",
    title: "Vaccin DTP-Coqueluche-Hib (rappel)",
    description: "3ème injection vaccin hexavalent (11 mois)",
    ageMinMonths: 10,
    ageMaxMonths: 13,
    triggerMonth: null,
    triggerDaysBeforeAge: 14,
    recurrence: "once",
    weight: TASK_WEIGHTS.vaccin,
    priority: "critical",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "vaccine_12months_ror",
    category: "sante",
    title: "Vaccin ROR (1ère dose)",
    description: "Rougeole-Oreillons-Rubéole (12 mois)",
    ageMinMonths: 11,
    ageMaxMonths: 14,
    triggerMonth: null,
    triggerDaysBeforeAge: 14,
    recurrence: "once",
    weight: TASK_WEIGHTS.vaccin,
    priority: "critical",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  // PMI visits
  {
    id: "pmi_monthly",
    category: "sante",
    title: "Visite PMI mensuelle",
    description: "Suivi de croissance et développement",
    ageMinMonths: 0,
    ageMaxMonths: 12,
    triggerMonth: null,
    triggerDaysBeforeAge: null,
    recurrence: "monthly",
    weight: TASK_WEIGHTS.rendez_vous_medical,
    priority: "normal",
    deadlineOffsetDays: 7,
    country: "FR",
  },
  // Mode de garde
  {
    id: "garde_inscription",
    category: "logistique",
    title: "Inscription mode de garde",
    description: "Rechercher et inscrire à la crèche/nounou",
    ageMinMonths: 0,
    ageMaxMonths: 6,
    triggerMonth: null,
    triggerDaysBeforeAge: 60, // 2 mois avant
    recurrence: "once",
    weight: TASK_WEIGHTS.garde,
    priority: "high",
    deadlineOffsetDays: 30,
    country: "FR",
  },
]

// 3-6 ans (Maternelle)
export const MATERNELLE_TEMPLATES: TaskTemplate[] = [
  {
    id: "ecole_inscription_maternelle",
    category: "ecole",
    title: "Inscription école maternelle",
    description: "Dossier d'inscription en mairie puis école",
    ageMinMonths: 30, // 2.5 ans
    ageMaxMonths: 36,
    triggerMonth: 3, // Mars
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: TASK_WEIGHTS.inscription,
    priority: "critical",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  {
    id: "assurance_scolaire",
    category: "administratif",
    title: "Assurance scolaire",
    description: "Souscrire ou renouveler l'assurance scolaire",
    ageMinMonths: 36,
    ageMaxMonths: 72,
    triggerMonth: 9, // Septembre
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.papier_administratif,
    priority: "high",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "reunion_rentree_maternelle",
    category: "ecole",
    title: "Réunion de rentrée",
    description: "Assister à la réunion d'information de rentrée",
    ageMinMonths: 36,
    ageMaxMonths: 72,
    triggerMonth: 9,
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.reunion_parents,
    priority: "normal",
    deadlineOffsetDays: 7,
    country: "FR",
  },
  {
    id: "photo_classe",
    category: "ecole",
    title: "Photo de classe",
    description: "Commander la photo de classe",
    ageMinMonths: 36,
    ageMaxMonths: 72,
    triggerMonth: 10, // Octobre
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: 2,
    priority: "low",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "vaccine_6ans",
    category: "sante",
    title: "Rappel vaccin DTP",
    description: "Rappel obligatoire avant l'entrée en CP",
    ageMinMonths: 66, // 5.5 ans
    ageMaxMonths: 78,
    triggerMonth: null,
    triggerDaysBeforeAge: 30,
    recurrence: "once",
    weight: TASK_WEIGHTS.vaccin,
    priority: "critical",
    deadlineOffsetDays: 30,
    country: "FR",
  },
]

// 6-11 ans (Primaire)
export const PRIMAIRE_TEMPLATES: TaskTemplate[] = [
  {
    id: "fournitures_primaire",
    category: "ecole",
    title: "Fournitures scolaires",
    description: "Acheter les fournitures selon la liste de l'école",
    ageMinMonths: 72,
    ageMaxMonths: 132,
    triggerMonth: 8, // Août
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.fournitures,
    priority: "high",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "inscription_cantine",
    category: "ecole",
    title: "Inscription cantine",
    description: "Inscrire ou renouveler l'inscription cantine",
    ageMinMonths: 72,
    ageMaxMonths: 132,
    triggerMonth: 6, // Juin
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.papier_administratif,
    priority: "normal",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  {
    id: "inscription_etudes",
    category: "ecole",
    title: "Inscription études/garderie",
    description: "Inscrire aux études surveillées ou garderie",
    ageMinMonths: 72,
    ageMaxMonths: 132,
    triggerMonth: 6,
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.inscription,
    priority: "normal",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  {
    id: "reunion_parents_profs",
    category: "ecole",
    title: "Réunion parents-professeurs",
    description: "Rendez-vous avec l'enseignant",
    ageMinMonths: 72,
    ageMaxMonths: 132,
    triggerMonth: 11, // Novembre
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.reunion_parents,
    priority: "normal",
    deadlineOffsetDays: 7,
    country: "FR",
  },
  {
    id: "classe_verte",
    category: "ecole",
    title: "Dossier classe verte/neige",
    description: "Remplir et rendre le dossier de voyage scolaire",
    ageMinMonths: 84, // CE1
    ageMaxMonths: 132,
    triggerMonth: 1, // Janvier
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.dossier_complet,
    priority: "high",
    deadlineOffsetDays: 21,
    country: "FR",
  },
]

// 11-15 ans (Collège)
export const COLLEGE_TEMPLATES: TaskTemplate[] = [
  {
    id: "inscription_college",
    category: "ecole",
    title: "Inscription collège",
    description: "Dossier d'inscription 6ème",
    ageMinMonths: 126, // 10.5 ans (CM2)
    ageMaxMonths: 138,
    triggerMonth: 5, // Mai
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: TASK_WEIGHTS.dossier_complet,
    priority: "critical",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  {
    id: "fournitures_college",
    category: "ecole",
    title: "Fournitures collège",
    description: "Acheter les fournitures selon les listes par matière",
    ageMinMonths: 132,
    ageMaxMonths: 180,
    triggerMonth: 8,
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.fournitures,
    priority: "high",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "orientation_3eme",
    category: "ecole",
    title: "Dossier d'orientation 3ème",
    description: "Vœux d'orientation et choix du lycée",
    ageMinMonths: 168, // 14 ans
    ageMaxMonths: 180,
    triggerMonth: 3, // Mars
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: TASK_WEIGHTS.dossier_complet,
    priority: "critical",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  {
    id: "brevet",
    category: "ecole",
    title: "Préparation Brevet",
    description: "S'assurer de la préparation au diplôme national du brevet",
    ageMinMonths: 168,
    ageMaxMonths: 180,
    triggerMonth: 5, // Mai
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: 4,
    priority: "high",
    deadlineOffsetDays: 45,
    country: "FR",
  },
  {
    id: "vaccine_11ans",
    category: "sante",
    title: "Rappel vaccin DTP-Coqueluche",
    description: "Rappel obligatoire à 11-13 ans",
    ageMinMonths: 132,
    ageMaxMonths: 156,
    triggerMonth: null,
    triggerDaysBeforeAge: 30,
    recurrence: "once",
    weight: TASK_WEIGHTS.vaccin,
    priority: "critical",
    deadlineOffsetDays: 30,
    country: "FR",
  },
]

// 15-18 ans (Lycée)
export const LYCEE_TEMPLATES: TaskTemplate[] = [
  {
    id: "inscription_lycee",
    category: "ecole",
    title: "Inscription lycée",
    description: "Finaliser l'inscription au lycée",
    ageMinMonths: 178, // 14.8 ans
    ageMaxMonths: 186,
    triggerMonth: 7, // Juillet
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: TASK_WEIGHTS.dossier_complet,
    priority: "critical",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "fournitures_lycee",
    category: "ecole",
    title: "Fournitures lycée",
    description: "Manuels et fournitures spécifiques",
    ageMinMonths: 180,
    ageMaxMonths: 216,
    triggerMonth: 8,
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.fournitures,
    priority: "high",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "parcoursup_inscription",
    category: "ecole",
    title: "Inscription Parcoursup",
    description: "Créer le dossier et saisir les vœux",
    ageMinMonths: 204, // 17 ans (Terminale)
    ageMaxMonths: 216,
    triggerMonth: 1, // Janvier
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: TASK_WEIGHTS.dossier_complet,
    priority: "critical",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  {
    id: "parcoursup_confirmation",
    category: "ecole",
    title: "Confirmation vœux Parcoursup",
    description: "Valider les vœux et dossiers",
    ageMinMonths: 204,
    ageMaxMonths: 216,
    triggerMonth: 4, // Avril
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: TASK_WEIGHTS.dossier_complet,
    priority: "critical",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  {
    id: "bac",
    category: "ecole",
    title: "Préparation Baccalauréat",
    description: "S'assurer de la préparation au bac",
    ageMinMonths: 204,
    ageMaxMonths: 216,
    triggerMonth: 5, // Mai
    triggerDaysBeforeAge: null,
    recurrence: "once",
    weight: 5,
    priority: "high",
    deadlineOffsetDays: 45,
    country: "FR",
  },
  {
    id: "permis_conduire",
    category: "administratif",
    title: "Inscription permis de conduire",
    description: "Inscrire à l'auto-école pour le permis B",
    ageMinMonths: 198, // 16.5 ans
    ageMaxMonths: 216,
    triggerMonth: null,
    triggerDaysBeforeAge: 30,
    recurrence: "once",
    weight: TASK_WEIGHTS.inscription,
    priority: "normal",
    deadlineOffsetDays: 60,
    country: "FR",
  },
]

// ============================================================================
// SEASONAL TEMPLATES (all ages)
// ============================================================================

export const SEASONAL_TEMPLATES: TaskTemplate[] = [
  // Rentrée (Septembre)
  {
    id: "rentree_preparation",
    category: "quotidien",
    title: "Préparation rentrée",
    description: "Vêtements, chaussures, cartable",
    ageMinMonths: 36,
    ageMaxMonths: 216,
    triggerMonth: 8, // Août
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.vetements,
    priority: "normal",
    deadlineOffsetDays: 14,
    country: "FR",
  },
  // Vacances scolaires
  {
    id: "vacances_toussaint",
    category: "logistique",
    title: "Organisation vacances Toussaint",
    description: "Planifier la garde ou les activités",
    ageMinMonths: 36,
    ageMaxMonths: 132,
    triggerMonth: 9, // Septembre
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.vacances,
    priority: "normal",
    deadlineOffsetDays: 21,
    country: "FR",
  },
  {
    id: "vacances_noel",
    category: "logistique",
    title: "Organisation vacances Noël",
    description: "Planifier les vacances de fin d'année",
    ageMinMonths: 0,
    ageMaxMonths: 216,
    triggerMonth: 11, // Novembre
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.vacances,
    priority: "normal",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  {
    id: "vacances_ete",
    category: "logistique",
    title: "Organisation vacances été",
    description: "Réserver hébergement, activités, centres aérés",
    ageMinMonths: 0,
    ageMaxMonths: 216,
    triggerMonth: 3, // Mars
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.vacances,
    priority: "high",
    deadlineOffsetDays: 60,
    country: "FR",
  },
  // Activités
  {
    id: "inscription_activites",
    category: "activites",
    title: "Inscription activités extra-scolaires",
    description: "Sport, musique, art... selon les goûts de l'enfant",
    ageMinMonths: 36,
    ageMaxMonths: 216,
    triggerMonth: 6, // Juin
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.inscription_activite,
    priority: "normal",
    deadlineOffsetDays: 30,
    country: "FR",
  },
  // Social
  {
    id: "liste_cadeaux_noel",
    category: "social",
    title: "Liste cadeaux de Noël",
    description: "Préparer la liste et acheter les cadeaux",
    ageMinMonths: 0,
    ageMaxMonths: 180,
    triggerMonth: 11, // Novembre
    triggerDaysBeforeAge: null,
    recurrence: "yearly",
    weight: TASK_WEIGHTS.cadeau,
    priority: "normal",
    deadlineOffsetDays: 30,
    country: "FR",
  },
]

// ============================================================================
// ALL TEMPLATES
// ============================================================================

export const ALL_TEMPLATES: TaskTemplate[] = [
  ...BABY_TEMPLATES,
  ...MATERNELLE_TEMPLATES,
  ...PRIMAIRE_TEMPLATES,
  ...COLLEGE_TEMPLATES,
  ...LYCEE_TEMPLATES,
  ...SEASONAL_TEMPLATES,
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get templates applicable for a specific age (in months)
 */
export function getTemplatesForAge(ageMonths: number): TaskTemplate[] {
  return ALL_TEMPLATES.filter(
    (t) => ageMonths >= t.ageMinMonths && ageMonths <= t.ageMaxMonths
  )
}

/**
 * Get templates for a specific month
 */
export function getTemplatesForMonth(month: number): TaskTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.triggerMonth === month)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: TaskTemplate["category"]
): TaskTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Calculate child age in months
 */
export function calculateAgeInMonths(birthDate: Date): number {
  const now = new Date()
  const months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth())
  return Math.max(0, months)
}

/**
 * Get age bracket for a child
 */
export function getAgeBracket(
  ageMonths: number
): (typeof AGE_BRACKETS)[keyof typeof AGE_BRACKETS] | null {
  if (ageMonths < AGE_BRACKETS.BABY.max) return AGE_BRACKETS.BABY
  if (ageMonths < AGE_BRACKETS.MATERNELLE.max) return AGE_BRACKETS.MATERNELLE
  if (ageMonths < AGE_BRACKETS.PRIMAIRE.max) return AGE_BRACKETS.PRIMAIRE
  if (ageMonths < AGE_BRACKETS.COLLEGE.max) return AGE_BRACKETS.COLLEGE
  if (ageMonths <= AGE_BRACKETS.LYCEE.max) return AGE_BRACKETS.LYCEE
  return null
}
