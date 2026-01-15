/**
 * Period Rules - Sprint 21 Phase 2
 *
 * Seasonal task generation based on calendar periods:
 * - September: rentrée, assurance scolaire
 * - October: réunions parents-profs, Toussaint
 * - December: cadeaux, vacances
 * - January: inscriptions activités
 * - June: fin d'année, spectacles
 *
 * Functional, immutable pattern with Zod validation.
 */

import { z } from "zod";
import {
  type TaskTemplate,
  type CountryCode,
  type AgeRange,
  AGE_IN_MONTHS,
  buildEducationTemplate,
  buildAdministrativeTemplate,
  generateTemplateId
} from "./task-templates";

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Period types
 */
export const PeriodTypeSchema = z.enum([
  'rentree',           // Back to school
  'toussaint',         // Fall break
  'christmas',         // Christmas/Winter holidays
  'february',          // Winter break
  'spring',            // Spring break
  'end_of_year',       // End of school year
  'summer',            // Summer holidays
  'monthly',           // Monthly recurring
  'quarterly',         // Quarterly
  'annual'             // Annual/arbitrary date
]);
export type PeriodType = z.infer<typeof PeriodTypeSchema>;

/**
 * Localized string type
 */
export type LocalizedStrings = Record<string, string>;

/**
 * Period rule definition
 */
export type PeriodRule = {
  id: string;
  name: LocalizedStrings;
  description: LocalizedStrings;
  periodType: PeriodType;
  month: number;
  dayOfMonth?: number;
  weekOfMonth?: number;
  dayOfWeek?: number;
  leadDays: number;
  ageRange?: {
    minMonths: number;
    maxMonths: number;
  };
  countries: string[];
  category: 'health' | 'education' | 'administrative' | 'social' | 'finance' | 'transport' | 'seasonal';
  priority: 'critical' | 'high' | 'medium' | 'low';
  recurrence: 'yearly' | 'semester' | 'quarterly' | 'monthly' | 'once';
  tags: string[];
  enabled: boolean;
};

/**
 * Period rule store
 */
export type PeriodRuleStore = {
  rules: Map<string, PeriodRule>;
  byMonth: Map<number, string[]>;
  byType: Map<PeriodType, string[]>;
  lastUpdated: Date;
};

// =============================================================================
// FRENCH SCHOOL YEAR PERIODS
// =============================================================================

/**
 * French school zones for vacation dates
 */
export const FRENCH_SCHOOL_ZONES = {
  A: ['Besançon', 'Bordeaux', 'Clermont-Ferrand', 'Dijon', 'Grenoble', 'Limoges', 'Lyon', 'Poitiers'],
  B: ['Aix-Marseille', 'Amiens', 'Caen', 'Lille', 'Nancy-Metz', 'Nantes', 'Nice', 'Orléans-Tours', 'Reims', 'Rennes', 'Rouen', 'Strasbourg'],
  C: ['Créteil', 'Montpellier', 'Paris', 'Toulouse', 'Versailles']
} as const;

/**
 * Approximate vacation dates 2024-2025 (dates vary by year)
 */
export const FRENCH_VACATIONS_2024_2025 = {
  toussaint: {
    start: new Date(2024, 9, 19),  // October 19
    end: new Date(2024, 10, 4)     // November 4
  },
  christmas: {
    start: new Date(2024, 11, 21), // December 21
    end: new Date(2025, 0, 6)      // January 6
  },
  february: {
    zoneA: { start: new Date(2025, 1, 8), end: new Date(2025, 1, 24) },
    zoneB: { start: new Date(2025, 1, 22), end: new Date(2025, 2, 10) },
    zoneC: { start: new Date(2025, 1, 15), end: new Date(2025, 2, 3) }
  },
  spring: {
    zoneA: { start: new Date(2025, 3, 5), end: new Date(2025, 3, 22) },
    zoneB: { start: new Date(2025, 3, 19), end: new Date(2025, 4, 5) },
    zoneC: { start: new Date(2025, 3, 12), end: new Date(2025, 3, 28) }
  },
  summer: {
    start: new Date(2025, 6, 5),   // July 5
    end: new Date(2025, 8, 1)      // September 1
  }
} as const;

// =============================================================================
// RENTREE PERIOD RULES (September)
// =============================================================================

export const RENTREE_RULES: readonly PeriodRule[] = [
  {
    id: 'rentree_fournitures',
    name: {
      fr: 'Achat fournitures scolaires',
      en: 'School supplies shopping'
    },
    description: {
      fr: 'Acheter les fournitures scolaires selon la liste de l\'école',
      en: 'Buy school supplies according to school list'
    },
    periodType: 'rentree',
    month: 8, // August
    leadDays: 21,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR', 'BE', 'CH', 'CA'],
    category: 'education',
    priority: 'high',
    recurrence: 'yearly',
    tags: ['rentree', 'fournitures', 'ecole'],
    enabled: true
  },
  {
    id: 'rentree_assurance_scolaire',
    name: {
      fr: 'Assurance scolaire',
      en: 'School insurance'
    },
    description: {
      fr: 'Souscrire ou renouveler l\'assurance scolaire pour l\'année',
      en: 'Subscribe or renew school insurance for the year'
    },
    periodType: 'rentree',
    month: 9,
    leadDays: 7,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'administrative',
    priority: 'critical',
    recurrence: 'yearly',
    tags: ['rentree', 'assurance', 'administratif'],
    enabled: true
  },
  {
    id: 'rentree_certificat_medical',
    name: {
      fr: 'Certificat médical sport',
      en: 'Sports medical certificate'
    },
    description: {
      fr: 'Obtenir un certificat médical pour les activités sportives',
      en: 'Get a medical certificate for sports activities'
    },
    periodType: 'rentree',
    month: 9,
    leadDays: 14,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'health',
    priority: 'high',
    recurrence: 'yearly',
    tags: ['rentree', 'sport', 'medical'],
    enabled: true
  },
  {
    id: 'rentree_inscription_cantine',
    name: {
      fr: 'Inscription cantine',
      en: 'Canteen registration'
    },
    description: {
      fr: 'Inscrire l\'enfant à la cantine scolaire',
      en: 'Register child for school canteen'
    },
    periodType: 'rentree',
    month: 9,
    leadDays: 14,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'administrative',
    priority: 'high',
    recurrence: 'yearly',
    tags: ['rentree', 'cantine', 'inscription'],
    enabled: true
  },
  {
    id: 'rentree_inscription_periscolaire',
    name: {
      fr: 'Inscription périscolaire',
      en: 'After-school program registration'
    },
    description: {
      fr: 'Inscrire l\'enfant aux activités périscolaires (garderie, études)',
      en: 'Register child for after-school activities'
    },
    periodType: 'rentree',
    month: 9,
    leadDays: 14,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.TWELVE_YEARS },
    countries: ['FR'],
    category: 'administrative',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['rentree', 'periscolaire', 'garderie'],
    enabled: true
  },
  {
    id: 'rentree_inscription_activites',
    name: {
      fr: 'Inscription activités extra-scolaires',
      en: 'Extracurricular activities registration'
    },
    description: {
      fr: 'Inscrire l\'enfant aux activités extra-scolaires (sport, musique, etc.)',
      en: 'Register child for extracurricular activities (sports, music, etc.)'
    },
    periodType: 'rentree',
    month: 9,
    leadDays: 21,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR', 'BE', 'CH', 'CA'],
    category: 'social',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['rentree', 'activites', 'sport', 'musique'],
    enabled: true
  }
];

// =============================================================================
// TOUSSAINT PERIOD RULES (October/November)
// =============================================================================

export const TOUSSAINT_RULES: readonly PeriodRule[] = [
  {
    id: 'toussaint_reunion_parents',
    name: {
      fr: 'Réunion parents-professeurs',
      en: 'Parent-teacher meeting'
    },
    description: {
      fr: 'Assister à la réunion de rentrée avec les professeurs',
      en: 'Attend back-to-school meeting with teachers'
    },
    periodType: 'toussaint',
    month: 10,
    weekOfMonth: 1,
    leadDays: 7,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'education',
    priority: 'high',
    recurrence: 'yearly',
    tags: ['ecole', 'reunion', 'parents'],
    enabled: true
  },
  {
    id: 'toussaint_photos_classe',
    name: {
      fr: 'Commander photos de classe',
      en: 'Order class photos'
    },
    description: {
      fr: 'Commander les photos de classe de l\'année',
      en: 'Order class photos for the year'
    },
    periodType: 'toussaint',
    month: 10,
    leadDays: 7,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'seasonal',
    priority: 'low',
    recurrence: 'yearly',
    tags: ['ecole', 'photos'],
    enabled: true
  },
  {
    id: 'toussaint_vacances_planning',
    name: {
      fr: 'Planifier vacances Toussaint',
      en: 'Plan fall break'
    },
    description: {
      fr: 'Organiser les vacances de la Toussaint (garde, activités)',
      en: 'Organize fall break (childcare, activities)'
    },
    periodType: 'toussaint',
    month: 10,
    leadDays: 21,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.TWELVE_YEARS },
    countries: ['FR'],
    category: 'seasonal',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['vacances', 'toussaint', 'planning'],
    enabled: true
  }
];

// =============================================================================
// CHRISTMAS PERIOD RULES (December)
// =============================================================================

export const CHRISTMAS_RULES: readonly PeriodRule[] = [
  {
    id: 'christmas_cadeaux_liste',
    name: {
      fr: 'Liste de cadeaux de Noël',
      en: 'Christmas gift list'
    },
    description: {
      fr: 'Demander et compiler la liste de cadeaux des enfants',
      en: 'Ask for and compile children\'s gift lists'
    },
    periodType: 'christmas',
    month: 11, // November
    leadDays: 30,
    ageRange: { minMonths: AGE_IN_MONTHS.TWO_YEARS, maxMonths: AGE_IN_MONTHS.FOURTEEN_YEARS },
    countries: ['FR', 'BE', 'CH', 'CA'],
    category: 'seasonal',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['noel', 'cadeaux'],
    enabled: true
  },
  {
    id: 'christmas_cadeaux_achat',
    name: {
      fr: 'Achats de Noël',
      en: 'Christmas shopping'
    },
    description: {
      fr: 'Acheter les cadeaux de Noël pour les enfants',
      en: 'Buy Christmas gifts for children'
    },
    periodType: 'christmas',
    month: 12,
    leadDays: 14,
    ageRange: { minMonths: 0, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR', 'BE', 'CH', 'CA'],
    category: 'seasonal',
    priority: 'high',
    recurrence: 'yearly',
    tags: ['noel', 'cadeaux', 'achat'],
    enabled: true
  },
  {
    id: 'christmas_spectacle_ecole',
    name: {
      fr: 'Spectacle de Noël école',
      en: 'School Christmas show'
    },
    description: {
      fr: 'Assister au spectacle de Noël de l\'école',
      en: 'Attend school Christmas show'
    },
    periodType: 'christmas',
    month: 12,
    weekOfMonth: 2,
    leadDays: 7,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.TWELVE_YEARS },
    countries: ['FR'],
    category: 'education',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['noel', 'ecole', 'spectacle'],
    enabled: true
  },
  {
    id: 'christmas_vacances_planning',
    name: {
      fr: 'Planifier vacances de Noël',
      en: 'Plan Christmas holidays'
    },
    description: {
      fr: 'Organiser les vacances de Noël (voyages, famille)',
      en: 'Organize Christmas holidays (travel, family)'
    },
    periodType: 'christmas',
    month: 11,
    leadDays: 45,
    ageRange: { minMonths: 0, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR', 'BE', 'CH', 'CA'],
    category: 'seasonal',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['vacances', 'noel', 'planning'],
    enabled: true
  }
];

// =============================================================================
// JANUARY PERIOD RULES
// =============================================================================

export const JANUARY_RULES: readonly PeriodRule[] = [
  {
    id: 'january_renouvellement_activites',
    name: {
      fr: 'Renouvellement activités',
      en: 'Activity renewal'
    },
    description: {
      fr: 'Confirmer ou modifier les inscriptions aux activités pour le 2ème semestre',
      en: 'Confirm or modify activity registrations for second semester'
    },
    periodType: 'annual',
    month: 1,
    leadDays: 14,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'administrative',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['activites', 'inscription', 'renouvellement'],
    enabled: true
  },
  {
    id: 'january_declaration_impots_prep',
    name: {
      fr: 'Rassembler documents impôts',
      en: 'Gather tax documents'
    },
    description: {
      fr: 'Commencer à rassembler les documents pour la déclaration d\'impôts (garde d\'enfants, etc.)',
      en: 'Start gathering documents for tax return (childcare, etc.)'
    },
    periodType: 'annual',
    month: 1,
    leadDays: 7,
    countries: ['FR'],
    category: 'administrative',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['impots', 'administratif'],
    enabled: true
  }
];

// =============================================================================
// FEBRUARY PERIOD RULES
// =============================================================================

export const FEBRUARY_RULES: readonly PeriodRule[] = [
  {
    id: 'february_vacances_planning',
    name: {
      fr: 'Planifier vacances d\'hiver',
      en: 'Plan winter break'
    },
    description: {
      fr: 'Organiser les vacances d\'hiver (ski, centres de loisirs)',
      en: 'Organize winter break (ski, leisure centers)'
    },
    periodType: 'february',
    month: 1,
    leadDays: 30,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'seasonal',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['vacances', 'hiver', 'planning'],
    enabled: true
  }
];

// =============================================================================
// SPRING PERIOD RULES (March-April)
// =============================================================================

export const SPRING_RULES: readonly PeriodRule[] = [
  {
    id: 'spring_inscriptions_prochaine_annee',
    name: {
      fr: 'Inscriptions année prochaine',
      en: 'Next year registrations'
    },
    description: {
      fr: 'Procéder aux inscriptions scolaires pour l\'année prochaine',
      en: 'Complete school registrations for next year'
    },
    periodType: 'spring',
    month: 3,
    leadDays: 30,
    ageRange: { minMonths: AGE_IN_MONTHS.TWO_YEARS, maxMonths: AGE_IN_MONTHS.SEVENTEEN_YEARS },
    countries: ['FR'],
    category: 'administrative',
    priority: 'critical',
    recurrence: 'yearly',
    tags: ['inscription', 'ecole', 'rentree'],
    enabled: true
  },
  {
    id: 'spring_vacances_planning',
    name: {
      fr: 'Planifier vacances de printemps',
      en: 'Plan spring break'
    },
    description: {
      fr: 'Organiser les vacances de printemps',
      en: 'Organize spring break'
    },
    periodType: 'spring',
    month: 3,
    leadDays: 30,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'seasonal',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['vacances', 'printemps', 'planning'],
    enabled: true
  },
  {
    id: 'spring_declaration_impots',
    name: {
      fr: 'Déclaration d\'impôts',
      en: 'Tax return'
    },
    description: {
      fr: 'Effectuer la déclaration d\'impôts annuelle (frais de garde, etc.)',
      en: 'Complete annual tax return (childcare expenses, etc.)'
    },
    periodType: 'spring',
    month: 4,
    leadDays: 21,
    countries: ['FR'],
    category: 'administrative',
    priority: 'critical',
    recurrence: 'yearly',
    tags: ['impots', 'administratif', 'fiscal'],
    enabled: true
  }
];

// =============================================================================
// END OF YEAR PERIOD RULES (June)
// =============================================================================

export const END_OF_YEAR_RULES: readonly PeriodRule[] = [
  {
    id: 'june_spectacle_fin_annee',
    name: {
      fr: 'Spectacle de fin d\'année',
      en: 'End of year show'
    },
    description: {
      fr: 'Assister au spectacle de fin d\'année de l\'école',
      en: 'Attend school end-of-year show'
    },
    periodType: 'end_of_year',
    month: 6,
    weekOfMonth: 3,
    leadDays: 7,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.TWELVE_YEARS },
    countries: ['FR'],
    category: 'education',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['ecole', 'spectacle', 'fin_annee'],
    enabled: true
  },
  {
    id: 'june_cadeaux_maitresse',
    name: {
      fr: 'Cadeau maîtresse/professeur',
      en: 'Teacher gift'
    },
    description: {
      fr: 'Organiser et acheter le cadeau de fin d\'année pour l\'enseignant',
      en: 'Organize and buy end-of-year gift for teacher'
    },
    periodType: 'end_of_year',
    month: 6,
    leadDays: 14,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.TWELVE_YEARS },
    countries: ['FR'],
    category: 'seasonal',
    priority: 'low',
    recurrence: 'yearly',
    tags: ['ecole', 'cadeau', 'fin_annee'],
    enabled: true
  },
  {
    id: 'june_bilan_annee',
    name: {
      fr: 'Bilan de fin d\'année',
      en: 'End of year review'
    },
    description: {
      fr: 'Consulter les bulletins et faire le point sur l\'année scolaire',
      en: 'Review report cards and assess school year'
    },
    periodType: 'end_of_year',
    month: 6,
    leadDays: 7,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR'],
    category: 'education',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['ecole', 'bulletin', 'bilan'],
    enabled: true
  }
];

// =============================================================================
// SUMMER PERIOD RULES (July-August)
// =============================================================================

export const SUMMER_RULES: readonly PeriodRule[] = [
  {
    id: 'summer_centres_loisirs',
    name: {
      fr: 'Inscription centres de loisirs',
      en: 'Day camp registration'
    },
    description: {
      fr: 'Inscrire les enfants aux centres de loisirs pour l\'été',
      en: 'Register children for summer day camps'
    },
    periodType: 'summer',
    month: 5, // May
    leadDays: 45,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.TWELVE_YEARS },
    countries: ['FR'],
    category: 'seasonal',
    priority: 'high',
    recurrence: 'yearly',
    tags: ['vacances', 'ete', 'centres_loisirs'],
    enabled: true
  },
  {
    id: 'summer_colonies_vacances',
    name: {
      fr: 'Inscription colonie de vacances',
      en: 'Summer camp registration'
    },
    description: {
      fr: 'Inscrire les enfants en colonie de vacances',
      en: 'Register children for summer camp'
    },
    periodType: 'summer',
    month: 4, // April
    leadDays: 60,
    ageRange: { minMonths: AGE_IN_MONTHS.SIX_YEARS, maxMonths: AGE_IN_MONTHS.SEVENTEEN_YEARS },
    countries: ['FR'],
    category: 'seasonal',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['vacances', 'ete', 'colonie'],
    enabled: true
  },
  {
    id: 'summer_vacances_planning',
    name: {
      fr: 'Planifier vacances d\'été',
      en: 'Plan summer vacation'
    },
    description: {
      fr: 'Organiser les grandes vacances (hébergement, activités)',
      en: 'Organize summer vacation (accommodation, activities)'
    },
    periodType: 'summer',
    month: 4,
    leadDays: 90,
    ageRange: { minMonths: 0, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR', 'BE', 'CH', 'CA'],
    category: 'seasonal',
    priority: 'medium',
    recurrence: 'yearly',
    tags: ['vacances', 'ete', 'planning'],
    enabled: true
  },
  {
    id: 'summer_cahier_vacances',
    name: {
      fr: 'Acheter cahier de vacances',
      en: 'Buy vacation workbook'
    },
    description: {
      fr: 'Acheter un cahier de vacances pour maintenir les acquis',
      en: 'Buy vacation workbook to maintain skills'
    },
    periodType: 'summer',
    month: 6,
    leadDays: 14,
    ageRange: { minMonths: AGE_IN_MONTHS.FIVE_YEARS, maxMonths: AGE_IN_MONTHS.FOURTEEN_YEARS },
    countries: ['FR'],
    category: 'education',
    priority: 'low',
    recurrence: 'yearly',
    tags: ['vacances', 'education', 'cahier'],
    enabled: true
  }
];

// =============================================================================
// MONTHLY RECURRING RULES
// =============================================================================

export const MONTHLY_RULES: readonly PeriodRule[] = [
  {
    id: 'monthly_check_fournitures',
    name: {
      fr: 'Vérifier fournitures scolaires',
      en: 'Check school supplies'
    },
    description: {
      fr: 'Vérifier et réapprovisionner les fournitures scolaires si nécessaire',
      en: 'Check and restock school supplies if needed'
    },
    periodType: 'monthly',
    month: 1, // Any month, will be applied monthly
    dayOfMonth: 1,
    leadDays: 0,
    ageRange: { minMonths: AGE_IN_MONTHS.THREE_YEARS, maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS },
    countries: ['FR', 'BE', 'CH', 'CA'],
    category: 'education',
    priority: 'low',
    recurrence: 'monthly',
    tags: ['fournitures', 'ecole', 'mensuel'],
    enabled: true
  }
];

// =============================================================================
// STORE CREATION AND MANAGEMENT
// =============================================================================

/**
 * Create an empty period rule store
 */
export function createPeriodRuleStore(): PeriodRuleStore {
  return {
    rules: new Map(),
    byMonth: new Map(),
    byType: new Map(),
    lastUpdated: new Date()
  };
}

/**
 * Add a period rule to the store
 */
export function addPeriodRule(
  store: PeriodRuleStore,
  rule: PeriodRule
): PeriodRuleStore {
  const rules = new Map(store.rules);
  rules.set(rule.id, rule);

  // Update month index
  const byMonth = new Map(store.byMonth);
  const monthList = byMonth.get(rule.month) || [];
  if (!monthList.includes(rule.id)) {
    byMonth.set(rule.month, [...monthList, rule.id]);
  }

  // Update type index
  const byType = new Map(store.byType);
  const typeList = byType.get(rule.periodType) || [];
  if (!typeList.includes(rule.id)) {
    byType.set(rule.periodType, [...typeList, rule.id]);
  }

  return {
    rules,
    byMonth,
    byType,
    lastUpdated: new Date()
  };
}

/**
 * Initialize store with all French period rules
 */
export function initializeFrenchPeriodRules(): PeriodRuleStore {
  let store = createPeriodRuleStore();

  const allRules = [
    ...RENTREE_RULES,
    ...TOUSSAINT_RULES,
    ...CHRISTMAS_RULES,
    ...JANUARY_RULES,
    ...FEBRUARY_RULES,
    ...SPRING_RULES,
    ...END_OF_YEAR_RULES,
    ...SUMMER_RULES,
    ...MONTHLY_RULES
  ];

  for (const rule of allRules) {
    store = addPeriodRule(store, rule);
  }

  return store;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get rules for a specific month
 */
export function getRulesForMonth(
  store: PeriodRuleStore,
  month: number,
  country: CountryCode = 'FR'
): readonly PeriodRule[] {
  const ruleIds = store.byMonth.get(month) || [];

  return ruleIds
    .map(id => store.rules.get(id))
    .filter((r): r is PeriodRule =>
      r !== undefined &&
      r.enabled &&
      (r.countries.includes(country) || r.countries.includes('GENERIC'))
    );
}

/**
 * Get rules for current month
 */
export function getCurrentMonthRules(
  store: PeriodRuleStore,
  country: CountryCode = 'FR'
): readonly PeriodRule[] {
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  return getRulesForMonth(store, currentMonth, country);
}

/**
 * Get upcoming rules for next N days
 */
export function getUpcomingRules(
  store: PeriodRuleStore,
  daysAhead: number = 30,
  country: CountryCode = 'FR'
): readonly PeriodRule[] {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + daysAhead);

  const results: PeriodRule[] = [];
  const currentMonth = today.getMonth() + 1;
  const futureMonth = futureDate.getMonth() + 1;

  // Get rules for current and next month(s)
  const monthsToCheck = new Set<number>();
  let m = currentMonth;
  while (true) {
    monthsToCheck.add(m);
    if (m === futureMonth) break;
    m = m === 12 ? 1 : m + 1;
    if (monthsToCheck.size > 12) break; // Safety
  }

  for (const month of monthsToCheck) {
    const monthRules = getRulesForMonth(store, month, country);
    results.push(...monthRules);
  }

  return [...new Set(results)]; // Remove duplicates
}

/**
 * Get rules by period type
 */
export function getRulesByType(
  store: PeriodRuleStore,
  type: PeriodType
): readonly PeriodRule[] {
  const ruleIds = store.byType.get(type) || [];

  return ruleIds
    .map(id => store.rules.get(id))
    .filter((r): r is PeriodRule => r !== undefined && r.enabled);
}

/**
 * Get rules applicable for a child's age
 */
export function getRulesForChildAge(
  store: PeriodRuleStore,
  ageInMonths: number,
  country: CountryCode = 'FR'
): readonly PeriodRule[] {
  return Array.from(store.rules.values())
    .filter(rule => {
      if (!rule.enabled) return false;
      if (!rule.countries.includes(country) && !rule.countries.includes('GENERIC')) {
        return false;
      }

      // No age restriction
      if (!rule.ageRange) return true;

      return ageInMonths >= rule.ageRange.minMonths &&
             ageInMonths <= rule.ageRange.maxMonths;
    });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate trigger date for a period rule in a given year
 */
export function calculateTriggerDate(
  rule: PeriodRule,
  year: number
): Date {
  const date = new Date(year, rule.month - 1, 1);

  if (rule.dayOfMonth) {
    date.setDate(rule.dayOfMonth);
  } else if (rule.weekOfMonth && rule.dayOfWeek !== undefined) {
    // Find the specific day of week in the specified week
    const firstOfMonth = new Date(year, rule.month - 1, 1);
    const firstDayOfWeek = firstOfMonth.getDay();
    let daysToAdd = rule.dayOfWeek - firstDayOfWeek;
    if (daysToAdd < 0) daysToAdd += 7;
    daysToAdd += (rule.weekOfMonth - 1) * 7;
    date.setDate(1 + daysToAdd);
  } else if (rule.weekOfMonth) {
    // Middle of the specified week
    date.setDate(1 + (rule.weekOfMonth - 1) * 7 + 3);
  }

  return date;
}

/**
 * Calculate due date (trigger date minus lead days)
 */
export function calculateDueDate(
  rule: PeriodRule,
  year: number
): Date {
  const triggerDate = calculateTriggerDate(rule, year);
  const dueDate = new Date(triggerDate);
  dueDate.setDate(dueDate.getDate() - rule.leadDays);
  return dueDate;
}

/**
 * Check if a rule should be triggered now
 */
export function shouldTriggerRule(
  rule: PeriodRule,
  referenceDate: Date = new Date()
): boolean {
  const year = referenceDate.getFullYear();
  const dueDate = calculateDueDate(rule, year);

  // Check if we're within the lead window
  const daysDiff = Math.ceil(
    (dueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysDiff >= 0 && daysDiff <= rule.leadDays;
}

/**
 * Get period name in French
 */
export function getPeriodNameFR(type: PeriodType): string {
  const names: Record<PeriodType, string> = {
    rentree: 'Rentrée scolaire',
    toussaint: 'Vacances de la Toussaint',
    christmas: 'Vacances de Noël',
    february: 'Vacances d\'hiver',
    spring: 'Vacances de printemps',
    end_of_year: 'Fin d\'année scolaire',
    summer: 'Grandes vacances',
    monthly: 'Mensuel',
    quarterly: 'Trimestriel',
    annual: 'Annuel'
  };
  return names[type];
}

/**
 * Convert period rule to task template
 */
export function periodRuleToTemplate(
  rule: PeriodRule,
  childId: string,
  childName: string,
  year: number
): TaskTemplate {
  const titleFR = (rule.name['fr'] ?? '').replace('{enfant}', childName).replace('{child}', childName);
  const titleEN = (rule.name['en'] || rule.name['fr'] || '').replace('{enfant}', childName).replace('{child}', childName);

  const descFR = (rule.description['fr'] ?? '').replace('{enfant}', childName).replace('{child}', childName);
  const descEN = (rule.description['en'] || rule.description['fr'] || '').replace('{enfant}', childName).replace('{child}', childName);

  const ageRange: AgeRange = rule.ageRange
    ? {
        minMonths: rule.ageRange.minMonths,
        maxMonths: rule.ageRange.maxMonths,
        description: `${Math.floor(rule.ageRange.minMonths / 12)}-${Math.floor(rule.ageRange.maxMonths / 12)} ans`
      }
    : {
        minMonths: 0,
        maxMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS,
        description: '0-18 ans'
      };

  return buildEducationTemplate({
    slug: `${rule.id}_${childId}_${year}`,
    titleFR,
    titleEN,
    descFR,
    descEN,
    ageRange,
    recurrence: rule.recurrence === 'once' ? 'once' : 'yearly',
    priority: rule.priority,
    countries: rule.countries as CountryCode[],
    triggerMonth: rule.month,
    leadDays: rule.leadDays,
    tags: [...rule.tags, rule.periodType]
  });
}
