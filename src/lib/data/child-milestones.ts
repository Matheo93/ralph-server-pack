/**
 * Child Development Milestones
 *
 * French child development milestones organized by age and category.
 * Used for proactive reminders and celebration tracking.
 */

export type MilestoneCategory =
  | "moteur" // Motor development
  | "langage" // Language development
  | "social" // Social/emotional development
  | "cognitif" // Cognitive development
  | "ecole" // School milestones
  | "sante" // Health checkups
  | "celebration" // Birthdays and celebrations

export interface Milestone {
  id: string
  title: string
  description: string
  category: MilestoneCategory
  ageMonths: number // Age in months when typically occurs
  ageRange?: { min: number; max: number } // Range if not fixed
  icon: string // Lucide icon name
  isRecurring?: boolean // For things like birthdays
  reminderDaysBefore?: number // Days before to send reminder
  celebrationType?: "birthday" | "achievement" | "school" | "health"
}

export interface MilestoneCategoryInfo {
  label: string
  color: string
  icon: string
}

export const milestoneCategories: Record<MilestoneCategory, { label: string; color: string; icon: string }> = {
  moteur: {
    label: "Développement moteur",
    color: "#22c55e", // green
    icon: "Baby",
  },
  langage: {
    label: "Langage",
    color: "#3b82f6", // blue
    icon: "MessageCircle",
  },
  social: {
    label: "Social & émotionnel",
    color: "#ec4899", // pink
    icon: "Heart",
  },
  cognitif: {
    label: "Cognitif",
    color: "#8b5cf6", // purple
    icon: "Brain",
  },
  ecole: {
    label: "École",
    color: "#f59e0b", // amber
    icon: "GraduationCap",
  },
  sante: {
    label: "Santé",
    color: "#ef4444", // red
    icon: "Stethoscope",
  },
  celebration: {
    label: "Célébrations",
    color: "#06b6d4", // cyan
    icon: "PartyPopper",
  },
}

/**
 * Child development milestones in French
 * Organized chronologically by typical age
 */
export const childMilestones: Milestone[] = [
  // === BIRTHDAYS (recurring) ===
  {
    id: "birthday-1",
    title: "Premier anniversaire",
    description: "Le premier anniversaire de votre enfant - une grande étape !",
    category: "celebration",
    ageMonths: 12,
    icon: "Cake",
    isRecurring: false,
    reminderDaysBefore: 14,
    celebrationType: "birthday",
  },
  {
    id: "birthday-2",
    title: "2ème anniversaire",
    description: "Déjà 2 ans !",
    category: "celebration",
    ageMonths: 24,
    icon: "Cake",
    reminderDaysBefore: 14,
    celebrationType: "birthday",
  },
  {
    id: "birthday-3",
    title: "3ème anniversaire",
    description: "3 ans - peut-être l'entrée en maternelle bientôt !",
    category: "celebration",
    ageMonths: 36,
    icon: "Cake",
    reminderDaysBefore: 14,
    celebrationType: "birthday",
  },
  {
    id: "birthday-4",
    title: "4ème anniversaire",
    description: "4 ans",
    category: "celebration",
    ageMonths: 48,
    icon: "Cake",
    reminderDaysBefore: 14,
    celebrationType: "birthday",
  },
  {
    id: "birthday-5",
    title: "5ème anniversaire",
    description: "5 ans - dernière année de maternelle !",
    category: "celebration",
    ageMonths: 60,
    icon: "Cake",
    reminderDaysBefore: 14,
    celebrationType: "birthday",
  },
  {
    id: "birthday-6",
    title: "6ème anniversaire",
    description: "6 ans - entrée au CP !",
    category: "celebration",
    ageMonths: 72,
    icon: "Cake",
    reminderDaysBefore: 14,
    celebrationType: "birthday",
  },

  // === MOTOR MILESTONES ===
  {
    id: "motor-head-control",
    title: "Tient sa tête",
    description: "Votre bébé peut maintenir sa tête droite lorsqu'il est tenu assis",
    category: "moteur",
    ageMonths: 3,
    ageRange: { min: 2, max: 4 },
    icon: "Baby",
    celebrationType: "achievement",
  },
  {
    id: "motor-roll-over",
    title: "Se retourne",
    description: "Peut se retourner du dos sur le ventre et vice versa",
    category: "moteur",
    ageMonths: 5,
    ageRange: { min: 4, max: 6 },
    icon: "RotateCcw",
    celebrationType: "achievement",
  },
  {
    id: "motor-sit",
    title: "S'assoit seul",
    description: "Peut s'asseoir sans soutien pendant plusieurs minutes",
    category: "moteur",
    ageMonths: 7,
    ageRange: { min: 5, max: 9 },
    icon: "Armchair",
    celebrationType: "achievement",
  },
  {
    id: "motor-crawl",
    title: "Rampe / 4 pattes",
    description: "Se déplace en rampant ou à quatre pattes",
    category: "moteur",
    ageMonths: 9,
    ageRange: { min: 6, max: 10 },
    icon: "Footprints",
    celebrationType: "achievement",
  },
  {
    id: "motor-stand",
    title: "Se met debout",
    description: "Se met debout en s'appuyant sur un meuble",
    category: "moteur",
    ageMonths: 10,
    ageRange: { min: 8, max: 12 },
    icon: "PersonStanding",
    celebrationType: "achievement",
  },
  {
    id: "motor-first-steps",
    title: "Premiers pas",
    description: "Fait ses premiers pas seul - une étape majeure !",
    category: "moteur",
    ageMonths: 12,
    ageRange: { min: 9, max: 15 },
    icon: "Footprints",
    reminderDaysBefore: 0,
    celebrationType: "achievement",
  },
  {
    id: "motor-walk-well",
    title: "Marche bien",
    description: "Marche avec assurance et stabilité",
    category: "moteur",
    ageMonths: 15,
    ageRange: { min: 12, max: 18 },
    icon: "Footprints",
    celebrationType: "achievement",
  },
  {
    id: "motor-run",
    title: "Court",
    description: "Peut courir (même si de façon maladroite au début)",
    category: "moteur",
    ageMonths: 18,
    ageRange: { min: 15, max: 24 },
    icon: "Zap",
    celebrationType: "achievement",
  },
  {
    id: "motor-climb-stairs",
    title: "Monte les escaliers",
    description: "Monte les escaliers en tenant la rampe",
    category: "moteur",
    ageMonths: 24,
    ageRange: { min: 18, max: 30 },
    icon: "TrendingUp",
    celebrationType: "achievement",
  },
  {
    id: "motor-tricycle",
    title: "Fait du tricycle",
    description: "Peut pédaler sur un tricycle",
    category: "moteur",
    ageMonths: 36,
    ageRange: { min: 30, max: 42 },
    icon: "Bike",
    celebrationType: "achievement",
  },
  {
    id: "motor-bicycle",
    title: "Fait du vélo",
    description: "Fait du vélo sans petites roues",
    category: "moteur",
    ageMonths: 60,
    ageRange: { min: 48, max: 72 },
    icon: "Bike",
    celebrationType: "achievement",
  },

  // === LANGUAGE MILESTONES ===
  {
    id: "lang-coo",
    title: "Premiers gazouillis",
    description: "Fait des sons de voyelles (ah, ooh)",
    category: "langage",
    ageMonths: 2,
    ageRange: { min: 1, max: 4 },
    icon: "MessageCircle",
    celebrationType: "achievement",
  },
  {
    id: "lang-babble",
    title: "Babille",
    description: "Fait des syllabes répétitives (ba-ba, ma-ma)",
    category: "langage",
    ageMonths: 6,
    ageRange: { min: 4, max: 8 },
    icon: "MessageCircle",
    celebrationType: "achievement",
  },
  {
    id: "lang-first-word",
    title: "Premier mot",
    description: "Dit son premier mot avec sens (mama, papa, etc.)",
    category: "langage",
    ageMonths: 12,
    ageRange: { min: 10, max: 14 },
    icon: "Quote",
    reminderDaysBefore: 0,
    celebrationType: "achievement",
  },
  {
    id: "lang-10-words",
    title: "10 mots",
    description: "Utilise environ 10 mots avec sens",
    category: "langage",
    ageMonths: 15,
    ageRange: { min: 12, max: 18 },
    icon: "BookOpen",
    celebrationType: "achievement",
  },
  {
    id: "lang-50-words",
    title: "50 mots",
    description: "Vocabulaire d'environ 50 mots",
    category: "langage",
    ageMonths: 18,
    ageRange: { min: 15, max: 24 },
    icon: "BookOpen",
    celebrationType: "achievement",
  },
  {
    id: "lang-2-word-phrases",
    title: "Phrases de 2 mots",
    description: "Combine deux mots (papa parti, encore lait)",
    category: "langage",
    ageMonths: 21,
    ageRange: { min: 18, max: 24 },
    icon: "MessageSquare",
    celebrationType: "achievement",
  },
  {
    id: "lang-sentences",
    title: "Petites phrases",
    description: "Fait des phrases de 3-4 mots",
    category: "langage",
    ageMonths: 30,
    ageRange: { min: 24, max: 36 },
    icon: "FileText",
    celebrationType: "achievement",
  },
  {
    id: "lang-conversation",
    title: "Conversations",
    description: "Peut tenir une conversation simple",
    category: "langage",
    ageMonths: 36,
    ageRange: { min: 30, max: 42 },
    icon: "MessagesSquare",
    celebrationType: "achievement",
  },

  // === SOCIAL/EMOTIONAL MILESTONES ===
  {
    id: "social-smile",
    title: "Premier sourire social",
    description: "Sourit en réponse à un visage ou une voix",
    category: "social",
    ageMonths: 2,
    ageRange: { min: 1, max: 3 },
    icon: "Smile",
    celebrationType: "achievement",
  },
  {
    id: "social-laugh",
    title: "Premiers rires",
    description: "Rit aux éclats pour la première fois",
    category: "social",
    ageMonths: 4,
    ageRange: { min: 3, max: 5 },
    icon: "Laugh",
    celebrationType: "achievement",
  },
  {
    id: "social-stranger-anxiety",
    title: "Peur des étrangers",
    description:
      "Montre de la méfiance envers les inconnus (étape normale du développement)",
    category: "social",
    ageMonths: 8,
    ageRange: { min: 6, max: 10 },
    icon: "ShieldAlert",
  },
  {
    id: "social-bye-bye",
    title: "Fait au revoir",
    description: "Fait au revoir de la main",
    category: "social",
    ageMonths: 10,
    ageRange: { min: 8, max: 12 },
    icon: "Hand",
    celebrationType: "achievement",
  },
  {
    id: "social-play-parallel",
    title: "Jeu parallèle",
    description: "Joue à côté d'autres enfants (pas encore avec eux)",
    category: "social",
    ageMonths: 24,
    ageRange: { min: 18, max: 30 },
    icon: "Users",
  },
  {
    id: "social-play-interactive",
    title: "Jeu interactif",
    description: "Joue vraiment avec d'autres enfants, partage parfois",
    category: "social",
    ageMonths: 36,
    ageRange: { min: 30, max: 42 },
    icon: "Users",
    celebrationType: "achievement",
  },
  {
    id: "social-empathy",
    title: "Empathie",
    description: "Montre de l'empathie, console les autres enfants",
    category: "social",
    ageMonths: 42,
    ageRange: { min: 36, max: 48 },
    icon: "Heart",
    celebrationType: "achievement",
  },

  // === COGNITIVE MILESTONES ===
  {
    id: "cogn-object-permanence",
    title: "Permanence de l'objet",
    description: "Cherche un objet caché - comprend qu'il existe toujours",
    category: "cognitif",
    ageMonths: 8,
    ageRange: { min: 6, max: 10 },
    icon: "Search",
    celebrationType: "achievement",
  },
  {
    id: "cogn-imitation",
    title: "Imitation",
    description: "Imite des gestes simples (tape des mains, fait coucou)",
    category: "cognitif",
    ageMonths: 10,
    ageRange: { min: 8, max: 12 },
    icon: "Copy",
    celebrationType: "achievement",
  },
  {
    id: "cogn-colors",
    title: "Reconnaît les couleurs",
    description: "Peut nommer 4+ couleurs de base",
    category: "cognitif",
    ageMonths: 36,
    ageRange: { min: 30, max: 42 },
    icon: "Palette",
    celebrationType: "achievement",
  },
  {
    id: "cogn-count-10",
    title: "Compte jusqu'à 10",
    description: "Peut compter jusqu'à 10",
    category: "cognitif",
    ageMonths: 42,
    ageRange: { min: 36, max: 48 },
    icon: "Hash",
    celebrationType: "achievement",
  },
  {
    id: "cogn-write-name",
    title: "Écrit son prénom",
    description: "Peut écrire son prénom (même si les lettres ne sont pas parfaites)",
    category: "cognitif",
    ageMonths: 54,
    ageRange: { min: 48, max: 60 },
    icon: "PenLine",
    celebrationType: "achievement",
  },

  // === SCHOOL MILESTONES ===
  {
    id: "school-maternelle-ps",
    title: "Entrée en Petite Section",
    description:
      "Premier jour d'école maternelle - une grande étape pour toute la famille !",
    category: "ecole",
    ageMonths: 36,
    icon: "School",
    reminderDaysBefore: 30,
    celebrationType: "school",
  },
  {
    id: "school-maternelle-ms",
    title: "Entrée en Moyenne Section",
    description: "Passage en Moyenne Section de maternelle",
    category: "ecole",
    ageMonths: 48,
    icon: "School",
    reminderDaysBefore: 14,
    celebrationType: "school",
  },
  {
    id: "school-maternelle-gs",
    title: "Entrée en Grande Section",
    description: "Dernière année de maternelle, préparation au CP",
    category: "ecole",
    ageMonths: 60,
    icon: "School",
    reminderDaysBefore: 14,
    celebrationType: "school",
  },
  {
    id: "school-cp",
    title: "Entrée au CP",
    description:
      "Grande étape : apprentissage de la lecture et de l'écriture !",
    category: "ecole",
    ageMonths: 72,
    icon: "GraduationCap",
    reminderDaysBefore: 30,
    celebrationType: "school",
  },
  {
    id: "school-ce1",
    title: "Entrée au CE1",
    description: "Passage au CE1",
    category: "ecole",
    ageMonths: 84,
    icon: "BookOpen",
    reminderDaysBefore: 14,
    celebrationType: "school",
  },
  {
    id: "school-ce2",
    title: "Entrée au CE2",
    description: "Passage au CE2",
    category: "ecole",
    ageMonths: 96,
    icon: "BookOpen",
    reminderDaysBefore: 14,
    celebrationType: "school",
  },
  {
    id: "school-cm1",
    title: "Entrée au CM1",
    description: "Passage au CM1",
    category: "ecole",
    ageMonths: 108,
    icon: "BookOpen",
    reminderDaysBefore: 14,
    celebrationType: "school",
  },
  {
    id: "school-cm2",
    title: "Entrée au CM2",
    description: "Dernière année de primaire",
    category: "ecole",
    ageMonths: 120,
    icon: "BookOpen",
    reminderDaysBefore: 14,
    celebrationType: "school",
  },
  {
    id: "school-6eme",
    title: "Entrée au Collège (6ème)",
    description: "Grande étape : entrée au collège !",
    category: "ecole",
    ageMonths: 132,
    icon: "GraduationCap",
    reminderDaysBefore: 30,
    celebrationType: "school",
  },

  // === HEALTH CHECKUPS ===
  {
    id: "health-8-days",
    title: "Examen des 8 jours",
    description:
      "Premier examen médical obligatoire dans les 8 jours suivant la naissance",
    category: "sante",
    ageMonths: 0,
    icon: "Stethoscope",
    reminderDaysBefore: 0,
  },
  {
    id: "health-2-months",
    title: "Visite du 2ème mois",
    description: "Examen médical et premiers vaccins obligatoires",
    category: "sante",
    ageMonths: 2,
    icon: "Stethoscope",
    reminderDaysBefore: 7,
  },
  {
    id: "health-4-months",
    title: "Visite du 4ème mois",
    description: "Examen médical et vaccins",
    category: "sante",
    ageMonths: 4,
    icon: "Stethoscope",
    reminderDaysBefore: 7,
  },
  {
    id: "health-9-months",
    title: "Examen du 9ème mois",
    description:
      "Examen médical obligatoire avec certificat (certificat du 9ème mois)",
    category: "sante",
    ageMonths: 9,
    icon: "Stethoscope",
    reminderDaysBefore: 14,
  },
  {
    id: "health-24-months",
    title: "Examen du 24ème mois",
    description:
      "Examen médical obligatoire avec certificat (certificat des 2 ans)",
    category: "sante",
    ageMonths: 24,
    icon: "Stethoscope",
    reminderDaysBefore: 14,
  },
  {
    id: "health-3-years",
    title: "Bilan de santé 3 ans",
    description: "Bilan de santé recommandé avant l'entrée en maternelle",
    category: "sante",
    ageMonths: 36,
    icon: "Stethoscope",
    reminderDaysBefore: 30,
  },
  {
    id: "health-6-years",
    title: "Bilan de santé 6 ans",
    description: "Bilan de santé scolaire en grande section/CP",
    category: "sante",
    ageMonths: 72,
    icon: "Stethoscope",
    reminderDaysBefore: 30,
  },

  // === TOILET TRAINING ===
  {
    id: "potty-training-start",
    title: "Début apprentissage propreté",
    description:
      "L'enfant montre des signes de préparation à l'apprentissage de la propreté",
    category: "moteur",
    ageMonths: 24,
    ageRange: { min: 18, max: 30 },
    icon: "Droplets",
  },
  {
    id: "potty-training-day",
    title: "Propre le jour",
    description: "L'enfant est propre pendant la journée",
    category: "moteur",
    ageMonths: 30,
    ageRange: { min: 24, max: 36 },
    icon: "Sun",
    celebrationType: "achievement",
  },
  {
    id: "potty-training-night",
    title: "Propre la nuit",
    description: "L'enfant est propre la nuit (peut prendre plus de temps)",
    category: "moteur",
    ageMonths: 48,
    ageRange: { min: 36, max: 72 },
    icon: "Moon",
    celebrationType: "achievement",
  },

  // === TEETH ===
  {
    id: "teeth-first",
    title: "Première dent",
    description: "Apparition de la première dent de lait",
    category: "sante",
    ageMonths: 6,
    ageRange: { min: 4, max: 12 },
    icon: "Sparkles",
    celebrationType: "achievement",
  },
  {
    id: "teeth-first-lost",
    title: "Première dent perdue",
    description: "Perd sa première dent de lait - la petite souris arrive !",
    category: "sante",
    ageMonths: 72,
    ageRange: { min: 60, max: 84 },
    icon: "Sparkles",
    celebrationType: "achievement",
  },
]

/**
 * Get milestones that are upcoming or recently passed for a child
 * @param birthdate Child's birthdate
 * @param monthsAhead How many months ahead to look
 * @param monthsBehind How many months behind to look
 */
export function getMilestonesForChild(
  birthdate: Date,
  monthsAhead: number = 6,
  monthsBehind: number = 3
): Array<Milestone & { status: "passed" | "upcoming" | "current"; dueDate: Date }> {
  const ageMonths = calculateAgeInMonths(birthdate)
  const minAge = ageMonths - monthsBehind
  const maxAge = ageMonths + monthsAhead

  return childMilestones
    .filter((milestone) => {
      const targetAge = milestone.ageMonths
      return targetAge >= minAge && targetAge <= maxAge
    })
    .map((milestone) => {
      const dueDate = new Date(birthdate)
      dueDate.setMonth(dueDate.getMonth() + milestone.ageMonths)

      let status: "passed" | "upcoming" | "current"
      const monthsDiff = milestone.ageMonths - ageMonths

      if (monthsDiff < -1) {
        status = "passed"
      } else if (monthsDiff > 1) {
        status = "upcoming"
      } else {
        status = "current"
      }

      return { ...milestone, status, dueDate }
    })
    .sort((a, b) => a.ageMonths - b.ageMonths)
}

/**
 * Get the next birthday for a child
 */
export function getNextBirthday(birthdate: Date): { age: number; date: Date } {
  const now = new Date()
  const nextBirthday = new Date(birthdate)
  nextBirthday.setFullYear(now.getFullYear())

  // If birthday has passed this year, use next year
  if (nextBirthday < now) {
    nextBirthday.setFullYear(now.getFullYear() + 1)
  }

  const age = nextBirthday.getFullYear() - birthdate.getFullYear()

  return { age, date: nextBirthday }
}

/**
 * Calculate age in months from birthdate
 */
function calculateAgeInMonths(birthdate: Date): number {
  const now = new Date()
  const years = now.getFullYear() - birthdate.getFullYear()
  const months = now.getMonth() - birthdate.getMonth()
  return years * 12 + months
}

/**
 * Get milestones by category
 */
export function getMilestonesByCategory(
  category: MilestoneCategory
): Milestone[] {
  return childMilestones.filter((m) => m.category === category)
}

/**
 * Get celebration milestones for a child (birthdays, school entries, etc.)
 */
export function getCelebrationMilestones(
  birthdate: Date,
  monthsAhead: number = 12
): Array<Milestone & { dueDate: Date }> {
  const ageMonths = calculateAgeInMonths(birthdate)
  const maxAge = ageMonths + monthsAhead

  return childMilestones
    .filter(
      (milestone) =>
        milestone.celebrationType &&
        milestone.ageMonths > ageMonths &&
        milestone.ageMonths <= maxAge
    )
    .map((milestone) => {
      const dueDate = new Date(birthdate)
      dueDate.setMonth(dueDate.getMonth() + milestone.ageMonths)
      return { ...milestone, dueDate }
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}
