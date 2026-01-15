/**
 * Age-Based Task Templates
 *
 * Catalogue automatique de tâches par groupe d'âge.
 * Implémente les règles du MASTER_PROMPT.
 *
 * Structure:
 * - Templates organisés par groupe d'âge
 * - Chaque groupe a ses tâches spécifiques
 * - Poids et priorités calibrés pour la répartition équitable
 */

import type { TaskTemplateCreate } from "@/types/template"

// =============================================================================
// TYPES
// =============================================================================

export interface AgeGroupConfig {
  code: "0-3" | "3-6" | "6-11" | "11-15" | "15-18"
  label: string
  labelFr: string
  description: string
  ageMin: number
  ageMax: number
  icon: string
}

export interface TemplatesByAgeGroup {
  config: AgeGroupConfig
  templates: TaskTemplateCreate[]
}

// =============================================================================
// AGE GROUP CONFIGURATIONS
// =============================================================================

export const AGE_GROUPS: AgeGroupConfig[] = [
  {
    code: "0-3",
    label: "Infant",
    labelFr: "Nourrisson",
    description: "Vaccins obligatoires, visites PMI, mode de garde",
    ageMin: 0,
    ageMax: 2,
    icon: "🍼",
  },
  {
    code: "3-6",
    label: "Preschool",
    labelFr: "Maternelle",
    description: "Inscription école, assurance scolaire, réunions rentrée",
    ageMin: 3,
    ageMax: 5,
    icon: "🎨",
  },
  {
    code: "6-11",
    label: "Primary",
    labelFr: "Primaire",
    description: "Fournitures scolaires, cantine, études, sorties",
    ageMin: 6,
    ageMax: 10,
    icon: "📚",
  },
  {
    code: "11-15",
    label: "Middle School",
    labelFr: "Collège",
    description: "Orientation, brevet, activités ados",
    ageMin: 11,
    ageMax: 14,
    icon: "🎓",
  },
  {
    code: "15-18",
    label: "High School",
    labelFr: "Lycée",
    description: "Permis, bac, parcoursup",
    ageMin: 15,
    ageMax: 17,
    icon: "🚗",
  },
]

// =============================================================================
// 0-3 ANS: NOURRISSON
// =============================================================================

export const templates_0_3: TaskTemplateCreate[] = [
  // === VACCINS OBLIGATOIRES ===
  {
    country: "FR",
    age_min: 0,
    age_max: 0,
    category: "sante",
    subcategory: "vaccin",
    title: "Vaccin 2 mois - DTP, Coqueluche, Hib, Hépatite B, Pneumocoque",
    description:
      "Premier vaccin obligatoire à 2 mois. Prendre RDV chez le pédiatre ou médecin traitant.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 14,
    period: null,
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 0,
    category: "sante",
    subcategory: "vaccin",
    title: "Vaccin 4 mois - Rappel DTP, Coqueluche, Hib, Hépatite B, Pneumocoque",
    description: "Deuxième injection des vaccins obligatoires à 4 mois.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 14,
    period: null,
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 1,
    category: "sante",
    subcategory: "vaccin",
    title: "Vaccin 11 mois - Rappel vaccins + Méningocoque C",
    description: "Rappel des vaccins et première dose méningocoque C.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 14,
    period: null,
  },
  {
    country: "FR",
    age_min: 1,
    age_max: 1,
    category: "sante",
    subcategory: "vaccin",
    title: "Vaccin 12 mois - ROR (Rougeole, Oreillons, Rubéole)",
    description: "Première dose du vaccin ROR obligatoire.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 14,
    period: null,
  },
  {
    country: "FR",
    age_min: 1,
    age_max: 2,
    category: "sante",
    subcategory: "vaccin",
    title: "Vaccin 16-18 mois - Rappel ROR",
    description: "Deuxième dose du vaccin ROR.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 14,
    period: null,
  },

  // === SUIVI MÉDICAL ===
  {
    country: "FR",
    age_min: 0,
    age_max: 3,
    category: "sante",
    subcategory: "bilan",
    title: "Visite PMI mensuelle",
    description: "Suivi de croissance et développement à la PMI ou chez le pédiatre.",
    cron_rule: "@monthly",
    weight: 3,
    days_before_deadline: 7,
    period: "year_round",
  },

  // === MODE DE GARDE ===
  {
    country: "FR",
    age_min: 0,
    age_max: 3,
    category: "logistique",
    subcategory: "garde",
    title: "Recherche mode de garde",
    description:
      "Trouver une place en crèche, chez une assistante maternelle ou organiser la garde.",
    cron_rule: null,
    weight: 8,
    days_before_deadline: 90,
    period: null,
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 3,
    category: "logistique",
    subcategory: "garde",
    title: "Inscription crèche",
    description: "Déposer un dossier d'inscription en crèche (liste d'attente longue).",
    cron_rule: null,
    weight: 6,
    days_before_deadline: 180,
    period: null,
  },

  // === ADMINISTRATIF ===
  {
    country: "FR",
    age_min: 0,
    age_max: 0,
    category: "administratif",
    subcategory: "papiers",
    title: "Déclaration naissance",
    description: "Déclarer la naissance en mairie dans les 5 jours.",
    cron_rule: null,
    weight: 8,
    days_before_deadline: 3,
    period: null,
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 3,
    category: "administratif",
    subcategory: "caf",
    title: "Déclaration CAF - PAJE",
    description: "Déclarer la naissance à la CAF pour percevoir la PAJE.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 30,
    period: null,
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 3,
    category: "administratif",
    subcategory: "caf",
    title: "Déclaration mode de garde CAF",
    description: "Déclarer le mode de garde (crèche, assistante maternelle) à la CAF.",
    cron_rule: null,
    weight: 4,
    days_before_deadline: 30,
    period: null,
  },
]

// =============================================================================
// 3-6 ANS: MATERNELLE
// =============================================================================

export const templates_3_6: TaskTemplateCreate[] = [
  // === INSCRIPTION ÉCOLE ===
  {
    country: "FR",
    age_min: 3,
    age_max: 3,
    category: "ecole",
    subcategory: "inscription",
    title: "Inscription école maternelle",
    description:
      "Inscription en mairie puis validation auprès du directeur. Documents: livret de famille, justificatif domicile, carnet de santé.",
    cron_rule: "0 0 1 3 *",
    weight: 7,
    days_before_deadline: 60,
    period: "printemps",
  },

  // === ASSURANCE & FOURNITURES ===
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "ecole",
    subcategory: "inscription",
    title: "Assurance scolaire",
    description:
      "Souscrire ou renouveler l'assurance scolaire (responsabilité civile + individuelle accident).",
    cron_rule: "0 0 15 8 *",
    weight: 4,
    days_before_deadline: 14,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "ecole",
    subcategory: "fournitures",
    title: "Liste fournitures maternelle",
    description: "Acheter les fournitures demandées: doudou, change, chaussons, tablier...",
    cron_rule: "0 0 20 8 *",
    weight: 3,
    days_before_deadline: 7,
    period: "rentree",
  },

  // === RÉUNIONS ===
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "ecole",
    subcategory: "reunion",
    title: "Réunion de rentrée maternelle",
    description: "Assister à la réunion de rentrée avec l'enseignant(e).",
    cron_rule: "0 0 15 9 *",
    weight: 4,
    days_before_deadline: 7,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "ecole",
    subcategory: "reunion",
    title: "Réunion parents-enseignants 1er trimestre",
    description: "RDV individuel avec l'enseignant(e) pour bilan premier trimestre.",
    cron_rule: "0 0 1 12 *",
    weight: 4,
    days_before_deadline: 7,
    period: "noel",
  },

  // === ACTIVITÉS & SOCIAL ===
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "social",
    subcategory: "fete",
    title: "Photos de classe",
    description: "Commander les photos de classe.",
    cron_rule: "0 0 15 10 *",
    weight: 2,
    days_before_deadline: 7,
    period: "toussaint",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "social",
    subcategory: "fete",
    title: "Fête de l'école",
    description: "Participer à l'organisation de la fête de fin d'année.",
    cron_rule: "0 0 1 6 *",
    weight: 4,
    days_before_deadline: 14,
    period: "ete",
  },

  // === SANTÉ ===
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "sante",
    subcategory: "bilan",
    title: "Visite médicale annuelle",
    description: "Bilan de santé annuel chez le médecin traitant ou pédiatre.",
    cron_rule: "@yearly",
    weight: 4,
    days_before_deadline: 30,
    period: "year_round",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 6,
    category: "sante",
    subcategory: "dentiste",
    title: "Visite dentiste semestrielle",
    description: "Contrôle dentaire tous les 6 mois pour prévention caries.",
    cron_rule: "0 0 1 */6 *",
    weight: 3,
    days_before_deadline: 14,
    period: "year_round",
  },
]

// =============================================================================
// 6-11 ANS: PRIMAIRE
// =============================================================================

export const templates_6_11: TaskTemplateCreate[] = [
  // === INSCRIPTION CP ===
  {
    country: "FR",
    age_min: 6,
    age_max: 6,
    category: "ecole",
    subcategory: "inscription",
    title: "Inscription CP",
    description:
      "Inscription au CP en mairie. Documents: certificat de radiation maternelle si changement d'école.",
    cron_rule: "0 0 1 4 *",
    weight: 6,
    days_before_deadline: 60,
    period: "printemps",
  },

  // === FOURNITURES & ASSURANCE ===
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "ecole",
    subcategory: "inscription",
    title: "Assurance scolaire",
    description: "Souscrire ou renouveler l'assurance scolaire pour l'année.",
    cron_rule: "0 0 15 8 *",
    weight: 4,
    days_before_deadline: 14,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "ecole",
    subcategory: "fournitures",
    title: "Fournitures scolaires primaire",
    description: "Acheter les fournitures de la liste: cahiers, crayons, classeurs, trousse...",
    cron_rule: "0 0 20 8 *",
    weight: 4,
    days_before_deadline: 10,
    period: "rentree",
  },

  // === CANTINE & GARDERIE ===
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "ecole",
    subcategory: "cantine",
    title: "Inscription cantine",
    description: "Inscrire l'enfant à la cantine scolaire pour l'année.",
    cron_rule: "0 0 1 6 *",
    weight: 3,
    days_before_deadline: 30,
    period: "ete",
  },
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "ecole",
    subcategory: "garderie",
    title: "Inscription étude/garderie",
    description: "Inscrire l'enfant à l'étude ou garderie périscolaire.",
    cron_rule: "0 0 1 6 *",
    weight: 3,
    days_before_deadline: 30,
    period: "ete",
  },

  // === RÉUNIONS ===
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "ecole",
    subcategory: "reunion",
    title: "Réunion de rentrée primaire",
    description: "Assister à la réunion de rentrée avec l'enseignant(e).",
    cron_rule: "0 0 10 9 *",
    weight: 4,
    days_before_deadline: 7,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "ecole",
    subcategory: "reunion",
    title: "Réunion parents-enseignants décembre",
    description: "RDV individuel pour bilan premier trimestre.",
    cron_rule: "0 0 10 12 *",
    weight: 4,
    days_before_deadline: 7,
    period: "noel",
  },
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "ecole",
    subcategory: "reunion",
    title: "Réunion parents-enseignants mars",
    description: "RDV individuel pour bilan deuxième trimestre.",
    cron_rule: "0 0 15 3 *",
    weight: 4,
    days_before_deadline: 7,
    period: "printemps",
  },

  // === SORTIES ===
  {
    country: "FR",
    age_min: 8,
    age_max: 11,
    category: "ecole",
    subcategory: "sortie",
    title: "Classe verte / Classe de neige",
    description: "Préparer le dossier et le trousseau pour la classe de découverte.",
    cron_rule: null,
    weight: 6,
    days_before_deadline: 30,
    period: null,
  },

  // === VACCIN ===
  {
    country: "FR",
    age_min: 6,
    age_max: 6,
    category: "sante",
    subcategory: "vaccin",
    title: "Rappel vaccin DTP - 6 ans",
    description: "Rappel obligatoire du vaccin DTP (Diphtérie, Tétanos, Polio).",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 30,
    period: null,
  },
  {
    country: "FR",
    age_min: 6,
    age_max: 6,
    category: "sante",
    subcategory: "bilan",
    title: "Examen M'T Dents - 6 ans",
    description: "Examen bucco-dentaire gratuit de l'Assurance Maladie.",
    cron_rule: null,
    weight: 3,
    days_before_deadline: 30,
    period: null,
  },
  {
    country: "FR",
    age_min: 9,
    age_max: 9,
    category: "sante",
    subcategory: "bilan",
    title: "Examen M'T Dents - 9 ans",
    description: "Examen bucco-dentaire gratuit de l'Assurance Maladie.",
    cron_rule: null,
    weight: 3,
    days_before_deadline: 30,
    period: null,
  },

  // === ADMINISTRATIF ===
  {
    country: "FR",
    age_min: 6,
    age_max: 11,
    category: "administratif",
    subcategory: "caf",
    title: "Allocation rentrée scolaire (ARS)",
    description:
      "Vérifier l'éligibilité et le versement de l'ARS (sous conditions de ressources).",
    cron_rule: "0 0 1 8 *",
    weight: 3,
    days_before_deadline: 14,
    period: "rentree",
  },
]

// =============================================================================
// 11-15 ANS: COLLÈGE
// =============================================================================

export const templates_11_15: TaskTemplateCreate[] = [
  // === INSCRIPTION ===
  {
    country: "FR",
    age_min: 11,
    age_max: 11,
    category: "ecole",
    subcategory: "inscription",
    title: "Inscription collège 6ème",
    description: "Dossier d'inscription au collège. Validation affectation, choix options (LV2, etc.).",
    cron_rule: "0 0 1 6 *",
    weight: 7,
    days_before_deadline: 30,
    period: "ete",
  },
  {
    country: "FR",
    age_min: 11,
    age_max: 15,
    category: "ecole",
    subcategory: "inscription",
    title: "Assurance scolaire collège",
    description: "Souscrire ou renouveler l'assurance scolaire.",
    cron_rule: "0 0 20 8 *",
    weight: 4,
    days_before_deadline: 14,
    period: "rentree",
  },

  // === FOURNITURES ===
  {
    country: "FR",
    age_min: 11,
    age_max: 15,
    category: "ecole",
    subcategory: "fournitures",
    title: "Fournitures scolaires collège",
    description: "Acheter les fournitures selon la liste: agenda, classeurs, copies, calculatrice...",
    cron_rule: "0 0 20 8 *",
    weight: 4,
    days_before_deadline: 10,
    period: "rentree",
  },

  // === CANTINE ===
  {
    country: "FR",
    age_min: 11,
    age_max: 15,
    category: "ecole",
    subcategory: "cantine",
    title: "Inscription demi-pension collège",
    description: "Inscrire l'enfant à la demi-pension pour l'année.",
    cron_rule: "0 0 15 6 *",
    weight: 3,
    days_before_deadline: 30,
    period: "ete",
  },

  // === RÉUNIONS ===
  {
    country: "FR",
    age_min: 11,
    age_max: 15,
    category: "ecole",
    subcategory: "reunion",
    title: "Réunion de rentrée collège",
    description: "Assister à la réunion de rentrée avec le professeur principal.",
    cron_rule: "0 0 15 9 *",
    weight: 4,
    days_before_deadline: 7,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 11,
    age_max: 15,
    category: "ecole",
    subcategory: "reunion",
    title: "Conseils de classe - 1er trimestre",
    description: "Remise des bulletins et RDV parents-profs si besoin.",
    cron_rule: "0 0 10 12 *",
    weight: 3,
    days_before_deadline: 7,
    period: "noel",
  },
  {
    country: "FR",
    age_min: 11,
    age_max: 15,
    category: "ecole",
    subcategory: "reunion",
    title: "Conseils de classe - 2ème trimestre",
    description: "Remise des bulletins et orientation préparation.",
    cron_rule: "0 0 20 3 *",
    weight: 3,
    days_before_deadline: 7,
    period: "printemps",
  },

  // === ORIENTATION & BREVET ===
  {
    country: "FR",
    age_min: 14,
    age_max: 15,
    category: "ecole",
    subcategory: "orientation",
    title: "Stage d'observation 3ème",
    description: "Trouver un stage d'observation en entreprise (1 semaine).",
    cron_rule: "0 0 1 11 *",
    weight: 6,
    days_before_deadline: 60,
    period: "toussaint",
  },
  {
    country: "FR",
    age_min: 14,
    age_max: 15,
    category: "ecole",
    subcategory: "orientation",
    title: "Choix orientation fin 3ème",
    description: "Remplir la fiche de vœux d'orientation (2nde générale, pro, CAP...).",
    cron_rule: "0 0 1 3 *",
    weight: 8,
    days_before_deadline: 30,
    period: "printemps",
  },
  {
    country: "FR",
    age_min: 14,
    age_max: 15,
    category: "ecole",
    subcategory: "inscription",
    title: "Inscription Brevet DNB",
    description: "Vérifier l'inscription au Diplôme National du Brevet.",
    cron_rule: "0 0 1 10 *",
    weight: 5,
    days_before_deadline: 30,
    period: "toussaint",
  },
  {
    country: "FR",
    age_min: 14,
    age_max: 15,
    category: "ecole",
    subcategory: "inscription",
    title: "Révisions Brevet",
    description: "Organiser les révisions pour le Brevet (juin).",
    cron_rule: "0 0 1 5 *",
    weight: 5,
    days_before_deadline: 30,
    period: "printemps",
  },

  // === VACCIN ===
  {
    country: "FR",
    age_min: 11,
    age_max: 13,
    category: "sante",
    subcategory: "vaccin",
    title: "Rappel vaccin DTP Coqueluche - 11-13 ans",
    description: "Rappel du vaccin DTP et coqueluche à l'entrée au collège.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 30,
    period: null,
  },
  {
    country: "FR",
    age_min: 12,
    age_max: 12,
    category: "sante",
    subcategory: "bilan",
    title: "Examen M'T Dents - 12 ans",
    description: "Examen bucco-dentaire gratuit de l'Assurance Maladie.",
    cron_rule: null,
    weight: 3,
    days_before_deadline: 30,
    period: null,
  },

  // === ACTIVITÉS ADOS ===
  {
    country: "FR",
    age_min: 11,
    age_max: 15,
    category: "activites",
    subcategory: "inscription",
    title: "Inscription activités ados",
    description: "Réinscrire ou inscrire à de nouvelles activités adaptées aux ados.",
    cron_rule: "0 0 1 6 *",
    weight: 4,
    days_before_deadline: 30,
    period: "ete",
  },
]

// =============================================================================
// 15-18 ANS: LYCÉE
// =============================================================================

export const templates_15_18: TaskTemplateCreate[] = [
  // === INSCRIPTION LYCÉE ===
  {
    country: "FR",
    age_min: 15,
    age_max: 15,
    category: "ecole",
    subcategory: "inscription",
    title: "Inscription lycée 2nde",
    description: "Dossier d'inscription au lycée. Choix d'options (LV2, spécialités...).",
    cron_rule: "0 0 1 7 *",
    weight: 7,
    days_before_deadline: 30,
    period: "ete",
  },
  {
    country: "FR",
    age_min: 15,
    age_max: 18,
    category: "ecole",
    subcategory: "inscription",
    title: "Assurance scolaire lycée",
    description: "Souscrire ou renouveler l'assurance scolaire.",
    cron_rule: "0 0 20 8 *",
    weight: 4,
    days_before_deadline: 14,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 15,
    age_max: 18,
    category: "ecole",
    subcategory: "fournitures",
    title: "Fournitures scolaires lycée",
    description: "Acheter les fournitures et manuels scolaires.",
    cron_rule: "0 0 25 8 *",
    weight: 4,
    days_before_deadline: 7,
    period: "rentree",
  },

  // === SPÉCIALITÉS ===
  {
    country: "FR",
    age_min: 15,
    age_max: 16,
    category: "ecole",
    subcategory: "orientation",
    title: "Choix spécialités 1ère",
    description: "Choisir les 3 spécialités pour la classe de Première.",
    cron_rule: "0 0 1 2 *",
    weight: 8,
    days_before_deadline: 30,
    period: "hiver",
  },
  {
    country: "FR",
    age_min: 16,
    age_max: 17,
    category: "ecole",
    subcategory: "orientation",
    title: "Choix spécialités Terminale",
    description: "Choisir les 2 spécialités à conserver en Terminale.",
    cron_rule: "0 0 1 2 *",
    weight: 8,
    days_before_deadline: 30,
    period: "hiver",
  },

  // === PARCOURSUP & BAC ===
  {
    country: "FR",
    age_min: 17,
    age_max: 18,
    category: "ecole",
    subcategory: "orientation",
    title: "Inscription Parcoursup",
    description: "Créer le dossier Parcoursup et saisir les vœux d'orientation post-bac.",
    cron_rule: "0 0 15 1 *",
    weight: 9,
    days_before_deadline: 30,
    period: "hiver",
  },
  {
    country: "FR",
    age_min: 17,
    age_max: 18,
    category: "ecole",
    subcategory: "orientation",
    title: "Confirmation vœux Parcoursup",
    description: "Confirmer les vœux et finaliser le dossier Parcoursup.",
    cron_rule: "0 0 1 4 *",
    weight: 9,
    days_before_deadline: 14,
    period: "printemps",
  },
  {
    country: "FR",
    age_min: 17,
    age_max: 18,
    category: "ecole",
    subcategory: "inscription",
    title: "Révisions Baccalauréat",
    description: "Organiser les révisions pour le Bac (juin).",
    cron_rule: "0 0 1 5 *",
    weight: 6,
    days_before_deadline: 30,
    period: "printemps",
  },
  {
    country: "FR",
    age_min: 17,
    age_max: 18,
    category: "ecole",
    subcategory: "orientation",
    title: "Réponses Parcoursup",
    description: "Répondre aux propositions d'admission sur Parcoursup.",
    cron_rule: "0 0 1 6 *",
    weight: 9,
    days_before_deadline: 7,
    period: "ete",
  },

  // === PERMIS DE CONDUIRE ===
  {
    country: "FR",
    age_min: 15,
    age_max: 18,
    category: "logistique",
    subcategory: "transport",
    title: "Inscription conduite accompagnée (AAC)",
    description: "Inscrire l'enfant à l'auto-école pour la conduite accompagnée (dès 15 ans).",
    cron_rule: null,
    weight: 6,
    days_before_deadline: 30,
    period: null,
  },
  {
    country: "FR",
    age_min: 17,
    age_max: 18,
    category: "logistique",
    subcategory: "transport",
    title: "Inscription permis de conduire",
    description: "Inscrire l'enfant à l'auto-école pour le permis B classique.",
    cron_rule: null,
    weight: 6,
    days_before_deadline: 60,
    period: null,
  },
  {
    country: "FR",
    age_min: 14,
    age_max: 16,
    category: "logistique",
    subcategory: "transport",
    title: "Inscription BSR/AM (scooter)",
    description: "Inscrire l'enfant au BSR pour conduire un scooter 50cc.",
    cron_rule: null,
    weight: 4,
    days_before_deadline: 30,
    period: null,
  },

  // === ADMINISTRATIF ===
  {
    country: "FR",
    age_min: 16,
    age_max: 16,
    category: "administratif",
    subcategory: "papiers",
    title: "Recensement citoyen (JDC)",
    description:
      "Effectuer le recensement citoyen en mairie pour la Journée Défense et Citoyenneté.",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 30,
    period: null,
  },
  {
    country: "FR",
    age_min: 17,
    age_max: 18,
    category: "administratif",
    subcategory: "papiers",
    title: "Journée Défense et Citoyenneté (JDC)",
    description: "Participer à la JDC. Certificat nécessaire pour passer le permis et examens.",
    cron_rule: null,
    weight: 6,
    days_before_deadline: 60,
    period: null,
  },

  // === SANTÉ ===
  {
    country: "FR",
    age_min: 15,
    age_max: 15,
    category: "sante",
    subcategory: "bilan",
    title: "Examen M'T Dents - 15 ans",
    description: "Examen bucco-dentaire gratuit de l'Assurance Maladie.",
    cron_rule: null,
    weight: 3,
    days_before_deadline: 30,
    period: null,
  },
  {
    country: "FR",
    age_min: 18,
    age_max: 18,
    category: "sante",
    subcategory: "bilan",
    title: "Examen M'T Dents - 18 ans",
    description: "Examen bucco-dentaire gratuit de l'Assurance Maladie.",
    cron_rule: null,
    weight: 3,
    days_before_deadline: 30,
    period: null,
  },
]

// =============================================================================
// TEMPLATES COMMUNS À TOUS LES ÂGES
// =============================================================================

export const templates_common: TaskTemplateCreate[] = [
  // === CARTE D'IDENTITÉ / PASSEPORT ===
  {
    country: "FR",
    age_min: 0,
    age_max: 18,
    category: "administratif",
    subcategory: "papiers",
    title: "Renouvellement carte d'identité",
    description: "Renouveler la carte d'identité de l'enfant (validité 10 ans mineur).",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 60,
    period: null,
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 18,
    category: "administratif",
    subcategory: "passeport",
    title: "Demande/Renouvellement passeport",
    description: "Demander ou renouveler le passeport (validité 5 ans mineur).",
    cron_rule: null,
    weight: 5,
    days_before_deadline: 60,
    period: null,
  },

  // === IMPÔTS ===
  {
    country: "FR",
    age_min: 0,
    age_max: 18,
    category: "administratif",
    subcategory: "impots",
    title: "Déclaration impôts - Rattachement enfant",
    description: "Vérifier le rattachement fiscal de l'enfant sur la déclaration d'impôts.",
    cron_rule: "0 0 1 4 *",
    weight: 4,
    days_before_deadline: 60,
    period: "printemps",
  },

  // === VÊTEMENTS ===
  {
    country: "FR",
    age_min: 3,
    age_max: 18,
    category: "quotidien",
    subcategory: "vetements",
    title: "Tri vêtements saison",
    description: "Trier les vêtements trop petits et préparer les vêtements de saison.",
    cron_rule: "0 0 1 */3 *",
    weight: 3,
    days_before_deadline: 7,
    period: "year_round",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 18,
    category: "quotidien",
    subcategory: "vetements",
    title: "Chaussures rentrée",
    description: "Vérifier la pointure et acheter des chaussures pour la rentrée.",
    cron_rule: "0 0 15 8 *",
    weight: 3,
    days_before_deadline: 14,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 18,
    category: "quotidien",
    subcategory: "vetements",
    title: "Manteau hiver",
    description: "Vérifier et acheter le manteau d'hiver.",
    cron_rule: "0 0 1 10 *",
    weight: 3,
    days_before_deadline: 14,
    period: "toussaint",
  },

  // === ACTIVITÉS ===
  {
    country: "FR",
    age_min: 3,
    age_max: 18,
    category: "activites",
    subcategory: "inscription",
    title: "Réinscription activités extra-scolaires",
    description: "Réinscrire l'enfant aux activités (sport, musique, art...) pour l'année suivante.",
    cron_rule: "0 0 1 6 *",
    weight: 4,
    days_before_deadline: 30,
    period: "ete",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 18,
    category: "activites",
    subcategory: "inscription",
    title: "Inscription centre aéré / colonies",
    description: "Inscrire l'enfant au centre aéré ou colonies de vacances d'été.",
    cron_rule: "0 0 1 4 *",
    weight: 5,
    days_before_deadline: 60,
    period: "printemps",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 18,
    category: "activites",
    subcategory: "equipement",
    title: "Certificat médical sport",
    description: "Obtenir un certificat médical pour la pratique sportive.",
    cron_rule: "0 0 1 9 *",
    weight: 3,
    days_before_deadline: 14,
    period: "rentree",
  },
  {
    country: "FR",
    age_min: 3,
    age_max: 18,
    category: "activites",
    subcategory: "equipement",
    title: "Équipement sportif rentrée",
    description: "Vérifier et renouveler l'équipement sportif (tenue, chaussures...).",
    cron_rule: "0 0 15 8 *",
    weight: 3,
    days_before_deadline: 14,
    period: "rentree",
  },

  // === SOCIAL ===
  {
    country: "FR",
    age_min: 3,
    age_max: 12,
    category: "social",
    subcategory: "anniversaire",
    title: "Organisation anniversaire",
    description: "Organiser la fête d'anniversaire: invitations, gâteau, activités, cadeaux.",
    cron_rule: null,
    weight: 7,
    days_before_deadline: 21,
    period: null,
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 18,
    category: "social",
    subcategory: "cadeau",
    title: "Liste cadeaux Noël",
    description: "Préparer la liste de cadeaux de Noël avec l'enfant.",
    cron_rule: "0 0 15 11 *",
    weight: 4,
    days_before_deadline: 30,
    period: "noel",
  },
  {
    country: "FR",
    age_min: 0,
    age_max: 18,
    category: "social",
    subcategory: "cadeau",
    title: "Achats cadeaux Noël",
    description: "Acheter les cadeaux de Noël.",
    cron_rule: "0 0 1 12 *",
    weight: 5,
    days_before_deadline: 21,
    period: "noel",
  },
]

// =============================================================================
// EXPORT: TEMPLATES PAR GROUPE D'ÂGE
// =============================================================================

export const templatesByAgeGroup: TemplatesByAgeGroup[] = [
  {
    config: AGE_GROUPS[0]!,
    templates: templates_0_3,
  },
  {
    config: AGE_GROUPS[1]!,
    templates: templates_3_6,
  },
  {
    config: AGE_GROUPS[2]!,
    templates: templates_6_11,
  },
  {
    config: AGE_GROUPS[3]!,
    templates: templates_11_15,
  },
  {
    config: AGE_GROUPS[4]!,
    templates: templates_15_18,
  },
]

// =============================================================================
// EXPORT: ALL TEMPLATES
// =============================================================================

export const allAgeBasedTemplates: TaskTemplateCreate[] = [
  ...templates_0_3,
  ...templates_3_6,
  ...templates_6_11,
  ...templates_11_15,
  ...templates_15_18,
  ...templates_common,
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get templates for a specific age group
 */
export function getTemplatesForAgeGroup(
  ageGroupCode: "0-3" | "3-6" | "6-11" | "11-15" | "15-18"
): TaskTemplateCreate[] {
  const group = templatesByAgeGroup.find((g) => g.config.code === ageGroupCode)
  if (!group) return []

  // Return age-specific templates + common templates that apply
  const [minStr, maxStr] = ageGroupCode.split("-")
  const min = parseInt(minStr ?? "0", 10)
  const max = parseInt(maxStr ?? "18", 10)

  const commonApplicable = templates_common.filter(
    (t) => t.age_min <= max && t.age_max >= min
  )

  return [...group.templates, ...commonApplicable]
}

/**
 * Get template count summary
 */
export function getTemplateCountSummary(): {
  total: number
  byAgeGroup: Record<string, number>
  byCategory: Record<string, number>
} {
  const byAgeGroup: Record<string, number> = {}
  const byCategory: Record<string, number> = {}

  for (const group of templatesByAgeGroup) {
    byAgeGroup[group.config.code] = group.templates.length
  }
  byAgeGroup["common"] = templates_common.length

  for (const template of allAgeBasedTemplates) {
    const category = template.category
    byCategory[category] = (byCategory[category] ?? 0) + 1
  }

  return {
    total: allAgeBasedTemplates.length,
    byAgeGroup,
    byCategory,
  }
}

/**
 * Get high-priority templates (weight >= 7)
 */
export function getHighPriorityTemplates(): TaskTemplateCreate[] {
  return allAgeBasedTemplates.filter((t) => (t.weight ?? 3) >= 7)
}
