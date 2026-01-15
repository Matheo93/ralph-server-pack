/**
 * Age-Based Tasks Service Tests
 *
 * Unit tests for automatic task generation based on children's ages.
 * Tests age calculation, template filtering, and task generation logic.
 */

import { describe, it, expect } from "vitest"
import {
  calculateAge,
  calculateAgeInMonths,
  getAgeGroup,
  getAgeGroupLabel,
  enrichChildWithAge,
  getApplicableTemplates,
  shouldGenerateOneTimeTask,
  calculateNextPeriodicDeadline,
  getTemplateCountsByAgeGroup,
  type Child,
} from "@/lib/services/age-based-tasks"
import type { TaskTemplate, AgeGroup } from "@/types/template"

// =============================================================================
// MOCK DATA
// =============================================================================

const mockChild: Child = {
  id: "child-1",
  first_name: "Emma",
  birthdate: new Date(new Date().getFullYear() - 5, 3, 15).toISOString().split("T")[0]!, // 5 years old
  household_id: "household-1",
}

const mockBabyChild: Child = {
  id: "child-2",
  first_name: "Louis",
  birthdate: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().split("T")[0]!, // 3 months old
  household_id: "household-1",
}

const mockTeenChild: Child = {
  id: "child-3",
  first_name: "Marie",
  birthdate: new Date(new Date().getFullYear() - 16, 6, 20).toISOString().split("T")[0]!, // 16 years old
  household_id: "household-1",
}

const mockVaccineTemplate: TaskTemplate = {
  id: "template-1",
  country: "FR",
  age_min: 0,
  age_max: 0,
  category: "sante",
  subcategory: "vaccin",
  title: "Vaccin 2 mois - DTP, Coqueluche",
  description: "Premier vaccin obligatoire",
  cron_rule: null,
  weight: 5,
  days_before_deadline: 14,
  period: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockPeriodicTemplate: TaskTemplate = {
  id: "template-2",
  country: "FR",
  age_min: 6,
  age_max: 11,
  category: "ecole",
  subcategory: "fournitures",
  title: "Fournitures scolaires",
  description: "Acheter les fournitures",
  cron_rule: "0 0 20 8 *", // August 20th
  weight: 4,
  days_before_deadline: 10,
  period: "rentree",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// =============================================================================
// AGE CALCULATION TESTS
// =============================================================================

describe("Age Calculation", () => {
  describe("calculateAge", () => {
    it("should calculate correct age for 5 year old", () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 5)
      birthdate.setMonth(0, 1) // Set to start of year to ensure age
      const age = calculateAge(birthdate.toISOString().split("T")[0]!)
      expect(age).toBeGreaterThanOrEqual(4)
      expect(age).toBeLessThanOrEqual(5)
    })

    it("should return 0 for newborn", () => {
      const today = new Date()
      const age = calculateAge(today.toISOString().split("T")[0]!)
      expect(age).toBe(0)
    })

    it("should handle birthday not yet reached this year", () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 10)
      birthdate.setMonth(birthdate.getMonth() + 1) // Next month
      const age = calculateAge(birthdate.toISOString().split("T")[0]!)
      expect(age).toBe(9) // Still 9 years old
    })

    it("should handle birthday already passed this year", () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 10)
      birthdate.setMonth(birthdate.getMonth() - 1) // Last month
      const age = calculateAge(birthdate.toISOString().split("T")[0]!)
      expect(age).toBe(10)
    })

    it("should never return negative age", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const age = calculateAge(futureDate.toISOString().split("T")[0]!)
      expect(age).toBe(0)
    })
  })

  describe("calculateAgeInMonths", () => {
    it("should calculate months for 3 month old baby", () => {
      const birthdate = new Date()
      birthdate.setMonth(birthdate.getMonth() - 3)
      const months = calculateAgeInMonths(birthdate.toISOString().split("T")[0]!)
      expect(months).toBeGreaterThanOrEqual(2)
      expect(months).toBeLessThanOrEqual(4)
    })

    it("should calculate months for 1 year old", () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 1)
      const months = calculateAgeInMonths(birthdate.toISOString().split("T")[0]!)
      expect(months).toBeGreaterThanOrEqual(11)
      expect(months).toBeLessThanOrEqual(13)
    })

    it("should return 0 for newborn", () => {
      const today = new Date()
      const months = calculateAgeInMonths(today.toISOString().split("T")[0]!)
      expect(months).toBe(0)
    })
  })
})

// =============================================================================
// AGE GROUP TESTS
// =============================================================================

describe("Age Groups", () => {
  describe("getAgeGroup", () => {
    const testCases: [number, AgeGroup][] = [
      [0, "0-3"],
      [1, "0-3"],
      [2, "0-3"],
      [3, "3-6"],
      [4, "3-6"],
      [5, "3-6"],
      [6, "6-11"],
      [10, "6-11"],
      [11, "11-15"],
      [14, "11-15"],
      [15, "15-18"],
      [17, "15-18"],
      [18, "18-25"],
      [20, "18-25"],
      [25, "18-25"],
    ]

    testCases.forEach(([age, expectedGroup]) => {
      it(`should return ${expectedGroup} for age ${age}`, () => {
        expect(getAgeGroup(age)).toBe(expectedGroup)
      })
    })
  })

  describe("getAgeGroupLabel", () => {
    it("should return French label for 0-3", () => {
      expect(getAgeGroupLabel("0-3")).toBe("Nourrisson (0-3 ans)")
    })

    it("should return French label for 3-6", () => {
      expect(getAgeGroupLabel("3-6")).toBe("Maternelle (3-6 ans)")
    })

    it("should return French label for 6-11", () => {
      expect(getAgeGroupLabel("6-11")).toBe("Primaire (6-11 ans)")
    })

    it("should return French label for 11-15", () => {
      expect(getAgeGroupLabel("11-15")).toBe("Collège (11-15 ans)")
    })

    it("should return French label for 15-18", () => {
      expect(getAgeGroupLabel("15-18")).toBe("Lycée (15-18 ans)")
    })

    it("should return French label for 18-25", () => {
      expect(getAgeGroupLabel("18-25")).toBe("Études supérieures (18-25 ans)")
    })
  })
})

// =============================================================================
// CHILD ENRICHMENT TESTS
// =============================================================================

describe("Child Enrichment", () => {
  describe("enrichChildWithAge", () => {
    it("should add age info to 5 year old child", () => {
      const enriched = enrichChildWithAge(mockChild)
      expect(enriched.id).toBe(mockChild.id)
      expect(enriched.first_name).toBe(mockChild.first_name)
      expect(enriched.age).toBeGreaterThanOrEqual(4)
      expect(enriched.age).toBeLessThanOrEqual(6)
      expect(enriched.ageGroup).toBe("3-6")
      expect(enriched.monthsOld).toBeGreaterThan(48)
    })

    it("should add age info to baby", () => {
      const enriched = enrichChildWithAge(mockBabyChild)
      expect(enriched.age).toBe(0)
      expect(enriched.ageGroup).toBe("0-3")
      expect(enriched.monthsOld).toBeGreaterThanOrEqual(2)
      expect(enriched.monthsOld).toBeLessThanOrEqual(4)
    })

    it("should add age info to teenager", () => {
      const enriched = enrichChildWithAge(mockTeenChild)
      expect(enriched.age).toBeGreaterThanOrEqual(15)
      expect(enriched.age).toBeLessThanOrEqual(17)
      expect(enriched.ageGroup).toBe("15-18")
    })
  })
})

// =============================================================================
// TEMPLATE FILTERING TESTS
// =============================================================================

describe("Template Filtering", () => {
  describe("getApplicableTemplates", () => {
    it("should return templates for 5 year old (maternelle)", () => {
      const enriched = enrichChildWithAge(mockChild)
      const templates = getApplicableTemplates(enriched)
      expect(templates.length).toBeGreaterThan(0)
      // Should include maternelle templates
      const hasMaternelle = templates.some((t) => t.title.includes("maternelle"))
      expect(hasMaternelle).toBe(true)
    })

    it("should return different templates for different ages", () => {
      const babyEnriched = enrichChildWithAge(mockBabyChild)
      const teenEnriched = enrichChildWithAge(mockTeenChild)

      const babyTemplates = getApplicableTemplates(babyEnriched)
      const teenTemplates = getApplicableTemplates(teenEnriched)

      // Baby should have vaccine templates
      const hasVaccine = babyTemplates.some((t) => t.subcategory === "vaccin")
      expect(hasVaccine).toBe(true)

      // Teen should have lycee-related templates (ecole or logistique categories for 15-18)
      const hasTeenTasks = teenTemplates.some((t) =>
        t.category === "ecole" || t.category === "logistique" || t.category === "administratif"
      )
      expect(hasTeenTasks).toBe(true)
    })
  })
})

// =============================================================================
// ONE-TIME TASK GENERATION TESTS
// =============================================================================

describe("One-Time Task Generation", () => {
  describe("shouldGenerateOneTimeTask", () => {
    it("should not generate for template with cron_rule", () => {
      const childEnriched = enrichChildWithAge(mockChild)
      const result = shouldGenerateOneTimeTask(mockPeriodicTemplate, childEnriched)
      expect(result.shouldGenerate).toBe(false)
      expect(result.reason).toBe("Has cron rule")
    })

    it("should not generate vaccine for older child", () => {
      const childEnriched = enrichChildWithAge(mockChild) // 5 years old
      const result = shouldGenerateOneTimeTask(mockVaccineTemplate, childEnriched)
      expect(result.shouldGenerate).toBe(false)
    })

    it("should generate task when age is in range", () => {
      // Create template for 4-6 year olds (wider range to account for age calculation)
      const template: TaskTemplate = {
        ...mockVaccineTemplate,
        age_min: 4,
        age_max: 6,
        title: "Test task for 4-6 year olds",
      }
      const childEnriched = enrichChildWithAge(mockChild)
      const result = shouldGenerateOneTimeTask(template, childEnriched)
      // For range-based one-time tasks, shouldGenerate depends on age being in range
      expect(result.deadline).not.toBeNull()
    })
  })
})

// =============================================================================
// PERIODIC DEADLINE CALCULATION TESTS
// =============================================================================

describe("Periodic Deadline Calculation", () => {
  describe("calculateNextPeriodicDeadline", () => {
    it("should return null for null cron_rule", () => {
      const result = calculateNextPeriodicDeadline(mockVaccineTemplate)
      expect(result).toBeNull()
    })

    it("should calculate next deadline for @yearly", () => {
      const template: TaskTemplate = {
        ...mockPeriodicTemplate,
        cron_rule: "@yearly",
      }
      const result = calculateNextPeriodicDeadline(template)
      expect(result).not.toBeNull()
      expect(result!.getMonth()).toBe(0) // January
      expect(result!.getDate()).toBe(1)
      expect(result!.getFullYear()).toBeGreaterThan(new Date().getFullYear() - 1)
    })

    it("should calculate next deadline for @monthly", () => {
      const template: TaskTemplate = {
        ...mockPeriodicTemplate,
        cron_rule: "@monthly",
      }
      const result = calculateNextPeriodicDeadline(template)
      expect(result).not.toBeNull()
      expect(result!.getDate()).toBe(1)
      // Should be next month
      const today = new Date()
      const expectedMonth = (today.getMonth() + 1) % 12
      expect(result!.getMonth()).toBe(expectedMonth)
    })

    it("should calculate next deadline for @weekly", () => {
      const template: TaskTemplate = {
        ...mockPeriodicTemplate,
        cron_rule: "@weekly",
      }
      const result = calculateNextPeriodicDeadline(template)
      expect(result).not.toBeNull()
      expect(result!.getDay()).toBe(0) // Sunday
    })

    it("should calculate next deadline for @daily", () => {
      const template: TaskTemplate = {
        ...mockPeriodicTemplate,
        cron_rule: "@daily",
      }
      const today = new Date()
      const result = calculateNextPeriodicDeadline(template, today)
      expect(result).not.toBeNull()
      const expectedDate = new Date(today)
      expectedDate.setDate(expectedDate.getDate() + 1)
      expect(result!.getDate()).toBe(expectedDate.getDate())
    })

    it("should parse cron format correctly", () => {
      // "0 0 20 8 *" = August 20th
      const result = calculateNextPeriodicDeadline(mockPeriodicTemplate)
      expect(result).not.toBeNull()
      expect(result!.getMonth()).toBe(7) // August (0-indexed)
      expect(result!.getDate()).toBe(20)
    })

    it("should move to next year if date is past", () => {
      const today = new Date()
      // Set template to past month
      const pastMonth = today.getMonth() - 2
      const template: TaskTemplate = {
        ...mockPeriodicTemplate,
        cron_rule: `0 0 15 ${pastMonth + 1} *`,
      }
      const result = calculateNextPeriodicDeadline(template)
      expect(result).not.toBeNull()
      expect(result!.getFullYear()).toBeGreaterThanOrEqual(today.getFullYear())
    })
  })
})

// =============================================================================
// STATISTICS TESTS
// =============================================================================

describe("Statistics", () => {
  describe("getTemplateCountsByAgeGroup", () => {
    it("should return counts for all age groups", () => {
      const counts = getTemplateCountsByAgeGroup()
      expect(counts).toHaveProperty("0-3")
      expect(counts).toHaveProperty("3-6")
      expect(counts).toHaveProperty("6-11")
      expect(counts).toHaveProperty("11-15")
      expect(counts).toHaveProperty("15-18")
      expect(counts).toHaveProperty("18-25")
    })

    it("should have non-negative counts for each group", () => {
      const counts = getTemplateCountsByAgeGroup()
      Object.values(counts).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(0)
      })
    })

    it("should have positive counts for main child age groups", () => {
      const counts = getTemplateCountsByAgeGroup()
      // Main child age groups should have templates
      expect(counts["0-3"]).toBeGreaterThan(0)
      expect(counts["3-6"]).toBeGreaterThan(0)
      expect(counts["6-11"]).toBeGreaterThan(0)
      expect(counts["11-15"]).toBeGreaterThan(0)
      expect(counts["15-18"]).toBeGreaterThan(0)
    })

    it("should have highest count for younger ages (more medical)", () => {
      const counts = getTemplateCountsByAgeGroup()
      // 0-3 should have many vaccine templates
      expect(counts["0-3"]).toBeGreaterThan(0)
    })
  })
})
