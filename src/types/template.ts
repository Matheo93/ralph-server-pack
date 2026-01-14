// =============================================
// TASK TEMPLATES TYPES - FamilyLoad
// Types pour le catalogue automatique de tâches
// =============================================

import type { TaskCategory, TaskPriority } from "./task"

// =============================================
// ENUMS
// =============================================

/**
 * Groupes d'âge pour les templates
 */
export const AgeGroup = {
  /** Nourrisson (0-3 ans) */
  INFANT: "0-3",
  /** Maternelle (3-6 ans) */
  PRESCHOOL: "3-6",
  /** Primaire (6-11 ans) */
  PRIMARY: "6-11",
  /** Collège (11-15 ans) */
  MIDDLE_SCHOOL: "11-15",
  /** Lycée (15-18 ans) */
  HIGH_SCHOOL: "15-18",
  /** Études supérieures (18-25 ans) */
  HIGHER_EDUCATION: "18-25",
} as const

export type AgeGroup = (typeof AgeGroup)[keyof typeof AgeGroup]

/**
 * Périodes de l'année pour les templates
 */
export const PeriodType = {
  /** Rentrée scolaire (août-septembre) */
  RENTREE: "rentree",
  /** Toussaint (octobre-novembre) */
  TOUSSAINT: "toussaint",
  /** Noël (décembre) */
  NOEL: "noel",
  /** Hiver (janvier-février) */
  HIVER: "hiver",
  /** Printemps (mars-avril) */
  PRINTEMPS: "printemps",
  /** Été (juin-juillet) */
  ETE: "ete",
  /** Toute l'année */
  YEAR_ROUND: "year_round",
} as const

export type PeriodType = (typeof PeriodType)[keyof typeof PeriodType]

/**
 * Statut d'une tâche générée
 */
export const GeneratedTaskStatus = {
  /** En attente de création */
  PENDING: "pending",
  /** Tâche créée */
  CREATED: "created",
  /** Ignorée par l'utilisateur */
  SKIPPED: "skipped",
  /** Expirée (deadline passée sans action) */
  EXPIRED: "expired",
} as const

export type GeneratedTaskStatus =
  (typeof GeneratedTaskStatus)[keyof typeof GeneratedTaskStatus]

// =============================================
// INTERFACES - Task Templates
// =============================================

/**
 * Template de tâche (catalogue)
 */
export interface TaskTemplate {
  id: string

  // Localisation
  country: string // ISO 2 (FR, BE, CH, etc.)

  // Critères d'application
  age_min: number
  age_max: number

  // Classification
  category: TaskCategory | string
  subcategory: string | null

  // Contenu
  title: string
  description: string | null

  // Récurrence (format cron ou pattern)
  cron_rule: string | null

  // Charge
  weight: number

  // Timing
  days_before_deadline: number

  // Période
  period: PeriodType | null

  // Statut
  is_active: boolean

  // Métadonnées
  created_at: string
  updated_at: string
}

/**
 * Template pour création (sans id et timestamps)
 */
export interface TaskTemplateCreate {
  country?: string
  age_min: number
  age_max: number
  category: TaskCategory | string
  subcategory?: string | null
  title: string
  description?: string | null
  cron_rule?: string | null
  weight?: number
  days_before_deadline?: number
  period?: PeriodType | null
  is_active?: boolean
}

/**
 * Template pour mise à jour (tous optionnels)
 */
export interface TaskTemplateUpdate {
  id: string
  country?: string
  age_min?: number
  age_max?: number
  category?: TaskCategory | string
  subcategory?: string | null
  title?: string
  description?: string | null
  cron_rule?: string | null
  weight?: number
  days_before_deadline?: number
  period?: PeriodType | null
  is_active?: boolean
}

/**
 * Filtres pour recherche de templates
 */
export interface TaskTemplateFilter {
  country?: string
  age?: number // Âge exact, filtre age_min <= age <= age_max
  age_group?: AgeGroup
  category?: TaskCategory | string
  period?: PeriodType
  is_active?: boolean
  search?: string // Recherche texte dans title/description
}

// =============================================
// INTERFACES - Generated Tasks
// =============================================

/**
 * Tâche générée depuis un template
 */
export interface GeneratedTask {
  id: string

  // Références
  template_id: string
  child_id: string
  household_id: string
  task_id: string | null // Référence vers la tâche créée

  // Métadonnées génération
  generated_at: string
  deadline: string // Date ISO

  // Statut
  status: GeneratedTaskStatus
  acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_by: string | null

  // Clé unique
  generation_key: string
}

/**
 * Generated task avec template et enfant inclus
 */
export interface GeneratedTaskWithRelations extends GeneratedTask {
  template: TaskTemplate
  child: {
    id: string
    first_name: string
    birthdate: string
  }
}

/**
 * Création d'une tâche générée
 */
export interface GeneratedTaskCreate {
  template_id: string
  child_id: string
  household_id: string
  deadline: string
  generation_key: string
}

// =============================================
// INTERFACES - Household Template Settings
// =============================================

/**
 * Paramètres de template par foyer
 */
export interface HouseholdTemplateSettings {
  id: string
  household_id: string
  template_id: string
  is_enabled: boolean
  custom_days_before: number | null
  custom_weight: number | null
  created_at: string
  updated_at: string
}

/**
 * Template avec settings du foyer
 */
export interface TemplateWithSettings extends TaskTemplate {
  settings: HouseholdTemplateSettings | null
  effectiveDaysBefore: number // Valeur effective (custom ou default)
  effectiveWeight: number // Valeur effective (custom ou default)
  isEnabledForHousehold: boolean
}

// =============================================
// INTERFACES - Preview & Scheduling
// =============================================

/**
 * Preview d'une tâche à venir
 */
export interface UpcomingTaskPreview {
  template: TaskTemplate
  child: {
    id: string
    first_name: string
    age: number
  }
  deadline: string
  daysUntil: number
  status: "upcoming" | "due_soon" | "overdue"
  canSkip: boolean
}

/**
 * Résultat de génération de tâches
 */
export interface TaskGenerationResult {
  generated: number
  skipped: number
  errors: number
  details: {
    templateId: string
    childId: string
    success: boolean
    error?: string
  }[]
}

/**
 * Calendrier de tâches futures
 */
export interface TaskCalendarEntry {
  date: string
  tasks: {
    templateId: string
    templateTitle: string
    childId: string
    childName: string
    category: string
    weight: number
    isAutomatic: boolean
  }[]
}

/**
 * Preview du calendrier
 */
export interface CalendarPreview {
  startDate: string
  endDate: string
  entries: TaskCalendarEntry[]
  totalTasks: number
  totalWeight: number
}

// =============================================
// CRON HELPERS
// =============================================

/**
 * Règle cron parsée
 */
export interface CronComponents {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
}

/**
 * Patterns cron prédéfinis
 */
export const CronPatterns = {
  /** Chaque année */
  YEARLY: "@yearly",
  /** Chaque mois */
  MONTHLY: "@monthly",
  /** Chaque semaine */
  WEEKLY: "@weekly",
  /** Chaque jour */
  DAILY: "@daily",
  /** 1er septembre (rentrée) */
  SEPTEMBER_1: "0 0 1 9 *",
  /** 15 décembre (Noël) */
  DECEMBER_15: "0 0 15 12 *",
  /** 1er juin (fin d'année) */
  JUNE_1: "0 0 1 6 *",
  /** 1er janvier */
  JANUARY_1: "0 0 1 1 *",
} as const

export type CronPattern = (typeof CronPatterns)[keyof typeof CronPatterns]

// =============================================
// CATEGORY SPECIFIC TEMPLATES
// =============================================

/**
 * Catégories de templates avec sous-catégories
 */
export const TemplateCategories = {
  SCHOOL: {
    code: "school",
    subcategories: [
      "inscription",
      "fournitures",
      "reunion",
      "sortie",
      "cantine",
      "garderie",
      "orientation",
    ],
  },
  HEALTH: {
    code: "health",
    subcategories: [
      "vaccin",
      "medecin",
      "dentiste",
      "specialiste",
      "ordonnance",
      "bilan",
    ],
  },
  ADMIN: {
    code: "admin",
    subcategories: [
      "papiers",
      "assurance",
      "caf",
      "impots",
      "carte_identite",
      "passeport",
    ],
  },
  DAILY: {
    code: "daily",
    subcategories: ["repas", "vetements", "courses", "hygiene"],
  },
  SOCIAL: {
    code: "social",
    subcategories: ["anniversaire", "cadeau", "invitation", "fete"],
  },
  ACTIVITIES: {
    code: "activities",
    subcategories: ["sport", "musique", "art", "inscription", "equipement"],
  },
  LOGISTICS: {
    code: "logistics",
    subcategories: ["transport", "garde", "vacances", "demenagement"],
  },
} as const

export type TemplateSubcategory =
  (typeof TemplateCategories)[keyof typeof TemplateCategories]["subcategories"][number]
