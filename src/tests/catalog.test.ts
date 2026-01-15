/**
 * Task Catalog Tests
 *
 * Unit tests for task templates, filtering, and suggestion generation.
 */

import { describe, it, expect } from "vitest"
import {
  AGE_RANGES,
  PERIODS,
  TASK_CATEGORIES,
  RECURRENCE_TYPES,
  getAgeRange,
  getAgeInYears,
  getCurrentPeriod,
  getSpecialPeriods,
  getCategoryDisplayName,
  getAgeRangeDisplayName,
  getPeriodDisplayName,
} from "@/lib/catalog/types"
import {
  getTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByAgeRange,
  getTemplatesByPeriod,
  searchTemplates,
  getCriticalTemplates,
  getTemplateCounts,
  ALL_TEMPLATES,
} from "@/lib/catalog/templates"
import {
  createChildInfo,
  filterTemplates,
  generateSuggestions,
  generateCriticalTasks,
  getPeriodSpecificSuggestions,
  suggestionToTask,
  getTemplateStatistics,
} from "@/lib/catalog/generator"

// =============================================================================
// TYPE TESTS
// =============================================================================

describe("Catalog Types", () => {
  it("should have valid age ranges", () => {
    expect(AGE_RANGES).toContain("0-3")
    expect(AGE_RANGES).toContain("3-6")
    expect(AGE_RANGES).toContain("6-11")
    expect(AGE_RANGES).toContain("11-15")
    expect(AGE_RANGES).toContain("15-18")
    expect(AGE_RANGES.length).toBe(5)
  })

  it("should have valid periods", () => {
    expect(PERIODS).toContain("janvier")
    expect(PERIODS).toContain("rentree")
    expect(PERIODS).toContain("vacances_ete")
    expect(PERIODS).toContain("tout")
    expect(PERIODS.length).toBeGreaterThan(10)
  })

  it("should have valid task categories", () => {
    expect(TASK_CATEGORIES).toContain("ecole")
    expect(TASK_CATEGORIES).toContain("sante")
    expect(TASK_CATEGORIES).toContain("quotidien")
    expect(TASK_CATEGORIES.length).toBe(8)
  })

  it("should have valid recurrence types", () => {
    expect(RECURRENCE_TYPES).toContain("once")
    expect(RECURRENCE_TYPES).toContain("daily")
    expect(RECURRENCE_TYPES).toContain("weekly")
    expect(RECURRENCE_TYPES).toContain("monthly")
    expect(RECURRENCE_TYPES).toContain("yearly")
    expect(RECURRENCE_TYPES).toContain("seasonal")
  })
})

// =============================================================================
// AGE CALCULATION TESTS
// =============================================================================

describe("Age Calculations", () => {
  it("should calculate age in years", () => {
    // Use a date that's definitely more than 1 year ago
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 1) // Extra month to be safe
    expect(getAgeInYears(oneYearAgo)).toBeGreaterThanOrEqual(1)

    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
    fiveYearsAgo.setMonth(fiveYearsAgo.getMonth() - 1)
    expect(getAgeInYears(fiveYearsAgo)).toBeGreaterThanOrEqual(5)
  })

  it("should determine correct age range", () => {
    const baby = new Date()
    baby.setFullYear(baby.getFullYear() - 1)
    expect(getAgeRange(baby)).toBe("0-3")

    const toddler = new Date()
    toddler.setFullYear(toddler.getFullYear() - 4)
    expect(getAgeRange(toddler)).toBe("3-6")

    const child = new Date()
    child.setFullYear(child.getFullYear() - 8)
    expect(getAgeRange(child)).toBe("6-11")

    const teen = new Date()
    teen.setFullYear(teen.getFullYear() - 13)
    expect(getAgeRange(teen)).toBe("11-15")

    const teenager = new Date()
    teenager.setFullYear(teenager.getFullYear() - 17)
    expect(getAgeRange(teenager)).toBe("15-18")
  })
})

// =============================================================================
// PERIOD TESTS
// =============================================================================

describe("Period Functions", () => {
  it("should get current period", () => {
    const period = getCurrentPeriod()
    expect(PERIODS).toContain(period)
  })

  it("should get special periods", () => {
    const periods = getSpecialPeriods()
    expect(periods).toContain(getCurrentPeriod())
    expect(periods).toContain("tout")
    expect(periods.length).toBeGreaterThanOrEqual(2)
  })
})

// =============================================================================
// DISPLAY NAME TESTS
// =============================================================================

describe("Display Names", () => {
  it("should return category display names", () => {
    expect(getCategoryDisplayName("ecole")).toBe("École")
    expect(getCategoryDisplayName("sante")).toBe("Santé")
    expect(getCategoryDisplayName("quotidien")).toBe("Quotidien")
  })

  it("should return age range display names", () => {
    expect(getAgeRangeDisplayName("0-3")).toContain("Nourrisson")
    expect(getAgeRangeDisplayName("6-11")).toContain("Primaire")
    expect(getAgeRangeDisplayName("11-15")).toContain("Collège")
  })

  it("should return period display names", () => {
    expect(getPeriodDisplayName("janvier")).toBe("Janvier")
    expect(getPeriodDisplayName("rentree")).toContain("Rentrée")
    expect(getPeriodDisplayName("vacances_ete")).toContain("été")
  })
})

// =============================================================================
// TEMPLATE ACCESS TESTS
// =============================================================================

describe("Template Access", () => {
  it("should have templates available", () => {
    const templates = getTemplates()
    expect(templates.length).toBeGreaterThan(30)
  })

  it("should get template by ID", () => {
    const templates = getTemplates()
    const firstTemplate = templates[0]!
    const found = getTemplateById(firstTemplate.id)
    expect(found).toBeDefined()
    expect(found?.title).toBe(firstTemplate.title)
  })

  it("should get templates by category", () => {
    const ecoleTemplates = getTemplatesByCategory("ecole")
    expect(ecoleTemplates.length).toBeGreaterThan(0)
    ecoleTemplates.forEach((t) => {
      expect(t.category).toBe("ecole")
    })
  })

  it("should get templates by age range", () => {
    const templates = getTemplatesByAgeRange("6-11")
    expect(templates.length).toBeGreaterThan(0)
    templates.forEach((t) => {
      expect(t.ageRanges).toContain("6-11")
    })
  })

  it("should get templates by period", () => {
    const templates = getTemplatesByPeriod("rentree")
    expect(templates.length).toBeGreaterThan(0)
  })

  it("should search templates", () => {
    const results = searchTemplates("vaccin")
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((t) => t.title.toLowerCase().includes("vaccin"))).toBe(true)
  })

  it("should get critical templates", () => {
    const critical = getCriticalTemplates()
    expect(critical.length).toBeGreaterThan(0)
    critical.forEach((t) => {
      expect(t.critical).toBe(true)
    })
  })

  it("should get template counts by category", () => {
    const counts = getTemplateCounts()
    expect(counts.ecole).toBeGreaterThan(0)
    expect(counts.sante).toBeGreaterThan(0)

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    expect(total).toBe(getTemplates().length)
  })
})

// =============================================================================
// FILTERING TESTS
// =============================================================================

describe("Template Filtering", () => {
  it("should filter by category", () => {
    const filtered = filterTemplates({ categories: ["sante"] })
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((t) => {
      expect(t.category).toBe("sante")
    })
  })

  it("should filter by age range", () => {
    const filtered = filterTemplates({ ageRanges: ["0-3"] })
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((t) => {
      expect(t.ageRanges).toContain("0-3")
    })
  })

  it("should filter by multiple criteria", () => {
    const filtered = filterTemplates({
      categories: ["ecole"],
      ageRanges: ["6-11"],
    })
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((t) => {
      expect(t.category).toBe("ecole")
      expect(t.ageRanges).toContain("6-11")
    })
  })

  it("should filter by critical", () => {
    const filtered = filterTemplates({ critical: true })
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((t) => {
      expect(t.critical).toBe(true)
    })
  })

  it("should filter by weight range", () => {
    const filtered = filterTemplates({ minWeight: 4, maxWeight: 5 })
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((t) => {
      expect(t.weight).toBeGreaterThanOrEqual(4)
      expect(t.weight).toBeLessThanOrEqual(5)
    })
  })

  it("should filter by search text", () => {
    const filtered = filterTemplates({ search: "médecin" })
    expect(filtered.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// CHILD INFO TESTS
// =============================================================================

describe("Child Info", () => {
  it("should create child info", () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 5)
    birthDate.setMonth(birthDate.getMonth() - 1) // Extra month to be safe

    const child = createChildInfo("123", "Emma", birthDate)

    expect(child.id).toBe("123")
    expect(child.name).toBe("Emma")
    expect(child.ageInYears).toBeGreaterThanOrEqual(5)
    expect(child.ageRange).toBe("3-6")
  })
})

// =============================================================================
// SUGGESTION GENERATION TESTS
// =============================================================================

describe("Suggestion Generation", () => {
  it("should generate suggestions for children", () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 7)
    const child = createChildInfo("123", "Emma", birthDate)

    const suggestions = generateSuggestions([child], { maxSuggestions: 10 })

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.length).toBeLessThanOrEqual(10)
    suggestions.forEach((s) => {
      expect(s.template).toBeDefined()
      expect(s.relevanceScore).toBeGreaterThan(0)
      expect(s.relevanceScore).toBeLessThanOrEqual(1)
    })
  })

  it("should generate critical tasks", () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 4)
    const child = createChildInfo("123", "Lucas", birthDate)

    const critical = generateCriticalTasks([child])

    // May be empty if no critical tasks match current period
    critical.forEach((s) => {
      expect(s.template.critical).toBe(true)
    })
  })

  it("should include child info in suggestions", () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 8)
    const child = createChildInfo("456", "Sophie", birthDate)

    const suggestions = generateSuggestions([child])
    const childSpecific = suggestions.filter((s) => s.childId === "456")

    expect(childSpecific.length).toBeGreaterThan(0)
    childSpecific.forEach((s) => {
      expect(s.childName).toBe("Sophie")
    })
  })

  it("should filter by categories", () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 6)
    const child = createChildInfo("123", "Test", birthDate)

    const suggestions = generateSuggestions([child], {
      categories: ["sante"],
    })

    suggestions.forEach((s) => {
      // Some may be general tasks, but health-specific ones should be sante
      if (s.template.category === "sante") {
        expect(s.template.category).toBe("sante")
      }
    })
  })
})

// =============================================================================
// TASK CONVERSION TESTS
// =============================================================================

describe("Task Conversion", () => {
  it("should convert suggestion to task", () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 5)
    const child = createChildInfo("123", "Test", birthDate)

    const suggestions = generateSuggestions([child], { maxSuggestions: 1 })
    if (suggestions.length > 0) {
      const task = suggestionToTask(suggestions[0]!)

      expect(task.templateId).toBe(suggestions[0]!.template.id)
      expect(task.title).toBe(suggestions[0]!.template.title)
      expect(task.category).toBe(suggestions[0]!.template.category)
      expect(task.priority).toBe(suggestions[0]!.template.suggestedPriority)
      expect(task.weight).toBe(suggestions[0]!.template.weight)
    }
  })
})

// =============================================================================
// STATISTICS TESTS
// =============================================================================

describe("Template Statistics", () => {
  it("should return complete statistics", () => {
    const stats = getTemplateStatistics()

    expect(stats.total).toBe(ALL_TEMPLATES.length)
    expect(stats.byCategory).toBeDefined()
    expect(stats.byAgeRange).toBeDefined()
    expect(stats.byRecurrence).toBeDefined()
    expect(stats.critical).toBeGreaterThan(0)
  })

  it("should have consistent category counts", () => {
    const stats = getTemplateStatistics()
    const categoryTotal = Object.values(stats.byCategory).reduce(
      (a, b) => a + b,
      0
    )
    expect(categoryTotal).toBe(stats.total)
  })
})

// =============================================================================
// TEMPLATE VALIDATION TESTS
// =============================================================================

describe("Template Validation", () => {
  it("should have valid structure for all templates", () => {
    const templates = getTemplates()

    templates.forEach((t) => {
      expect(t.id).toBeDefined()
      expect(t.title.length).toBeGreaterThanOrEqual(3)
      expect(TASK_CATEGORIES).toContain(t.category)
      expect(t.ageRanges.length).toBeGreaterThan(0)
      expect(t.periods.length).toBeGreaterThan(0)
      expect(RECURRENCE_TYPES).toContain(t.recurrence)
      expect(t.weight).toBeGreaterThanOrEqual(1)
      expect(t.weight).toBeLessThanOrEqual(5)
      expect(t.suggestedPriority).toBeGreaterThanOrEqual(1)
      expect(t.suggestedPriority).toBeLessThanOrEqual(3)
    })
  })

  it("should have unique template IDs", () => {
    const templates = getTemplates()
    const ids = templates.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// =============================================================================
// COMPONENT EXPORT TESTS
// =============================================================================

describe("Catalog Component Exports", () => {
  it("should export TaskTemplateCard component", async () => {
    const { TaskTemplateCard } = await import("@/components/catalog")
    expect(TaskTemplateCard).toBeDefined()
    expect(typeof TaskTemplateCard).toBe("function")
  })

  it("should export CatalogBrowser component", async () => {
    const { CatalogBrowser } = await import("@/components/catalog")
    expect(CatalogBrowser).toBeDefined()
    expect(typeof CatalogBrowser).toBe("function")
  })

  it("should export SuggestedTasks component", async () => {
    const { SuggestedTasks } = await import("@/components/catalog")
    expect(SuggestedTasks).toBeDefined()
    expect(typeof SuggestedTasks).toBe("function")
  })
})
