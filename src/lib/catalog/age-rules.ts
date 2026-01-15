/**
 * Age Rules - Sprint 21 Phase 2
 *
 * Age-based task triggers for automatic task generation:
 * - 0-3 years: vaccines, PMI visits, childcare registration
 * - 3-6 years: maternelle enrollment, school supplies
 * - 6-11 years: primaire supplies, activities registration
 * - 11-15 years: college orientation, brevet preparation
 * - 15-18 years: permis, bac, parcoursup
 *
 * Functional, immutable pattern with Zod validation.
 */

import { z } from "zod";
import {
  type TaskTemplate,
  type TemplateStore,
  type CountryCode,
  type AgeRange,
  AGE_IN_MONTHS,
  buildHealthTemplate,
  buildEducationTemplate,
  buildAdministrativeTemplate,
  addTemplate,
  createTemplateStore
} from "./task-templates";

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Age milestone types
 */
export const AgeMilestoneTypeSchema = z.enum([
  'vaccine',           // Vaccination schedule
  'health_checkup',    // Regular health checkups
  'registration',      // School/activity registration
  'preparation',       // Exam/event preparation
  'administrative',    // ID cards, passports
  'activity',          // Sports, arts registration
  'transition'         // School level transitions
]);
export type AgeMilestoneType = z.infer<typeof AgeMilestoneTypeSchema>;

/**
 * Age milestone definition
 */
export const AgeMilestoneSchema = z.object({
  id: z.string(),
  type: AgeMilestoneTypeSchema,
  ageMonths: z.number(),              // Exact age in months
  tolerance: z.number().default(1),   // Months before/after to trigger
  name: z.record(z.string()),         // Localized name
  description: z.record(z.string()),  // Localized description
  countries: z.array(z.string()),     // Applicable countries
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  mandatory: z.boolean(),             // Is this legally required?
  reminders: z.array(z.number())      // Days before to send reminders
});
export type AgeMilestone = z.infer<typeof AgeMilestoneSchema>;

/**
 * Age rule store
 */
export type AgeRuleStore = {
  milestones: Map<string, AgeMilestone>;
  byType: Map<AgeMilestoneType, string[]>;
  byAge: Map<number, string[]>;
  lastUpdated: Date;
};

// =============================================================================
// FRENCH VACCINE SCHEDULE (Calendrier vaccinal 2024)
// =============================================================================

/**
 * French mandatory vaccines by age
 * Source: calendrier-vaccinal.fr
 */
export const FRENCH_VACCINES: readonly AgeMilestone[] = [
  // 2 months
  {
    id: 'vac_dtcp_1',
    type: 'vaccine',
    ageMonths: 2,
    tolerance: 0,
    name: { fr: 'Vaccin DTP-Coqueluche-Hib (1ère dose)', en: 'DTP-Whooping cough-Hib vaccine (1st dose)' },
    description: { fr: 'Première injection contre diphtérie, tétanos, polio, coqueluche et Haemophilus influenzae b', en: 'First injection against diphtheria, tetanus, polio, whooping cough and Haemophilus influenzae b' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  {
    id: 'vac_hepb_1',
    type: 'vaccine',
    ageMonths: 2,
    tolerance: 0,
    name: { fr: 'Vaccin Hépatite B (1ère dose)', en: 'Hepatitis B vaccine (1st dose)' },
    description: { fr: 'Première injection contre l\'hépatite B', en: 'First injection against hepatitis B' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  {
    id: 'vac_pneumo_1',
    type: 'vaccine',
    ageMonths: 2,
    tolerance: 0,
    name: { fr: 'Vaccin Pneumocoque (1ère dose)', en: 'Pneumococcal vaccine (1st dose)' },
    description: { fr: 'Première injection contre le pneumocoque', en: 'First injection against pneumococcus' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  // 4 months
  {
    id: 'vac_dtcp_2',
    type: 'vaccine',
    ageMonths: 4,
    tolerance: 0,
    name: { fr: 'Vaccin DTP-Coqueluche-Hib (2ème dose)', en: 'DTP-Whooping cough-Hib vaccine (2nd dose)' },
    description: { fr: 'Deuxième injection contre diphtérie, tétanos, polio, coqueluche et Hib', en: 'Second injection against diphtheria, tetanus, polio, whooping cough and Hib' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  {
    id: 'vac_hepb_2',
    type: 'vaccine',
    ageMonths: 4,
    tolerance: 0,
    name: { fr: 'Vaccin Hépatite B (2ème dose)', en: 'Hepatitis B vaccine (2nd dose)' },
    description: { fr: 'Deuxième injection contre l\'hépatite B', en: 'Second injection against hepatitis B' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  {
    id: 'vac_pneumo_2',
    type: 'vaccine',
    ageMonths: 4,
    tolerance: 0,
    name: { fr: 'Vaccin Pneumocoque (2ème dose)', en: 'Pneumococcal vaccine (2nd dose)' },
    description: { fr: 'Deuxième injection contre le pneumocoque', en: 'Second injection against pneumococcus' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  // 5 months
  {
    id: 'vac_meningo_1',
    type: 'vaccine',
    ageMonths: 5,
    tolerance: 0,
    name: { fr: 'Vaccin Méningocoque C (1ère dose)', en: 'Meningococcal C vaccine (1st dose)' },
    description: { fr: 'Première injection contre le méningocoque C', en: 'First injection against meningococcus C' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  // 11 months
  {
    id: 'vac_dtcp_3',
    type: 'vaccine',
    ageMonths: 11,
    tolerance: 0,
    name: { fr: 'Vaccin DTP-Coqueluche-Hib (rappel)', en: 'DTP-Whooping cough-Hib vaccine (booster)' },
    description: { fr: 'Rappel contre diphtérie, tétanos, polio, coqueluche et Hib', en: 'Booster against diphtheria, tetanus, polio, whooping cough and Hib' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  {
    id: 'vac_hepb_3',
    type: 'vaccine',
    ageMonths: 11,
    tolerance: 0,
    name: { fr: 'Vaccin Hépatite B (3ème dose)', en: 'Hepatitis B vaccine (3rd dose)' },
    description: { fr: 'Troisième injection contre l\'hépatite B', en: 'Third injection against hepatitis B' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  {
    id: 'vac_pneumo_3',
    type: 'vaccine',
    ageMonths: 11,
    tolerance: 0,
    name: { fr: 'Vaccin Pneumocoque (rappel)', en: 'Pneumococcal vaccine (booster)' },
    description: { fr: 'Rappel contre le pneumocoque', en: 'Booster against pneumococcus' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  // 12 months
  {
    id: 'vac_ror_1',
    type: 'vaccine',
    ageMonths: 12,
    tolerance: 0,
    name: { fr: 'Vaccin ROR (1ère dose)', en: 'MMR vaccine (1st dose)' },
    description: { fr: 'Première injection contre rougeole, oreillons, rubéole', en: 'First injection against measles, mumps, rubella' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  {
    id: 'vac_meningo_2',
    type: 'vaccine',
    ageMonths: 12,
    tolerance: 0,
    name: { fr: 'Vaccin Méningocoque C (rappel)', en: 'Meningococcal C vaccine (booster)' },
    description: { fr: 'Rappel contre le méningocoque C', en: 'Booster against meningococcus C' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  // 16-18 months
  {
    id: 'vac_ror_2',
    type: 'vaccine',
    ageMonths: 17,
    tolerance: 1,
    name: { fr: 'Vaccin ROR (2ème dose)', en: 'MMR vaccine (2nd dose)' },
    description: { fr: 'Deuxième injection contre rougeole, oreillons, rubéole', en: 'Second injection against measles, mumps, rubella' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 1]
  },
  // 6 years
  {
    id: 'vac_dtp_rappel_6',
    type: 'vaccine',
    ageMonths: 72,
    tolerance: 2,
    name: { fr: 'Vaccin DTP (rappel 6 ans)', en: 'DTP vaccine (6-year booster)' },
    description: { fr: 'Rappel diphtérie, tétanos, polio à 6 ans', en: 'Diphtheria, tetanus, polio booster at 6 years' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [30, 14, 7]
  },
  // 11-13 years
  {
    id: 'vac_dtcp_rappel_11',
    type: 'vaccine',
    ageMonths: 132,
    tolerance: 12,
    name: { fr: 'Vaccin dTcP (rappel 11-13 ans)', en: 'dTaP vaccine (11-13 year booster)' },
    description: { fr: 'Rappel diphtérie, tétanos, coqueluche, polio entre 11 et 13 ans', en: 'Diphtheria, tetanus, whooping cough, polio booster between 11 and 13 years' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [30, 14, 7]
  },
  {
    id: 'vac_hpv',
    type: 'vaccine',
    ageMonths: 132,
    tolerance: 12,
    name: { fr: 'Vaccin HPV (papillomavirus)', en: 'HPV vaccine (human papillomavirus)' },
    description: { fr: 'Vaccination contre le papillomavirus humain (filles et garçons)', en: 'Human papillomavirus vaccination (girls and boys)' },
    countries: ['FR'],
    priority: 'high',
    mandatory: false,
    reminders: [30, 14, 7]
  }
];

// =============================================================================
// PMI VISITS (Protection Maternelle et Infantile)
// =============================================================================

export const PMI_VISITS: readonly AgeMilestone[] = [
  {
    id: 'pmi_8j',
    type: 'health_checkup',
    ageMonths: 0,
    tolerance: 0,
    name: { fr: 'Examen des 8 premiers jours', en: '8-day checkup' },
    description: { fr: 'Premier examen médical obligatoire dans les 8 jours suivant la naissance', en: 'First mandatory medical examination within 8 days of birth' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [3, 1]
  },
  {
    id: 'pmi_1m',
    type: 'health_checkup',
    ageMonths: 1,
    tolerance: 0,
    name: { fr: 'Visite PMI du 1er mois', en: '1-month PMI visit' },
    description: { fr: 'Visite de suivi à 1 mois', en: 'Follow-up visit at 1 month' },
    countries: ['FR'],
    priority: 'high',
    mandatory: false,
    reminders: [7, 3]
  },
  {
    id: 'pmi_2m',
    type: 'health_checkup',
    ageMonths: 2,
    tolerance: 0,
    name: { fr: 'Examen du 2ème mois', en: '2-month examination' },
    description: { fr: 'Examen médical obligatoire et vaccinations', en: 'Mandatory medical examination and vaccinations' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 3]
  },
  {
    id: 'pmi_4m',
    type: 'health_checkup',
    ageMonths: 4,
    tolerance: 0,
    name: { fr: 'Examen du 4ème mois', en: '4-month examination' },
    description: { fr: 'Examen médical et suivi vaccinal', en: 'Medical examination and vaccination follow-up' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 3]
  },
  {
    id: 'pmi_9m',
    type: 'health_checkup',
    ageMonths: 9,
    tolerance: 0,
    name: { fr: 'Examen du 9ème mois', en: '9-month examination' },
    description: { fr: 'Examen médical obligatoire - certificat pour CAF', en: 'Mandatory medical examination - certificate for family allowance' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 3]
  },
  {
    id: 'pmi_12m',
    type: 'health_checkup',
    ageMonths: 12,
    tolerance: 0,
    name: { fr: 'Examen des 12 mois', en: '12-month examination' },
    description: { fr: 'Bilan de santé complet à 1 an', en: 'Complete health check at 1 year' },
    countries: ['FR'],
    priority: 'high',
    mandatory: false,
    reminders: [14, 7, 3]
  },
  {
    id: 'pmi_24m',
    type: 'health_checkup',
    ageMonths: 24,
    tolerance: 0,
    name: { fr: 'Examen des 24 mois', en: '24-month examination' },
    description: { fr: 'Examen médical obligatoire - certificat CAF', en: 'Mandatory medical examination - family allowance certificate' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [14, 7, 3]
  }
];

// =============================================================================
// SCHOOL MILESTONES
// =============================================================================

export const SCHOOL_MILESTONES: readonly AgeMilestone[] = [
  // Maternelle (3 years)
  {
    id: 'school_maternelle_inscription',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.THREE_YEARS - 6, // 6 months before
    tolerance: 3,
    name: { fr: 'Inscription maternelle', en: 'Preschool registration' },
    description: { fr: 'Inscription à l\'école maternelle pour la rentrée prochaine', en: 'Preschool registration for next school year' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [60, 30, 14]
  },
  {
    id: 'school_maternelle_rentree',
    type: 'transition',
    ageMonths: AGE_IN_MONTHS.THREE_YEARS,
    tolerance: 1,
    name: { fr: 'Rentrée en maternelle', en: 'Start of preschool' },
    description: { fr: 'Première rentrée scolaire en petite section', en: 'First day of preschool' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [30, 14, 7, 1]
  },

  // CP (6 years)
  {
    id: 'school_cp_inscription',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.SIX_YEARS - 6,
    tolerance: 3,
    name: { fr: 'Inscription CP / école primaire', en: 'Elementary school registration' },
    description: { fr: 'Inscription à l\'école primaire si changement d\'établissement', en: 'Elementary school registration if changing school' },
    countries: ['FR'],
    priority: 'high',
    mandatory: false,
    reminders: [60, 30, 14]
  },
  {
    id: 'school_cp_rentree',
    type: 'transition',
    ageMonths: AGE_IN_MONTHS.SIX_YEARS,
    tolerance: 1,
    name: { fr: 'Rentrée au CP', en: 'Start of 1st grade' },
    description: { fr: 'Entrée en cours préparatoire - début de l\'école primaire', en: 'Start of first grade - beginning of elementary school' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [30, 14, 7, 1]
  },

  // Collège (11 years)
  {
    id: 'school_college_inscription',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.ELEVEN_YEARS - 6,
    tolerance: 3,
    name: { fr: 'Inscription collège (6ème)', en: 'Middle school registration (6th grade)' },
    description: { fr: 'Inscription au collège pour la 6ème', en: 'Middle school registration for 6th grade' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [90, 60, 30, 14]
  },
  {
    id: 'school_college_rentree',
    type: 'transition',
    ageMonths: AGE_IN_MONTHS.ELEVEN_YEARS,
    tolerance: 1,
    name: { fr: 'Rentrée au collège', en: 'Start of middle school' },
    description: { fr: 'Entrée en 6ème - début du collège', en: 'Start of 6th grade - beginning of middle school' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [30, 14, 7, 1]
  },

  // Brevet (15 years / 3ème)
  {
    id: 'school_brevet_preparation',
    type: 'preparation',
    ageMonths: AGE_IN_MONTHS.FOURTEEN_YEARS + 6, // Début de 3ème
    tolerance: 3,
    name: { fr: 'Préparation brevet des collèges', en: 'National exam preparation' },
    description: { fr: 'Préparation au diplôme national du brevet', en: 'Preparation for national certificate examination' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [90, 60, 30]
  },

  // Lycée (15 years)
  {
    id: 'school_lycee_orientation',
    type: 'administrative',
    ageMonths: AGE_IN_MONTHS.FOURTEEN_YEARS + 6,
    tolerance: 3,
    name: { fr: 'Orientation lycée (voeux)', en: 'High school orientation' },
    description: { fr: 'Choix d\'orientation et voeux pour le lycée', en: 'High school track choice and preferences' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [90, 60, 30, 14]
  },
  {
    id: 'school_lycee_inscription',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.FIFTEEN_YEARS - 3,
    tolerance: 3,
    name: { fr: 'Inscription lycée', en: 'High school registration' },
    description: { fr: 'Inscription administrative au lycée', en: 'High school administrative registration' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [60, 30, 14]
  },

  // Baccalauréat (17-18 years)
  {
    id: 'school_bac_inscription',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.SEVENTEEN_YEARS + 3,
    tolerance: 2,
    name: { fr: 'Inscription au baccalauréat', en: 'Baccalaureate registration' },
    description: { fr: 'Inscription à l\'examen du baccalauréat', en: 'Registration for baccalaureate exam' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [30, 14, 7]
  },
  {
    id: 'school_bac_preparation',
    type: 'preparation',
    ageMonths: AGE_IN_MONTHS.SEVENTEEN_YEARS,
    tolerance: 6,
    name: { fr: 'Préparation baccalauréat', en: 'Baccalaureate preparation' },
    description: { fr: 'Révisions et préparation aux épreuves du bac', en: 'Study and preparation for bac exams' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [90, 60, 30]
  },

  // Parcoursup (17-18 years)
  {
    id: 'school_parcoursup_inscription',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.SEVENTEEN_YEARS + 4,
    tolerance: 1,
    name: { fr: 'Inscription Parcoursup', en: 'Parcoursup registration' },
    description: { fr: 'Création du dossier Parcoursup pour l\'orientation post-bac', en: 'Parcoursup application for post-secondary education' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [30, 14, 7, 3]
  },
  {
    id: 'school_parcoursup_voeux',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.SEVENTEEN_YEARS + 5,
    tolerance: 1,
    name: { fr: 'Voeux Parcoursup', en: 'Parcoursup choices' },
    description: { fr: 'Saisie et confirmation des voeux sur Parcoursup', en: 'Enter and confirm choices on Parcoursup' },
    countries: ['FR'],
    priority: 'critical',
    mandatory: true,
    reminders: [30, 14, 7, 3]
  }
];

// =============================================================================
// ADMINISTRATIVE MILESTONES
// =============================================================================

export const ADMINISTRATIVE_MILESTONES: readonly AgeMilestone[] = [
  // Identity documents
  {
    id: 'admin_carte_identite',
    type: 'administrative',
    ageMonths: 0,
    tolerance: 3,
    name: { fr: 'Carte d\'identité bébé', en: 'Baby ID card' },
    description: { fr: 'Demande de carte d\'identité pour le bébé (optionnel mais utile pour les voyages)', en: 'Request baby ID card (optional but useful for travel)' },
    countries: ['FR'],
    priority: 'medium',
    mandatory: false,
    reminders: [14, 7]
  },
  {
    id: 'admin_passeport_enfant',
    type: 'administrative',
    ageMonths: 0,
    tolerance: 3,
    name: { fr: 'Passeport bébé', en: 'Baby passport' },
    description: { fr: 'Demande de passeport pour voyages à l\'étranger', en: 'Passport request for international travel' },
    countries: ['FR'],
    priority: 'medium',
    mandatory: false,
    reminders: [30, 14]
  },

  // Carte vitale
  {
    id: 'admin_carte_vitale',
    type: 'administrative',
    ageMonths: 16 * 12, // 16 ans
    tolerance: 2,
    name: { fr: 'Carte Vitale personnelle', en: 'Personal health card' },
    description: { fr: 'Demande de carte Vitale personnelle à partir de 16 ans', en: 'Personal health card request from 16 years' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [30, 14, 7]
  },

  // Permis de conduire
  {
    id: 'admin_aac_inscription',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.FIFTEEN_YEARS,
    tolerance: 2,
    name: { fr: 'Inscription AAC (conduite accompagnée)', en: 'Accompanied driving registration' },
    description: { fr: 'Inscription à l\'apprentissage anticipé de la conduite dès 15 ans', en: 'Registration for accompanied driving from 15 years' },
    countries: ['FR'],
    priority: 'medium',
    mandatory: false,
    reminders: [30, 14]
  },
  {
    id: 'admin_code_route',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.FIFTEEN_YEARS,
    tolerance: 12,
    name: { fr: 'Inscription code de la route', en: 'Driving theory registration' },
    description: { fr: 'Inscription à l\'examen du code de la route', en: 'Registration for driving theory test' },
    countries: ['FR'],
    priority: 'medium',
    mandatory: false,
    reminders: [30, 14]
  },
  {
    id: 'admin_permis_18',
    type: 'registration',
    ageMonths: AGE_IN_MONTHS.EIGHTEEN_YEARS,
    tolerance: 2,
    name: { fr: 'Passage du permis de conduire', en: 'Driving test' },
    description: { fr: 'Épreuve pratique du permis de conduire à 18 ans', en: 'Practical driving test at 18 years' },
    countries: ['FR'],
    priority: 'medium',
    mandatory: false,
    reminders: [60, 30, 14]
  },

  // Journée défense et citoyenneté
  {
    id: 'admin_jdc',
    type: 'administrative',
    ageMonths: AGE_IN_MONTHS.SIXTEEN_YEARS,
    tolerance: 12,
    name: { fr: 'Journée Défense et Citoyenneté (JDC)', en: 'Defense and Citizenship Day' },
    description: { fr: 'Convocation et participation à la JDC (obligatoire)', en: 'Convocation and participation in Defense Day (mandatory)' },
    countries: ['FR'],
    priority: 'high',
    mandatory: true,
    reminders: [60, 30, 14]
  }
];

// =============================================================================
// STORE CREATION AND MANAGEMENT
// =============================================================================

/**
 * Create an empty age rule store
 */
export function createAgeRuleStore(): AgeRuleStore {
  return {
    milestones: new Map(),
    byType: new Map(),
    byAge: new Map(),
    lastUpdated: new Date()
  };
}

/**
 * Add a milestone to the store
 */
export function addMilestone(
  store: AgeRuleStore,
  milestone: AgeMilestone
): AgeRuleStore {
  const milestones = new Map(store.milestones);
  milestones.set(milestone.id, milestone);

  // Update type index
  const byType = new Map(store.byType);
  const typeList = byType.get(milestone.type) || [];
  if (!typeList.includes(milestone.id)) {
    byType.set(milestone.type, [...typeList, milestone.id]);
  }

  // Update age index
  const byAge = new Map(store.byAge);
  const ageList = byAge.get(milestone.ageMonths) || [];
  if (!ageList.includes(milestone.id)) {
    byAge.set(milestone.ageMonths, [...ageList, milestone.id]);
  }

  return {
    milestones,
    byType,
    byAge,
    lastUpdated: new Date()
  };
}

/**
 * Initialize store with all French milestones
 */
export function initializeFrenchMilestones(): AgeRuleStore {
  let store = createAgeRuleStore();

  for (const vaccine of FRENCH_VACCINES) {
    store = addMilestone(store, vaccine);
  }

  for (const visit of PMI_VISITS) {
    store = addMilestone(store, visit);
  }

  for (const school of SCHOOL_MILESTONES) {
    store = addMilestone(store, school);
  }

  for (const admin of ADMINISTRATIVE_MILESTONES) {
    store = addMilestone(store, admin);
  }

  return store;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get milestones for a specific age
 */
export function getMilestonesForAge(
  store: AgeRuleStore,
  ageInMonths: number,
  country: CountryCode = 'FR'
): readonly AgeMilestone[] {
  const results: AgeMilestone[] = [];

  for (const milestone of store.milestones.values()) {
    if (!milestone.countries.includes(country) && !milestone.countries.includes('GENERIC')) {
      continue;
    }

    const minAge = milestone.ageMonths - milestone.tolerance;
    const maxAge = milestone.ageMonths + milestone.tolerance;

    if (ageInMonths >= minAge && ageInMonths <= maxAge) {
      results.push(milestone);
    }
  }

  return results.sort((a, b) => a.ageMonths - b.ageMonths);
}

/**
 * Get upcoming milestones for a child
 */
export function getUpcomingMilestones(
  store: AgeRuleStore,
  currentAgeMonths: number,
  lookAheadMonths: number = 6,
  country: CountryCode = 'FR'
): readonly AgeMilestone[] {
  const results: AgeMilestone[] = [];
  const maxAge = currentAgeMonths + lookAheadMonths;

  for (const milestone of store.milestones.values()) {
    if (!milestone.countries.includes(country) && !milestone.countries.includes('GENERIC')) {
      continue;
    }

    if (milestone.ageMonths > currentAgeMonths && milestone.ageMonths <= maxAge) {
      results.push(milestone);
    }
  }

  return results.sort((a, b) => a.ageMonths - b.ageMonths);
}

/**
 * Get missed milestones for a child
 */
export function getMissedMilestones(
  store: AgeRuleStore,
  currentAgeMonths: number,
  completedMilestoneIds: ReadonlySet<string>,
  country: CountryCode = 'FR'
): readonly AgeMilestone[] {
  const results: AgeMilestone[] = [];

  for (const milestone of store.milestones.values()) {
    if (!milestone.countries.includes(country) && !milestone.countries.includes('GENERIC')) {
      continue;
    }

    // Past the tolerance window and not completed
    const maxAge = milestone.ageMonths + milestone.tolerance;
    if (currentAgeMonths > maxAge && !completedMilestoneIds.has(milestone.id)) {
      results.push(milestone);
    }
  }

  return results.sort((a, b) => a.ageMonths - b.ageMonths);
}

/**
 * Get mandatory milestones only
 */
export function getMandatoryMilestones(
  store: AgeRuleStore,
  country: CountryCode = 'FR'
): readonly AgeMilestone[] {
  return Array.from(store.milestones.values())
    .filter(m =>
      m.mandatory &&
      (m.countries.includes(country) || m.countries.includes('GENERIC'))
    )
    .sort((a, b) => a.ageMonths - b.ageMonths);
}

/**
 * Get milestones by type
 */
export function getMilestonesByType(
  store: AgeRuleStore,
  type: AgeMilestoneType
): readonly AgeMilestone[] {
  const ids = store.byType.get(type) || [];
  return ids
    .map(id => store.milestones.get(id))
    .filter((m): m is AgeMilestone => m !== undefined)
    .sort((a, b) => a.ageMonths - b.ageMonths);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Convert milestone to task template
 */
export function milestoneToTemplate(
  milestone: AgeMilestone,
  childId: string,
  childName: string
): TaskTemplate {
  const titleFR = (milestone.name['fr'] ?? '').replace('{enfant}', childName).replace('{child}', childName);
  const titleEN = (milestone.name['en'] || milestone.name['fr'] || '').replace('{enfant}', childName).replace('{child}', childName);

  const descFR = (milestone.description['fr'] ?? '').replace('{enfant}', childName).replace('{child}', childName);
  const descEN = (milestone.description['en'] || milestone.description['fr'] || '').replace('{enfant}', childName).replace('{child}', childName);

  const category = milestone.type === 'vaccine' || milestone.type === 'health_checkup'
    ? 'health'
    : milestone.type === 'registration' || milestone.type === 'transition'
    ? 'education'
    : 'administrative';

  const ageRange: AgeRange = {
    minMonths: milestone.ageMonths - milestone.tolerance,
    maxMonths: milestone.ageMonths + milestone.tolerance,
    exactMonths: milestone.ageMonths,
    description: `${Math.floor(milestone.ageMonths / 12)} ans ${milestone.ageMonths % 12} mois`
  };

  return buildHealthTemplate({
    slug: `${milestone.id}_${childId}`,
    titleFR,
    titleEN,
    descFR,
    descEN,
    ageRange,
    recurrence: 'once',
    priority: milestone.priority,
    countries: milestone.countries as CountryCode[],
    leadDays: milestone.reminders[0] || 14,
    tags: [milestone.type, milestone.mandatory ? 'mandatory' : 'optional']
  });
}

/**
 * Get age description in French
 */
export function getAgeDescriptionFR(ageMonths: number): string {
  if (ageMonths < 1) {
    return 'naissance';
  } else if (ageMonths < 12) {
    return ageMonths === 1 ? '1 mois' : `${ageMonths} mois`;
  } else if (ageMonths < 24) {
    return ageMonths === 12 ? '1 an' : `${ageMonths} mois`;
  } else {
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    if (months === 0) {
      return `${years} ans`;
    }
    return `${years} ans et ${months} mois`;
  }
}

/**
 * Calculate days until milestone
 */
export function daysUntilMilestone(
  birthDate: Date,
  milestone: AgeMilestone,
  referenceDate: Date = new Date()
): number {
  const targetDate = new Date(birthDate);
  targetDate.setMonth(targetDate.getMonth() + milestone.ageMonths);

  const diffTime = targetDate.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if milestone is due soon
 */
export function isMilestoneDueSoon(
  birthDate: Date,
  milestone: AgeMilestone,
  daysThreshold: number = 30,
  referenceDate: Date = new Date()
): boolean {
  const days = daysUntilMilestone(birthDate, milestone, referenceDate);
  return days >= 0 && days <= daysThreshold;
}
