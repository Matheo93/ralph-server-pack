/**
 * Task Templates Catalog
 *
 * Pre-defined task templates organized by category, age range, and period.
 * Contains hundreds of common parental tasks.
 */

import { TaskTemplate, TaskCategory, AgeRange, Period } from "./types"
import { v4 as uuidv4 } from "uuid"

// =============================================================================
// TEMPLATE BUILDER HELPER
// =============================================================================

interface TemplateInput {
  title: string
  description?: string
  category: TaskCategory
  ageRanges: AgeRange[]
  periods: Period[]
  recurrence: TaskTemplate["recurrence"]
  weight: number
  estimatedMinutes?: number
  suggestedPriority?: number
  tags?: string[]
  critical?: boolean
}

function createTemplate(input: TemplateInput): TaskTemplate {
  return {
    id: uuidv4(),
    title: input.title,
    description: input.description,
    category: input.category,
    ageRanges: input.ageRanges,
    periods: input.periods,
    recurrence: input.recurrence,
    weight: input.weight,
    estimatedMinutes: input.estimatedMinutes,
    suggestedPriority: input.suggestedPriority ?? 2,
    tags: input.tags,
    critical: input.critical ?? false,
  }
}

// =============================================================================
// ÉCOLE TEMPLATES
// =============================================================================

const ecoleTemplates: TaskTemplate[] = [
  // Rentrée
  createTemplate({
    title: "Acheter les fournitures scolaires",
    description: "Liste des fournitures pour la rentrée",
    category: "ecole",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 4,
    estimatedMinutes: 120,
    suggestedPriority: 1,
    tags: ["fournitures", "courses", "rentrée"],
    critical: true,
  }),
  createTemplate({
    title: "Inscription cantine",
    description: "Inscrire l'enfant à la cantine scolaire",
    category: "ecole",
    ageRanges: ["3-6", "6-11", "11-15"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["cantine", "inscription"],
    critical: true,
  }),
  createTemplate({
    title: "Inscription périscolaire",
    description: "Inscrire aux activités périscolaires (garderie, étude)",
    category: "ecole",
    ageRanges: ["3-6", "6-11"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["périscolaire", "garderie"],
  }),
  createTemplate({
    title: "Préparer le cartable",
    description: "Vérifier que le cartable est prêt pour le lendemain",
    category: "ecole",
    ageRanges: ["3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "daily",
    weight: 1,
    estimatedMinutes: 10,
    tags: ["cartable", "quotidien"],
  }),
  createTemplate({
    title: "Signer le carnet de liaison",
    description: "Vérifier et signer les mots dans le carnet",
    category: "ecole",
    ageRanges: ["3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 1,
    estimatedMinutes: 5,
    tags: ["carnet", "signature"],
  }),
  createTemplate({
    title: "Réunion parents-professeurs",
    description: "Assister à la réunion de rentrée",
    category: "ecole",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["septembre", "octobre"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 120,
    tags: ["réunion", "professeurs"],
  }),
  createTemplate({
    title: "Aide aux devoirs",
    description: "Accompagner l'enfant dans ses devoirs",
    category: "ecole",
    ageRanges: ["6-11", "11-15"],
    periods: ["tout"],
    recurrence: "daily",
    weight: 2,
    estimatedMinutes: 45,
    tags: ["devoirs", "soutien"],
  }),
  createTemplate({
    title: "Préparer le déguisement carnaval",
    description: "Créer ou acheter un déguisement pour le carnaval de l'école",
    category: "ecole",
    ageRanges: ["3-6", "6-11"],
    periods: ["fevrier", "mars"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 60,
    tags: ["carnaval", "déguisement"],
  }),
  createTemplate({
    title: "Photo de classe",
    description: "Préparer l'enfant pour la photo de classe",
    category: "ecole",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["septembre", "octobre"],
    recurrence: "yearly",
    weight: 1,
    estimatedMinutes: 15,
    tags: ["photo", "classe"],
  }),
  createTemplate({
    title: "Kermesse / Fête de l'école",
    description: "Participer ou préparer la fête de fin d'année",
    category: "ecole",
    ageRanges: ["3-6", "6-11"],
    periods: ["juin"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 180,
    tags: ["kermesse", "fête"],
  }),

  // Orientation
  createTemplate({
    title: "Choix d'orientation",
    description: "Accompagner dans les choix d'orientation (Parcoursup, etc.)",
    category: "ecole",
    ageRanges: ["11-15", "15-18"],
    periods: ["janvier", "fevrier", "mars"],
    recurrence: "yearly",
    weight: 5,
    estimatedMinutes: 240,
    suggestedPriority: 1,
    tags: ["orientation", "parcoursup"],
    critical: true,
  }),
]

// =============================================================================
// SANTÉ TEMPLATES
// =============================================================================

const santeTemplates: TaskTemplate[] = [
  createTemplate({
    title: "Rendez-vous pédiatre",
    description: "Visite de contrôle annuelle",
    category: "sante",
    ageRanges: ["0-3", "3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 90,
    tags: ["médecin", "pédiatre", "visite"],
    critical: true,
  }),
  createTemplate({
    title: "Vaccins obligatoires",
    description: "Mise à jour du carnet de vaccination",
    category: "sante",
    ageRanges: ["0-3", "3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 60,
    tags: ["vaccin", "vaccination"],
    critical: true,
  }),
  createTemplate({
    title: "Rendez-vous dentiste",
    description: "Contrôle dentaire annuel",
    category: "sante",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 60,
    tags: ["dentiste", "dents"],
  }),
  createTemplate({
    title: "Rendez-vous ophtalmo",
    description: "Contrôle de la vue",
    category: "sante",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 60,
    tags: ["ophtalmo", "yeux", "vue"],
  }),
  createTemplate({
    title: "Renouveler ordonnance",
    description: "Renouveler les médicaments réguliers",
    category: "sante",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["ordonnance", "médicaments"],
  }),
  createTemplate({
    title: "Pharmacie de secours",
    description: "Vérifier et renouveler la pharmacie familiale",
    category: "sante",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 1,
    estimatedMinutes: 20,
    tags: ["pharmacie", "médicaments"],
  }),
  createTemplate({
    title: "Certificat médical sport",
    description: "Obtenir le certificat médical pour les activités sportives",
    category: "sante",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 60,
    tags: ["certificat", "sport"],
  }),
  createTemplate({
    title: "Visite PMI",
    description: "Rendez-vous à la Protection Maternelle Infantile",
    category: "sante",
    ageRanges: ["0-3"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 2,
    estimatedMinutes: 90,
    tags: ["PMI", "nourrisson"],
  }),
  createTemplate({
    title: "Orthodontiste",
    description: "Rendez-vous de suivi orthodontique",
    category: "sante",
    ageRanges: ["6-11", "11-15"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 2,
    estimatedMinutes: 60,
    tags: ["orthodontiste", "appareil"],
  }),
]

// =============================================================================
// ADMINISTRATIF TEMPLATES
// =============================================================================

const administratifTemplates: TaskTemplate[] = [
  createTemplate({
    title: "Mettre à jour la CAF",
    description: "Déclarer les changements de situation à la CAF",
    category: "administratif",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 30,
    tags: ["CAF", "allocations"],
  }),
  createTemplate({
    title: "Déclaration revenus",
    description: "Inclure les revenus/charges liés aux enfants",
    category: "administratif",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["avril", "mai", "juin"],
    recurrence: "yearly",
    weight: 4,
    estimatedMinutes: 60,
    tags: ["impôts", "déclaration"],
    critical: true,
  }),
  createTemplate({
    title: "Renouveler passeport enfant",
    description: "Faire ou renouveler le passeport",
    category: "administratif",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "once",
    weight: 4,
    estimatedMinutes: 120,
    tags: ["passeport", "identité"],
  }),
  createTemplate({
    title: "Renouveler carte d'identité",
    description: "Faire ou renouveler la carte d'identité",
    category: "administratif",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "once",
    weight: 3,
    estimatedMinutes: 90,
    tags: ["identité", "carte"],
  }),
  createTemplate({
    title: "Assurance scolaire",
    description: "Souscrire ou renouveler l'assurance scolaire",
    category: "administratif",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["assurance", "école"],
    critical: true,
  }),
  createTemplate({
    title: "Mutuelle santé",
    description: "Vérifier/mettre à jour la couverture mutuelle",
    category: "administratif",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "yearly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["mutuelle", "assurance"],
  }),
  createTemplate({
    title: "Inscription crèche",
    description: "Inscrire l'enfant à la crèche",
    category: "administratif",
    ageRanges: ["0-3"],
    periods: ["tout"],
    recurrence: "once",
    weight: 5,
    estimatedMinutes: 120,
    suggestedPriority: 1,
    tags: ["crèche", "garde"],
    critical: true,
  }),
]

// =============================================================================
// QUOTIDIEN TEMPLATES
// =============================================================================

const quotidienTemplates: TaskTemplate[] = [
  createTemplate({
    title: "Préparer les repas",
    description: "Planifier et préparer les repas de la semaine",
    category: "quotidien",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "daily",
    weight: 3,
    estimatedMinutes: 60,
    tags: ["repas", "cuisine"],
  }),
  createTemplate({
    title: "Faire les courses alimentaires",
    description: "Courses pour la semaine",
    category: "quotidien",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 3,
    estimatedMinutes: 90,
    tags: ["courses", "alimentation"],
  }),
  createTemplate({
    title: "Lessive vêtements enfants",
    description: "Laver, sécher et ranger le linge",
    category: "quotidien",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 2,
    estimatedMinutes: 45,
    tags: ["lessive", "linge"],
  }),
  createTemplate({
    title: "Acheter des vêtements",
    description: "Renouveler la garde-robe (taille, saison)",
    category: "quotidien",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "seasonal",
    weight: 3,
    estimatedMinutes: 120,
    tags: ["vêtements", "shopping"],
  }),
  createTemplate({
    title: "Acheter des couches",
    description: "Stock de couches et produits bébé",
    category: "quotidien",
    ageRanges: ["0-3"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["couches", "bébé"],
  }),
  createTemplate({
    title: "Bain / Toilette",
    description: "Routine d'hygiène quotidienne",
    category: "quotidien",
    ageRanges: ["0-3", "3-6"],
    periods: ["tout"],
    recurrence: "daily",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["bain", "hygiène"],
  }),
  createTemplate({
    title: "Ranger la chambre",
    description: "Aider l'enfant à ranger sa chambre",
    category: "quotidien",
    ageRanges: ["3-6", "6-11"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 1,
    estimatedMinutes: 30,
    tags: ["rangement", "chambre"],
  }),
  createTemplate({
    title: "Couper les cheveux",
    description: "Rendez-vous coiffeur ou coupe maison",
    category: "quotidien",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 1,
    estimatedMinutes: 45,
    tags: ["coiffeur", "cheveux"],
  }),
]

// =============================================================================
// SOCIAL TEMPLATES
// =============================================================================

const socialTemplates: TaskTemplate[] = [
  createTemplate({
    title: "Organiser l'anniversaire",
    description: "Planifier et organiser la fête d'anniversaire",
    category: "social",
    ageRanges: ["3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "yearly",
    weight: 5,
    estimatedMinutes: 300,
    tags: ["anniversaire", "fête"],
  }),
  createTemplate({
    title: "Acheter un cadeau d'anniversaire",
    description: "Cadeau pour un copain/copine",
    category: "social",
    ageRanges: ["3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 2,
    estimatedMinutes: 45,
    tags: ["cadeau", "anniversaire"],
  }),
  createTemplate({
    title: "Organiser une soirée pyjama",
    description: "Inviter des amis à dormir",
    category: "social",
    ageRanges: ["6-11", "11-15"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 3,
    estimatedMinutes: 180,
    tags: ["soirée", "amis"],
  }),
  createTemplate({
    title: "Playdates / Goûter chez un ami",
    description: "Organiser ou accompagner à un goûter",
    category: "social",
    ageRanges: ["3-6", "6-11"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 2,
    estimatedMinutes: 120,
    tags: ["goûter", "amis"],
  }),
  createTemplate({
    title: "Cadeaux de Noël",
    description: "Acheter les cadeaux de Noël",
    category: "social",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["novembre", "decembre", "vacances_noel"],
    recurrence: "yearly",
    weight: 4,
    estimatedMinutes: 180,
    tags: ["Noël", "cadeaux"],
  }),
  createTemplate({
    title: "Lettre au Père Noël",
    description: "Aider à rédiger la lettre au Père Noël",
    category: "social",
    ageRanges: ["3-6", "6-11"],
    periods: ["novembre", "decembre"],
    recurrence: "yearly",
    weight: 1,
    estimatedMinutes: 30,
    tags: ["Noël", "lettre"],
  }),
]

// =============================================================================
// ACTIVITÉS TEMPLATES
// =============================================================================

const activitesTemplates: TaskTemplate[] = [
  createTemplate({
    title: "Inscription activité sportive",
    description: "Inscrire à un sport (foot, danse, judo...)",
    category: "activites",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 60,
    tags: ["sport", "inscription"],
  }),
  createTemplate({
    title: "Inscription activité musicale",
    description: "Inscrire à un cours de musique",
    category: "activites",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 60,
    tags: ["musique", "inscription"],
  }),
  createTemplate({
    title: "Acheter équipement sport",
    description: "Acheter ou renouveler l'équipement sportif",
    category: "activites",
    ageRanges: ["3-6", "6-11", "11-15", "15-18"],
    periods: ["aout", "rentree"],
    recurrence: "yearly",
    weight: 3,
    estimatedMinutes: 90,
    tags: ["sport", "équipement"],
  }),
  createTemplate({
    title: "Accompagner au sport",
    description: "Emmener et récupérer de l'activité sportive",
    category: "activites",
    ageRanges: ["3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 2,
    estimatedMinutes: 60,
    tags: ["sport", "transport"],
  }),
  createTemplate({
    title: "Inscription centre aéré",
    description: "Inscrire au centre de loisirs pour les vacances",
    category: "activites",
    ageRanges: ["3-6", "6-11"],
    periods: ["tout"],
    recurrence: "seasonal",
    weight: 3,
    estimatedMinutes: 45,
    tags: ["centre aéré", "vacances"],
  }),
  createTemplate({
    title: "Inscription colonie de vacances",
    description: "Inscrire en colonie ou camp de vacances",
    category: "activites",
    ageRanges: ["6-11", "11-15"],
    periods: ["mars", "avril", "mai"],
    recurrence: "yearly",
    weight: 4,
    estimatedMinutes: 90,
    tags: ["colonie", "vacances"],
  }),
]

// =============================================================================
// LOGISTIQUE TEMPLATES
// =============================================================================

const logistiqueTemplates: TaskTemplate[] = [
  createTemplate({
    title: "Emmener à l'école",
    description: "Trajet quotidien école",
    category: "logistique",
    ageRanges: ["3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "daily",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["école", "transport"],
  }),
  createTemplate({
    title: "Récupérer à l'école",
    description: "Trajet quotidien retour école",
    category: "logistique",
    ageRanges: ["3-6", "6-11"],
    periods: ["tout"],
    recurrence: "daily",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["école", "transport"],
  }),
  createTemplate({
    title: "Organiser le covoiturage",
    description: "Coordonner avec d'autres parents",
    category: "logistique",
    ageRanges: ["6-11", "11-15"],
    periods: ["tout"],
    recurrence: "weekly",
    weight: 2,
    estimatedMinutes: 15,
    tags: ["covoiturage", "organisation"],
  }),
  createTemplate({
    title: "Réserver baby-sitter",
    description: "Trouver et réserver une baby-sitter",
    category: "logistique",
    ageRanges: ["0-3", "3-6", "6-11"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["baby-sitter", "garde"],
  }),
  createTemplate({
    title: "Organiser les vacances",
    description: "Planifier les vacances en famille",
    category: "logistique",
    ageRanges: ["0-3", "3-6", "6-11", "11-15", "15-18"],
    periods: ["tout"],
    recurrence: "seasonal",
    weight: 5,
    estimatedMinutes: 300,
    tags: ["vacances", "voyage"],
  }),
  createTemplate({
    title: "Préparer la valise",
    description: "Faire les valises avant un voyage",
    category: "logistique",
    ageRanges: ["0-3", "3-6", "6-11", "11-15"],
    periods: ["tout"],
    recurrence: "seasonal",
    weight: 2,
    estimatedMinutes: 60,
    tags: ["valise", "voyage"],
  }),
  createTemplate({
    title: "Rendez-vous nounou",
    description: "Entretien avec la nounou/assistante maternelle",
    category: "logistique",
    ageRanges: ["0-3"],
    periods: ["tout"],
    recurrence: "monthly",
    weight: 2,
    estimatedMinutes: 30,
    tags: ["nounou", "garde"],
  }),
]

// =============================================================================
// ALL TEMPLATES
// =============================================================================

export const ALL_TEMPLATES: TaskTemplate[] = [
  ...ecoleTemplates,
  ...santeTemplates,
  ...administratifTemplates,
  ...quotidienTemplates,
  ...socialTemplates,
  ...activitesTemplates,
  ...logistiqueTemplates,
]

// =============================================================================
// TEMPLATE ACCESS FUNCTIONS
// =============================================================================

/**
 * Get all templates
 */
export function getTemplates(): TaskTemplate[] {
  return ALL_TEMPLATES
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): TaskTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TaskCategory): TaskTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get templates by age range
 */
export function getTemplatesByAgeRange(ageRange: AgeRange): TaskTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.ageRanges.includes(ageRange))
}

/**
 * Get templates by period
 */
export function getTemplatesByPeriod(period: Period): TaskTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.periods.includes(period) || t.periods.includes("tout"))
}

/**
 * Search templates by text
 */
export function searchTemplates(query: string): TaskTemplate[] {
  const lower = query.toLowerCase()
  return ALL_TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.description?.toLowerCase().includes(lower) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(lower))
  )
}

/**
 * Get critical templates
 */
export function getCriticalTemplates(): TaskTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.critical)
}

/**
 * Get template count by category
 */
export function getTemplateCounts(): Record<TaskCategory, number> {
  const counts: Record<TaskCategory, number> = {
    ecole: 0,
    sante: 0,
    administratif: 0,
    quotidien: 0,
    social: 0,
    activites: 0,
    logistique: 0,
    autre: 0,
  }

  for (const template of ALL_TEMPLATES) {
    counts[template.category]++
  }

  return counts
}
