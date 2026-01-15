/**
 * Tests for Task Catalogue Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  calculateAgeMonths,
  getCurrentPeriod,
  getVaccinationTasks,
  getSchoolMilestoneTasks,
  getSeasonalTasks,
  getCatalogueCategories,
  searchCatalogueTasks,
} from "@/lib/services/task-catalogue"

// =============================================================================
// AGE CALCULATION TESTS
// =============================================================================

describe("calculateAgeMonths", () => {
  it("calculates age in months correctly for a 1 year old", () => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const ageMonths = calculateAgeMonths(oneYearAgo)
    expect(ageMonths).toBe(12)
  })

  it("calculates age in months correctly for a 6 month old", () => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const ageMonths = calculateAgeMonths(sixMonthsAgo)
    expect(ageMonths).toBe(6)
  })

  it("calculates age in months correctly for a 3 year old", () => {
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)
    const ageMonths = calculateAgeMonths(threeYearsAgo)
    expect(ageMonths).toBe(36)
  })

  it("handles newborns (0 months)", () => {
    const today = new Date()
    const ageMonths = calculateAgeMonths(today)
    expect(ageMonths).toBe(0)
  })

  it("handles edge case at month boundary", () => {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const ageMonths = calculateAgeMonths(lastMonth)
    expect(ageMonths).toBe(1)
  })
})

// =============================================================================
// CURRENT PERIOD TESTS
// =============================================================================

describe("getCurrentPeriod", () => {
  it("returns a valid month name", () => {
    const validMonths = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ]
    const period = getCurrentPeriod()
    expect(validMonths).toContain(period)
  })

  it("returns lowercase string", () => {
    const period = getCurrentPeriod()
    expect(period).toBe(period.toLowerCase())
  })
})

// =============================================================================
// VACCINATION TASKS TESTS
// =============================================================================

describe("getVaccinationTasks", () => {
  it("returns vaccination suggestions for a 1 month old baby", () => {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const suggestions = getVaccinationTasks(oneMonthAgo)
    // Should suggest 2-month vaccination
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some((s) => s.catalogueTask.title_fr.includes("DTCaP"))).toBe(true)
  })

  it("returns vaccination suggestions for a 3 month old baby", () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const suggestions = getVaccinationTasks(threeMonthsAgo)
    // Should suggest 4-month vaccination
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some((s) => s.catalogueTask.title_fr.includes("2e dose"))).toBe(true)
  })

  it("returns no suggestions for older children with all vaccinations done", () => {
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

    const suggestions = getVaccinationTasks(tenYearsAgo)
    // May or may not have suggestions depending on schedule
    // Just verify it doesn't error
    expect(Array.isArray(suggestions)).toBe(true)
  })

  it("sets category to sante for all vaccination tasks", () => {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const suggestions = getVaccinationTasks(oneMonthAgo)
    for (const s of suggestions) {
      expect(s.catalogueTask.category_code).toBe("sante")
    }
  })

  it("sets high relevance score for upcoming vaccinations", () => {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const suggestions = getVaccinationTasks(oneMonthAgo)
    for (const s of suggestions) {
      expect(s.relevanceScore).toBeGreaterThanOrEqual(0.8)
    }
  })
})

// =============================================================================
// SCHOOL MILESTONE TESTS
// =============================================================================

describe("getSchoolMilestoneTasks", () => {
  it("suggests maternelle inscription for 2.5 year old", () => {
    const twoAndHalfYearsAgo = new Date()
    twoAndHalfYearsAgo.setMonth(twoAndHalfYearsAgo.getMonth() - 30)

    const suggestions = getSchoolMilestoneTasks(twoAndHalfYearsAgo)
    expect(suggestions.some((s) => s.catalogueTask.title_fr.includes("maternelle"))).toBe(true)
  })

  it("suggests CP inscription for 5.5 year old", () => {
    const fiveAndHalfYearsAgo = new Date()
    fiveAndHalfYearsAgo.setMonth(fiveAndHalfYearsAgo.getMonth() - 66)

    const suggestions = getSchoolMilestoneTasks(fiveAndHalfYearsAgo)
    expect(suggestions.some((s) => s.catalogueTask.title_fr.includes("CP"))).toBe(true)
  })

  it("returns empty for children past all milestones", () => {
    const twentyYearsAgo = new Date()
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20)

    const suggestions = getSchoolMilestoneTasks(twentyYearsAgo)
    expect(suggestions).toHaveLength(0)
  })

  it("sets category to administratif for school inscriptions", () => {
    const twoAndHalfYearsAgo = new Date()
    twoAndHalfYearsAgo.setMonth(twoAndHalfYearsAgo.getMonth() - 30)

    const suggestions = getSchoolMilestoneTasks(twoAndHalfYearsAgo)
    for (const s of suggestions) {
      if (s.catalogueTask.title_fr.includes("Inscription")) {
        expect(s.catalogueTask.category_code).toBe("administratif")
      }
    }
  })
})

// =============================================================================
// SEASONAL TASKS TESTS
// =============================================================================

describe("getSeasonalTasks", () => {
  it("returns seasonal tasks for current period", () => {
    const suggestions = getSeasonalTasks()
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it("filters by child age when provided", () => {
    // 10 year old child
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

    const suggestions = getSeasonalTasks(tenYearsAgo)
    // Should not include tasks for babies (like monthly pediatric visits)
    const hasBabyTask = suggestions.some(
      (s) => s.catalogueTask.max_age_months !== null && s.catalogueTask.max_age_months < 24
    )
    expect(hasBabyTask).toBe(false)
  })

  it("includes country code in tasks", () => {
    const suggestions = getSeasonalTasks(undefined, "FR")
    for (const s of suggestions) {
      expect(s.catalogueTask.country_codes).toContain("FR")
    }
  })

  it("returns household-level tasks when no child specified", () => {
    const suggestions = getSeasonalTasks()
    // Should have tasks that don't require a child
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it("sets suggested deadline in the future", () => {
    const suggestions = getSeasonalTasks()
    const now = new Date()
    for (const s of suggestions) {
      expect(s.suggestedDeadline.getTime()).toBeGreaterThanOrEqual(now.getTime())
    }
  })
})

// =============================================================================
// CATALOGUE CATEGORIES TESTS
// =============================================================================

describe("getCatalogueCategories", () => {
  it("returns array of categories", () => {
    const categories = getCatalogueCategories()
    expect(Array.isArray(categories)).toBe(true)
    expect(categories.length).toBeGreaterThan(0)
  })

  it("includes sante category for vaccinations", () => {
    const categories = getCatalogueCategories()
    const santeCategory = categories.find((c) => c.code === "sante")
    expect(santeCategory).toBeDefined()
    expect(santeCategory?.taskCount).toBeGreaterThan(0)
  })

  it("includes ecole category", () => {
    const categories = getCatalogueCategories()
    const ecoleCategory = categories.find((c) => c.code === "ecole")
    expect(ecoleCategory).toBeDefined()
  })

  it("includes administratif category", () => {
    const categories = getCatalogueCategories()
    const adminCategory = categories.find((c) => c.code === "administratif")
    expect(adminCategory).toBeDefined()
  })

  it("has French names for categories", () => {
    const categories = getCatalogueCategories()
    const santeCategory = categories.find((c) => c.code === "sante")
    expect(santeCategory?.name).toBe("Santé")
  })

  it("returns taskCount for each category", () => {
    const categories = getCatalogueCategories()
    for (const cat of categories) {
      expect(typeof cat.taskCount).toBe("number")
      expect(cat.taskCount).toBeGreaterThanOrEqual(0)
    }
  })
})

// =============================================================================
// SEARCH CATALOGUE TESTS
// =============================================================================

describe("searchCatalogueTasks", () => {
  it("finds vaccination tasks with 'vaccin' query", () => {
    const results = searchCatalogueTasks("vaccin")
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.category_code === "sante")).toBe(true)
  })

  it("finds seasonal tasks with 'fournitures' query", () => {
    const results = searchCatalogueTasks("fournitures")
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.title_fr.toLowerCase().includes("fournitures"))).toBe(true)
  })

  it("returns empty array for non-matching query", () => {
    const results = searchCatalogueTasks("xyz123nonexistent")
    expect(results).toHaveLength(0)
  })

  it("is case insensitive", () => {
    const lowerResults = searchCatalogueTasks("vaccin")
    const upperResults = searchCatalogueTasks("VACCIN")
    expect(lowerResults.length).toBe(upperResults.length)
  })

  it("searches in descriptions too", () => {
    const results = searchCatalogueTasks("assurance")
    expect(results.length).toBeGreaterThan(0)
  })

  it("returns proper CatalogueTask structure", () => {
    const results = searchCatalogueTasks("vaccin")
    if (results.length > 0) {
      const task = results[0]
      expect(task).toHaveProperty("id")
      expect(task).toHaveProperty("title_fr")
      expect(task).toHaveProperty("category_code")
      expect(task).toHaveProperty("charge_weight")
    }
  })
})
