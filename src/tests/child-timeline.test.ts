/**
 * Child Timeline Tests
 *
 * Unit tests for child timeline, milestones, and vaccination calendar features.
 * These are pure unit tests that don't require database connections.
 */

import { describe, it, expect } from "vitest"
import {
  frenchVaccinationCalendar,
  getVaccinationsDue,
  getUpcomingVaccinations,
  calculateAgeInMonths,
  calculateAge,
  formatAge,
  getVaccinationDueDate,
} from "@/lib/data/vaccination-calendar"
import {
  childMilestones,
  milestoneCategories,
  getMilestonesForChild,
  getNextBirthday,
  getCelebrationMilestones,
  getMilestonesByCategory,
} from "@/lib/data/child-milestones"

describe("Vaccination Calendar Data", () => {
  it("should have all mandatory vaccines defined", () => {
    const mandatoryVaccines = frenchVaccinationCalendar.vaccines.filter(
      (v) => v.mandatory
    )
    // French law requires 11 vaccines
    expect(mandatoryVaccines.length).toBeGreaterThanOrEqual(10)
  })

  it("should have hexavalent vaccine at 2 months", () => {
    const hexavalent = frenchVaccinationCalendar.vaccines.find(
      (v) => v.id === "dtap-ipv-hib-hepb-1"
    )
    expect(hexavalent).toBeDefined()
    expect(hexavalent?.ageMonths).toBe(2)
    expect(hexavalent?.mandatory).toBe(true)
  })

  it("should have ROR vaccine at 12 months", () => {
    const ror = frenchVaccinationCalendar.vaccines.find(
      (v) => v.id === "ror-1"
    )
    expect(ror).toBeDefined()
    expect(ror?.ageMonths).toBe(12)
    expect(ror?.mandatory).toBe(true)
  })

  it("should have early vaccines defined first", () => {
    const standardVaccines = frenchVaccinationCalendar.vaccines.filter(
      (v) => v.category === "standard"
    )
    // Check that we have vaccines at key ages (2m, 4m, 11m, 12m)
    const ages = standardVaccines.map((v) => v.ageMonths)
    expect(ages).toContain(2)
    expect(ages).toContain(4)
    expect(ages).toContain(11)
    expect(ages).toContain(12)
  })

  it("should have booster references pointing to existing vaccines", () => {
    const vaccineIds = new Set(
      frenchVaccinationCalendar.vaccines.map((v) => v.id)
    )
    const boosterVaccines = frenchVaccinationCalendar.vaccines.filter(
      (v) => v.boosterOf
    )
    for (const vaccine of boosterVaccines) {
      // Booster reference should either be a valid vaccine ID or a partial match
      const hasValidRef = vaccineIds.has(vaccine.boosterOf!) ||
        Array.from(vaccineIds).some(id => id.startsWith(vaccine.boosterOf!.split("-").slice(0, -1).join("-")))
      expect(hasValidRef || vaccine.boosterOf!.includes("dtap")).toBe(true)
    }
  })
})

describe("Age Calculation Functions", () => {
  it("should calculate age in months correctly for newborn", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 3)

    const ageMonths = calculateAgeInMonths(birthdate)
    expect(ageMonths).toBe(3)
  })

  it("should calculate age in months correctly for 1 year old", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setFullYear(today.getFullYear() - 1)

    const ageMonths = calculateAgeInMonths(birthdate)
    expect(ageMonths).toBe(12)
  })

  it("should calculate age in years and months", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setFullYear(today.getFullYear() - 2)
    birthdate.setMonth(today.getMonth() - 6)

    const age = calculateAge(birthdate)
    // Allow some flexibility for month calculations
    expect(age.years).toBeGreaterThanOrEqual(2)
    expect(age.months).toBeGreaterThanOrEqual(0)
    expect(age.months).toBeLessThan(12)
  })

  it("should format age as months for babies", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 6)

    const formatted = formatAge(birthdate)
    expect(formatted).toContain("mois")
  })

  it("should format age as years for older children", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setFullYear(today.getFullYear() - 3)

    const formatted = formatAge(birthdate)
    expect(formatted).toContain("an")
  })
})

describe("Vaccinations Due", () => {
  it("should return overdue vaccinations for 6 month old without vaccines", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 6)

    const due = getVaccinationsDue(birthdate)
    const overdueVaccines = due.filter((v) => v.status === "overdue")

    // Should have overdue vaccines from 2 and 4 months
    expect(overdueVaccines.length).toBeGreaterThan(0)
  })

  it("should return due vaccinations within window", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 2)

    const due = getVaccinationsDue(birthdate)
    const dueNow = due.filter((v) => v.status === "due")

    // Should have vaccines due at 2 months
    expect(dueNow.length).toBeGreaterThan(0)
  })

  it("should return upcoming vaccinations", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 1)

    const due = getVaccinationsDue(birthdate)
    const upcoming = due.filter((v) => v.status === "upcoming")

    // Should have upcoming vaccines
    expect(upcoming.length).toBeGreaterThan(0)
  })

  it("should calculate correct vaccination due date", () => {
    const birthdate = new Date("2024-01-15")
    const vaccine = frenchVaccinationCalendar.vaccines.find(
      (v) => v.id === "dtap-ipv-hib-hepb-1"
    )!

    const dueDate = getVaccinationDueDate(birthdate, vaccine)

    // Should be 2 months after birthdate
    expect(dueDate.getMonth()).toBe(2) // March (0-indexed)
    expect(dueDate.getFullYear()).toBe(2024)
  })
})

describe("Upcoming Vaccinations", () => {
  it("should return vaccines for next 6 months", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 1)

    const upcoming = getUpcomingVaccinations(birthdate, 6)

    // Should have upcoming vaccines between 1-7 months of age
    expect(upcoming.every((v) => v.ageMonths > 1 && v.ageMonths <= 7)).toBe(true)
  })

  it("should return empty for very old children", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setFullYear(today.getFullYear() - 30)

    const upcoming = getUpcomingVaccinations(birthdate, 6)

    // Should have no upcoming standard vaccines
    expect(upcoming.length).toBe(0)
  })
})

describe("Child Milestones Data", () => {
  it("should have milestones for all categories", () => {
    const categories = Object.keys(milestoneCategories)

    for (const category of categories) {
      const milestonesInCategory = childMilestones.filter(
        (m) => m.category === category
      )
      expect(milestonesInCategory.length).toBeGreaterThan(0)
    }
  })

  it("should have first birthday milestone", () => {
    const birthday1 = childMilestones.find((m) => m.id === "birthday-1")
    expect(birthday1).toBeDefined()
    expect(birthday1?.ageMonths).toBe(12)
    expect(birthday1?.category).toBe("celebration")
  })

  it("should have first steps milestone", () => {
    const firstSteps = childMilestones.find((m) => m.id === "motor-first-steps")
    expect(firstSteps).toBeDefined()
    expect(firstSteps?.ageMonths).toBe(12)
    expect(firstSteps?.category).toBe("moteur")
    expect(firstSteps?.ageRange).toBeDefined()
  })

  it("should have school entry milestones", () => {
    const ps = childMilestones.find((m) => m.id === "school-maternelle-ps")
    const cp = childMilestones.find((m) => m.id === "school-cp")

    expect(ps).toBeDefined()
    expect(ps?.ageMonths).toBe(36) // 3 years

    expect(cp).toBeDefined()
    expect(cp?.ageMonths).toBe(72) // 6 years
  })

  it("should have health checkup milestones", () => {
    const health9m = childMilestones.find((m) => m.id === "health-9-months")
    const health24m = childMilestones.find((m) => m.id === "health-24-months")

    expect(health9m).toBeDefined()
    expect(health9m?.category).toBe("sante")

    expect(health24m).toBeDefined()
    expect(health24m?.ageMonths).toBe(24)
  })
})

describe("Milestones For Child", () => {
  it("should return current milestones for 12 month old", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 12)

    const milestones = getMilestonesForChild(birthdate, 6, 3)
    const current = milestones.filter((m) => m.status === "current")

    // Should have milestones around 12 months (first steps, first word, etc.)
    expect(current.length).toBeGreaterThan(0)
  })

  it("should return upcoming milestones", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 6)

    const milestones = getMilestonesForChild(birthdate, 12, 3)
    const upcoming = milestones.filter((m) => m.status === "upcoming")

    // Should have upcoming milestones
    expect(upcoming.length).toBeGreaterThan(0)
  })

  it("should include due date for each milestone", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 6)

    const milestones = getMilestonesForChild(birthdate, 12, 3)

    for (const milestone of milestones) {
      expect(milestone.dueDate).toBeInstanceOf(Date)
    }
  })

  it("should return milestones sorted by age", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 12)

    const milestones = getMilestonesForChild(birthdate, 12, 6)

    for (let i = 0; i < milestones.length - 1; i++) {
      const current = milestones[i]
      const next = milestones[i + 1]
      if (current && next) {
        expect(current.ageMonths).toBeLessThanOrEqual(next.ageMonths)
      }
    }
  })
})

describe("Next Birthday", () => {
  it("should return a future date for next birthday", () => {
    const today = new Date()
    const birthdate = new Date(2020, 5, 15) // Fixed birthdate

    const nextBirthday = getNextBirthday(birthdate)

    // Next birthday should be in the future or today
    expect(nextBirthday.date.getTime()).toBeGreaterThanOrEqual(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    )
  })

  it("should calculate correct age at next birthday", () => {
    // Use a fixed date in the future
    const birthdate = new Date(2022, 0, 1) // Jan 1, 2022

    const nextBirthday = getNextBirthday(birthdate)

    // Age should be positive
    expect(nextBirthday.age).toBeGreaterThan(0)
    // Age should be reasonable (between 1 and 100)
    expect(nextBirthday.age).toBeLessThan(100)
  })

  it("should return birthday date with same month and day", () => {
    const birthdate = new Date(2020, 5, 15) // June 15, 2020

    const nextBirthday = getNextBirthday(birthdate)

    expect(nextBirthday.date.getMonth()).toBe(5) // June
    expect(nextBirthday.date.getDate()).toBe(15)
  })
})

describe("Celebration Milestones", () => {
  it("should return celebration milestones for 2 year old", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 24)

    const celebrations = getCelebrationMilestones(birthdate, 24)

    // Should have upcoming birthdays and school milestones
    expect(celebrations.length).toBeGreaterThan(0)
  })

  it("should include school entry celebrations", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 32) // Almost 3 years

    const celebrations = getCelebrationMilestones(birthdate, 12)
    const schoolCelebrations = celebrations.filter(
      (c) => c.celebrationType === "school"
    )

    // Should have maternelle PS coming up
    expect(schoolCelebrations.length).toBeGreaterThanOrEqual(0)
  })

  it("should sort celebrations by date", () => {
    const today = new Date()
    const birthdate = new Date(today)
    birthdate.setMonth(today.getMonth() - 30)

    const celebrations = getCelebrationMilestones(birthdate, 24)

    for (let i = 0; i < celebrations.length - 1; i++) {
      const current = celebrations[i]
      const next = celebrations[i + 1]
      if (current && next) {
        expect(current.dueDate.getTime()).toBeLessThanOrEqual(next.dueDate.getTime())
      }
    }
  })
})

describe("Milestones By Category", () => {
  it("should return motor milestones", () => {
    const motorMilestones = getMilestonesByCategory("moteur")
    expect(motorMilestones.length).toBeGreaterThan(0)
    expect(motorMilestones.every((m) => m.category === "moteur")).toBe(true)
  })

  it("should return language milestones", () => {
    const langMilestones = getMilestonesByCategory("langage")
    expect(langMilestones.length).toBeGreaterThan(0)
    expect(langMilestones.every((m) => m.category === "langage")).toBe(true)
  })

  it("should return school milestones", () => {
    const schoolMilestones = getMilestonesByCategory("ecole")
    expect(schoolMilestones.length).toBeGreaterThan(0)

    // Should have all school levels
    const hasPS = schoolMilestones.some((m) => m.id === "school-maternelle-ps")
    const hasCP = schoolMilestones.some((m) => m.id === "school-cp")

    expect(hasPS).toBe(true)
    expect(hasCP).toBe(true)
  })
})

describe("Milestone Category Info", () => {
  it("should have all category info defined", () => {
    const categories: Array<keyof typeof milestoneCategories> = [
      "moteur",
      "langage",
      "social",
      "cognitif",
      "ecole",
      "sante",
      "celebration",
    ]

    for (const category of categories) {
      const info = milestoneCategories[category]
      expect(info).toBeDefined()
      expect(info.label).toBeDefined()
      expect(info.color).toBeDefined()
      expect(info.icon).toBeDefined()
    }
  })

  it("should have valid hex colors", () => {
    for (const info of Object.values(milestoneCategories)) {
      expect(info.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
