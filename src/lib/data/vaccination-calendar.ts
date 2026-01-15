/**
 * French Vaccination Calendar
 *
 * Based on the official French vaccination schedule (calendrier vaccinal)
 * from the Ministère des Solidarités et de la Santé
 *
 * Last updated: 2024
 */

export interface VaccinationItem {
  id: string
  name: string
  nameShort: string
  description: string
  ageMonths: number // Age in months when due
  ageDescription: string
  mandatory: boolean // Obligatory in France
  boosterOf?: string // ID of the vaccine this is a booster of
  category: "standard" | "catchup" | "specific"
}

export interface VaccinationSchedule {
  vaccines: VaccinationItem[]
  categories: {
    standard: string
    catchup: string
    specific: string
  }
}

/**
 * French vaccination calendar
 * Ages in months (1 year = 12 months)
 */
export const frenchVaccinationCalendar: VaccinationSchedule = {
  categories: {
    standard: "Vaccinations obligatoires et recommandées",
    catchup: "Rattrapages",
    specific: "Vaccinations spécifiques",
  },
  vaccines: [
    // === BIRTH TO 2 MONTHS ===
    {
      id: "bcg",
      name: "BCG (Tuberculose)",
      nameShort: "BCG",
      description:
        "Vaccination contre la tuberculose, recommandée pour les enfants à risque (nés dans un pays à forte endémie ou ayant des parents originaires de ces pays)",
      ageMonths: 0,
      ageDescription: "Naissance",
      mandatory: false,
      category: "specific",
    },
    {
      id: "hepb-1",
      name: "Hépatite B - 1ère dose",
      nameShort: "HépB 1",
      description: "Première dose du vaccin contre l'hépatite B",
      ageMonths: 0,
      ageDescription: "Naissance",
      mandatory: false,
      category: "specific",
    },

    // === 2 MONTHS ===
    {
      id: "dtap-ipv-hib-hepb-1",
      name: "Diphtérie, Tétanos, Coqueluche, Polio, Haemophilus, Hépatite B - 1ère dose",
      nameShort: "DTCaP-Hib-HépB 1",
      description:
        "Vaccin hexavalent: protection contre 6 maladies (diphtérie, tétanos, coqueluche, poliomyélite, infections à Haemophilus influenzae b, hépatite B)",
      ageMonths: 2,
      ageDescription: "2 mois",
      mandatory: true,
      category: "standard",
    },
    {
      id: "pneumo-1",
      name: "Pneumocoque - 1ère dose",
      nameShort: "Pneumo 1",
      description:
        "Première dose du vaccin contre les infections à pneumocoque (méningite, pneumonie)",
      ageMonths: 2,
      ageDescription: "2 mois",
      mandatory: true,
      category: "standard",
    },

    // === 4 MONTHS ===
    {
      id: "dtap-ipv-hib-hepb-2",
      name: "Diphtérie, Tétanos, Coqueluche, Polio, Haemophilus, Hépatite B - 2ème dose",
      nameShort: "DTCaP-Hib-HépB 2",
      description: "Deuxième dose du vaccin hexavalent",
      ageMonths: 4,
      ageDescription: "4 mois",
      mandatory: true,
      boosterOf: "dtap-ipv-hib-hepb-1",
      category: "standard",
    },
    {
      id: "pneumo-2",
      name: "Pneumocoque - 2ème dose",
      nameShort: "Pneumo 2",
      description: "Deuxième dose du vaccin contre le pneumocoque",
      ageMonths: 4,
      ageDescription: "4 mois",
      mandatory: true,
      boosterOf: "pneumo-1",
      category: "standard",
    },

    // === 5 MONTHS ===
    {
      id: "meningo-c-1",
      name: "Méningocoque C - 1ère dose",
      nameShort: "MéningoC 1",
      description:
        "Première dose du vaccin contre les infections à méningocoque C (méningite)",
      ageMonths: 5,
      ageDescription: "5 mois",
      mandatory: true,
      category: "standard",
    },

    // === 11 MONTHS ===
    {
      id: "dtap-ipv-hib-hepb-3",
      name: "Diphtérie, Tétanos, Coqueluche, Polio, Haemophilus, Hépatite B - 3ème dose",
      nameShort: "DTCaP-Hib-HépB 3",
      description: "Troisième dose (rappel) du vaccin hexavalent",
      ageMonths: 11,
      ageDescription: "11 mois",
      mandatory: true,
      boosterOf: "dtap-ipv-hib-hepb-2",
      category: "standard",
    },
    {
      id: "pneumo-3",
      name: "Pneumocoque - 3ème dose (rappel)",
      nameShort: "Pneumo R",
      description: "Troisième dose (rappel) du vaccin contre le pneumocoque",
      ageMonths: 11,
      ageDescription: "11 mois",
      mandatory: true,
      boosterOf: "pneumo-2",
      category: "standard",
    },

    // === 12 MONTHS ===
    {
      id: "ror-1",
      name: "Rougeole, Oreillons, Rubéole - 1ère dose",
      nameShort: "ROR 1",
      description:
        "Première dose du vaccin ROR contre la rougeole, les oreillons et la rubéole",
      ageMonths: 12,
      ageDescription: "12 mois",
      mandatory: true,
      category: "standard",
    },
    {
      id: "meningo-c-2",
      name: "Méningocoque C - 2ème dose (rappel)",
      nameShort: "MéningoC R",
      description: "Deuxième dose (rappel) du vaccin contre le méningocoque C",
      ageMonths: 12,
      ageDescription: "12 mois",
      mandatory: true,
      boosterOf: "meningo-c-1",
      category: "standard",
    },

    // === 16-18 MONTHS ===
    {
      id: "ror-2",
      name: "Rougeole, Oreillons, Rubéole - 2ème dose",
      nameShort: "ROR 2",
      description:
        "Deuxième dose du vaccin ROR (entre 16 et 18 mois, avec un délai minimum de 1 mois après la 1ère dose)",
      ageMonths: 17,
      ageDescription: "16-18 mois",
      mandatory: true,
      boosterOf: "ror-1",
      category: "standard",
    },

    // === 6 YEARS ===
    {
      id: "dtap-ipv-r1",
      name: "Diphtérie, Tétanos, Coqueluche, Polio - Rappel 6 ans",
      nameShort: "DTCaP R6",
      description:
        "Rappel à 6 ans du vaccin contre la diphtérie, le tétanos, la coqueluche et la poliomyélite",
      ageMonths: 72,
      ageDescription: "6 ans",
      mandatory: false,
      boosterOf: "dtap-ipv-hib-hepb-3",
      category: "standard",
    },

    // === 11-13 YEARS ===
    {
      id: "dtap-ipv-r2",
      name: "Diphtérie, Tétanos, Coqueluche, Polio - Rappel 11-13 ans",
      nameShort: "dTcaP R11",
      description:
        "Rappel à 11-13 ans (dose réduite en antigènes diphtérique et coquelucheux)",
      ageMonths: 144,
      ageDescription: "11-13 ans",
      mandatory: false,
      boosterOf: "dtap-ipv-r1",
      category: "standard",
    },
    {
      id: "hpv-1",
      name: "Papillomavirus humain (HPV) - 1ère dose",
      nameShort: "HPV 1",
      description:
        "Première dose du vaccin contre les infections à papillomavirus humain (recommandé pour filles et garçons)",
      ageMonths: 132,
      ageDescription: "11 ans",
      mandatory: false,
      category: "standard",
    },
    {
      id: "hpv-2",
      name: "Papillomavirus humain (HPV) - 2ème dose",
      nameShort: "HPV 2",
      description:
        "Deuxième dose du vaccin HPV (6 mois après la 1ère dose, entre 11 et 14 ans)",
      ageMonths: 138,
      ageDescription: "11-12 ans",
      mandatory: false,
      boosterOf: "hpv-1",
      category: "standard",
    },
    {
      id: "meningo-acwy",
      name: "Méningocoque A, C, W, Y",
      nameShort: "Méningo ACWY",
      description:
        "Vaccin tétravalent contre les méningocoques A, C, W et Y (recommandé entre 11 et 14 ans)",
      ageMonths: 144,
      ageDescription: "11-14 ans",
      mandatory: false,
      category: "standard",
    },

    // === 25 YEARS (adult boosters for reference) ===
    {
      id: "dtap-ipv-r3",
      name: "Diphtérie, Tétanos, Coqueluche, Polio - Rappel 25 ans",
      nameShort: "dTcaP R25",
      description: "Rappel à 25 ans",
      ageMonths: 300,
      ageDescription: "25 ans",
      mandatory: false,
      boosterOf: "dtap-ipv-r2",
      category: "standard",
    },
  ],
}

/**
 * Get vaccinations due for a child based on their age
 * @param birthdate Child's birthdate
 * @param windowMonths Number of months before/after to include (default: 1)
 * @returns Array of due vaccinations with status
 */
export function getVaccinationsDue(
  birthdate: Date,
  windowMonths: number = 1
): Array<VaccinationItem & { status: "overdue" | "due" | "upcoming" | "completed" }> {
  const now = new Date()
  const ageMonths = calculateAgeInMonths(birthdate)

  return frenchVaccinationCalendar.vaccines
    .filter((vaccine) => vaccine.category === "standard")
    .map((vaccine) => {
      const monthsDiff = vaccine.ageMonths - ageMonths

      let status: "overdue" | "due" | "upcoming" | "completed"
      if (monthsDiff < -windowMonths) {
        // Past due date by more than window - either completed or overdue
        status = "overdue" // Assume overdue unless marked complete
      } else if (monthsDiff <= windowMonths) {
        // Within window - due now
        status = "due"
      } else {
        // In the future
        status = "upcoming"
      }

      return { ...vaccine, status }
    })
    .filter(
      (vaccine) =>
        vaccine.status === "overdue" ||
        vaccine.status === "due" ||
        (vaccine.status === "upcoming" && vaccine.ageMonths <= ageMonths + 12)
    )
}

/**
 * Get all upcoming vaccinations for the next N months
 */
export function getUpcomingVaccinations(
  birthdate: Date,
  monthsAhead: number = 6
): VaccinationItem[] {
  const ageMonths = calculateAgeInMonths(birthdate)
  const maxAge = ageMonths + monthsAhead

  return frenchVaccinationCalendar.vaccines.filter(
    (vaccine) =>
      vaccine.category === "standard" &&
      vaccine.ageMonths > ageMonths &&
      vaccine.ageMonths <= maxAge
  )
}

/**
 * Calculate age in months from birthdate
 */
export function calculateAgeInMonths(birthdate: Date): number {
  const now = new Date()
  const years = now.getFullYear() - birthdate.getFullYear()
  const months = now.getMonth() - birthdate.getMonth()
  return years * 12 + months
}

/**
 * Calculate age in years and months
 */
export function calculateAge(birthdate: Date): { years: number; months: number } {
  const now = new Date()
  let years = now.getFullYear() - birthdate.getFullYear()
  let months = now.getMonth() - birthdate.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  // Adjust if day of month hasn't passed yet
  if (now.getDate() < birthdate.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  return { years, months }
}

/**
 * Format age for display
 */
export function formatAge(birthdate: Date): string {
  const { years, months } = calculateAge(birthdate)

  if (years === 0) {
    return `${months} mois`
  }

  if (months === 0) {
    return `${years} an${years > 1 ? "s" : ""}`
  }

  return `${years} an${years > 1 ? "s" : ""} et ${months} mois`
}

/**
 * Get vaccination due date based on birthdate
 */
export function getVaccinationDueDate(
  birthdate: Date,
  vaccine: VaccinationItem
): Date {
  const dueDate = new Date(birthdate)
  dueDate.setMonth(dueDate.getMonth() + vaccine.ageMonths)
  return dueDate
}
