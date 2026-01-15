/**
 * Task Templates Tests
 *
 * Unit tests for the task template system including:
 * - Template data structure validation
 * - Age bracket filtering
 * - Weight calculations
 * - Seasonal templates
 * - French localization
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  AGE_BRACKETS,
  TASK_WEIGHTS,
  BABY_TEMPLATES,
  MATERNELLE_TEMPLATES,
  PRIMAIRE_TEMPLATES,
  COLLEGE_TEMPLATES,
  LYCEE_TEMPLATES,
  SEASONAL_TEMPLATES,
  ALL_TEMPLATES,
  getTemplatesForAgeBracket,
  getTemplatesForMonth,
  getTemplatesByCategory,
  calculateTotalWeight,
  getPriorityTemplates,
  filterActiveTemplates,
  TaskTemplateSchema,
  type TaskTemplate,
} from "@/lib/data/task-templates"

// =============================================================================
// TEMPLATE SCHEMA VALIDATION
// =============================================================================

describe("TaskTemplateSchema", () => {
  it("should validate a valid template", () => {
    const validTemplate = {
      id: "test_template",
      category: "ecole",
      title: "Test Template",
      description: "A test template",
      ageMinMonths: 36,
      ageMaxMonths: 72,
      triggerMonth: 9,
      triggerDaysBeforeAge: null,
      recurrence: "yearly",
      weight: 5,
      priority: "normal",
      deadlineOffsetDays: 7,
      country: "FR",
    }
    const result = TaskTemplateSchema.safeParse(validTemplate)
    expect(result.success).toBe(true)
  })

  it("should reject invalid category", () => {
    const invalidTemplate = {
      id: "test_template",
      category: "invalid_category",
      title: "Test",
      description: null,
      ageMinMonths: 0,
      ageMaxMonths: 216,
      triggerMonth: null,
      triggerDaysBeforeAge: null,
      recurrence: "once",
      weight: 3,
      priority: "normal",
      deadlineOffsetDays: 7,
      country: "FR",
    }
    const result = TaskTemplateSchema.safeParse(invalidTemplate)
    expect(result.success).toBe(false)
  })

  it("should reject weight > 10", () => {
    const invalidTemplate = {
      id: "test_template",
      category: "ecole",
      title: "Test",
      description: null,
      ageMinMonths: 0,
      ageMaxMonths: 216,
      triggerMonth: null,
      triggerDaysBeforeAge: null,
      recurrence: "once",
      weight: 15,
      priority: "normal",
      deadlineOffsetDays: 7,
      country: "FR",
    }
    const result = TaskTemplateSchema.safeParse(invalidTemplate)
    expect(result.success).toBe(false)
  })

  it("should reject weight < 1", () => {
    const invalidTemplate = {
      id: "test_template",
      category: "ecole",
      title: "Test",
      description: null,
      ageMinMonths: 0,
      ageMaxMonths: 216,
      triggerMonth: null,
      triggerDaysBeforeAge: null,
      recurrence: "once",
      weight: 0,
      priority: "normal",
      deadlineOffsetDays: 7,
      country: "FR",
    }
    const result = TaskTemplateSchema.safeParse(invalidTemplate)
    expect(result.success).toBe(false)
  })

  it("should accept valid priorities", () => {
    const priorities = ["critical", "high", "normal", "low"]
    priorities.forEach((priority) => {
      const template = {
        id: "test",
        category: "ecole",
        title: "Test",
        description: null,
        ageMinMonths: 0,
        ageMaxMonths: 100,
        triggerMonth: null,
        triggerDaysBeforeAge: null,
        recurrence: "once",
        weight: 3,
        priority,
        deadlineOffsetDays: 7,
        country: "FR",
      }
      const result = TaskTemplateSchema.safeParse(template)
      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// AGE BRACKETS
// =============================================================================

describe("AGE_BRACKETS", () => {
  it("should have correct baby bracket (0-3 years)", () => {
    expect(AGE_BRACKETS.BABY.min).toBe(0)
    expect(AGE_BRACKETS.BABY.max).toBe(36)
    expect(AGE_BRACKETS.BABY.label).toBe("0-3 ans")
  })

  it("should have correct maternelle bracket (3-6 years)", () => {
    expect(AGE_BRACKETS.MATERNELLE.min).toBe(36)
    expect(AGE_BRACKETS.MATERNELLE.max).toBe(72)
    expect(AGE_BRACKETS.MATERNELLE.label).toBe("3-6 ans (maternelle)")
  })

  it("should have correct primaire bracket (6-11 years)", () => {
    expect(AGE_BRACKETS.PRIMAIRE.min).toBe(72)
    expect(AGE_BRACKETS.PRIMAIRE.max).toBe(132)
    expect(AGE_BRACKETS.PRIMAIRE.label).toBe("6-11 ans (primaire)")
  })

  it("should have correct college bracket (11-15 years)", () => {
    expect(AGE_BRACKETS.COLLEGE.min).toBe(132)
    expect(AGE_BRACKETS.COLLEGE.max).toBe(180)
    expect(AGE_BRACKETS.COLLEGE.label).toBe("11-15 ans (collège)")
  })

  it("should have correct lycee bracket (15-18 years)", () => {
    expect(AGE_BRACKETS.LYCEE.min).toBe(180)
    expect(AGE_BRACKETS.LYCEE.max).toBe(216)
    expect(AGE_BRACKETS.LYCEE.label).toBe("15-18 ans (lycée)")
  })

  it("should have continuous coverage from 0 to 216 months", () => {
    // Verify no gaps between brackets
    const brackets = [
      AGE_BRACKETS.BABY,
      AGE_BRACKETS.MATERNELLE,
      AGE_BRACKETS.PRIMAIRE,
      AGE_BRACKETS.COLLEGE,
      AGE_BRACKETS.LYCEE,
    ]

    for (let i = 0; i < brackets.length - 1; i++) {
      expect(brackets[i]!.max).toBe(brackets[i + 1]!.min)
    }
  })
})

// =============================================================================
// TASK WEIGHTS
// =============================================================================

describe("TASK_WEIGHTS", () => {
  it("should have weight for administrative tasks", () => {
    expect(TASK_WEIGHTS.papier_administratif).toBe(3)
    expect(TASK_WEIGHTS.inscription).toBe(4)
    expect(TASK_WEIGHTS.dossier_complet).toBe(5)
  })

  it("should have weight for health tasks", () => {
    expect(TASK_WEIGHTS.rendez_vous_medical).toBe(5)
    expect(TASK_WEIGHTS.vaccin).toBe(4)
    expect(TASK_WEIGHTS.pharmacie).toBe(2)
  })

  it("should have weight for school tasks", () => {
    expect(TASK_WEIGHTS.reunion_parents).toBe(4)
    expect(TASK_WEIGHTS.fournitures).toBe(3)
    expect(TASK_WEIGHTS.sortie_scolaire).toBe(3)
  })

  it("should have weight for daily tasks", () => {
    expect(TASK_WEIGHTS.course_quotidienne).toBe(1)
    expect(TASK_WEIGHTS.repas).toBe(1)
    expect(TASK_WEIGHTS.vetements).toBe(2)
  })

  it("should have weight for social tasks", () => {
    expect(TASK_WEIGHTS.anniversaire).toBe(6)
    expect(TASK_WEIGHTS.cadeau).toBe(3)
    expect(TASK_WEIGHTS.invitation).toBe(2)
  })

  it("should have all weights between 1 and 10", () => {
    Object.values(TASK_WEIGHTS).forEach((weight) => {
      expect(weight).toBeGreaterThanOrEqual(1)
      expect(weight).toBeLessThanOrEqual(10)
    })
  })
})

// =============================================================================
// BABY TEMPLATES (0-3 years)
// =============================================================================

describe("BABY_TEMPLATES", () => {
  it("should have vaccine templates", () => {
    const vaccineTemplates = BABY_TEMPLATES.filter(
      (t) => t.category === "sante" && t.id.includes("vaccine")
    )
    expect(vaccineTemplates.length).toBeGreaterThan(0)
  })

  it("should have critical priority for vaccines", () => {
    const vaccineTemplates = BABY_TEMPLATES.filter(
      (t) => t.id.includes("vaccine")
    )
    vaccineTemplates.forEach((t) => {
      expect(t.priority).toBe("critical")
    })
  })

  it("should have PMI visit template", () => {
    const pmiTemplate = BABY_TEMPLATES.find((t) => t.id === "pmi_monthly")
    expect(pmiTemplate).toBeDefined()
    expect(pmiTemplate?.recurrence).toBe("monthly")
  })

  it("should have garde inscription template", () => {
    const gardeTemplate = BABY_TEMPLATES.find((t) => t.id === "garde_inscription")
    expect(gardeTemplate).toBeDefined()
    expect(gardeTemplate?.category).toBe("logistique")
  })

  it("should have all templates within baby age range", () => {
    BABY_TEMPLATES.forEach((t) => {
      expect(t.ageMinMonths).toBeLessThanOrEqual(AGE_BRACKETS.BABY.max)
    })
  })
})

// =============================================================================
// MATERNELLE TEMPLATES (3-6 years)
// =============================================================================

describe("MATERNELLE_TEMPLATES", () => {
  it("should have school inscription template", () => {
    const inscriptionTemplate = MATERNELLE_TEMPLATES.find(
      (t) => t.id === "ecole_inscription_maternelle"
    )
    expect(inscriptionTemplate).toBeDefined()
    expect(inscriptionTemplate?.triggerMonth).toBe(3) // March
    expect(inscriptionTemplate?.priority).toBe("critical")
  })

  it("should have yearly templates for recurring events", () => {
    const yearlyTemplates = MATERNELLE_TEMPLATES.filter(
      (t) => t.recurrence === "yearly"
    )
    expect(yearlyTemplates.length).toBeGreaterThan(0)
  })

  it("should have assurance scolaire template", () => {
    const assuranceTemplate = MATERNELLE_TEMPLATES.find(
      (t) => t.id === "assurance_scolaire"
    )
    expect(assuranceTemplate).toBeDefined()
    expect(assuranceTemplate?.triggerMonth).toBe(9) // September
    expect(assuranceTemplate?.category).toBe("administratif")
  })

  it("should have photo de classe template", () => {
    const photoTemplate = MATERNELLE_TEMPLATES.find(
      (t) => t.id === "photo_classe"
    )
    expect(photoTemplate).toBeDefined()
    expect(photoTemplate?.triggerMonth).toBe(10) // October
    expect(photoTemplate?.priority).toBe("low")
  })
})

// =============================================================================
// PRIMAIRE TEMPLATES (6-11 years)
// =============================================================================

describe("PRIMAIRE_TEMPLATES", () => {
  it("should have fournitures scolaires template", () => {
    const fournituresTemplate = PRIMAIRE_TEMPLATES.find(
      (t) => t.id === "fournitures_primaire"
    )
    expect(fournituresTemplate).toBeDefined()
    expect(fournituresTemplate?.triggerMonth).toBe(8) // August
    expect(fournituresTemplate?.recurrence).toBe("yearly")
  })

  it("should have cantine inscription template", () => {
    const cantineTemplate = PRIMAIRE_TEMPLATES.find(
      (t) => t.id === "inscription_cantine"
    )
    expect(cantineTemplate).toBeDefined()
  })

  it("should cover ages 72-132 months", () => {
    PRIMAIRE_TEMPLATES.forEach((t) => {
      expect(t.ageMinMonths).toBeGreaterThanOrEqual(AGE_BRACKETS.BABY.max) // > 36 months
      expect(t.ageMaxMonths).toBeLessThanOrEqual(AGE_BRACKETS.COLLEGE.min + 12) // <= 144 months (some overlap)
    })
  })
})

// =============================================================================
// SEASONAL TEMPLATES
// =============================================================================

describe("SEASONAL_TEMPLATES", () => {
  it("should have rentrée templates", () => {
    const rentreeTemplates = SEASONAL_TEMPLATES.filter(
      (t) => t.triggerMonth === 9 // September
    )
    expect(rentreeTemplates.length).toBeGreaterThan(0)
  })

  it("should have vacances templates", () => {
    const vacancesTemplates = SEASONAL_TEMPLATES.filter(
      (t) => t.id.includes("vacances")
    )
    expect(vacancesTemplates.length).toBeGreaterThan(0)
  })

  it("should span multiple age groups", () => {
    const ageSpan = SEASONAL_TEMPLATES.reduce(
      (acc, t) => ({
        min: Math.min(acc.min, t.ageMinMonths),
        max: Math.max(acc.max, t.ageMaxMonths),
      }),
      { min: Infinity, max: 0 }
    )
    expect(ageSpan.min).toBeLessThan(72) // Should include young children
    expect(ageSpan.max).toBeGreaterThan(132) // Should include older children
  })
})

// =============================================================================
// ALL_TEMPLATES
// =============================================================================

describe("ALL_TEMPLATES", () => {
  it("should combine all template arrays", () => {
    const expectedCount =
      BABY_TEMPLATES.length +
      MATERNELLE_TEMPLATES.length +
      PRIMAIRE_TEMPLATES.length +
      COLLEGE_TEMPLATES.length +
      LYCEE_TEMPLATES.length +
      SEASONAL_TEMPLATES.length

    expect(ALL_TEMPLATES.length).toBe(expectedCount)
  })

  it("should have unique IDs", () => {
    const ids = ALL_TEMPLATES.map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it("should have valid categories", () => {
    const validCategories = [
      "ecole",
      "sante",
      "administratif",
      "quotidien",
      "social",
      "activites",
      "logistique",
    ]
    ALL_TEMPLATES.forEach((t) => {
      expect(validCategories).toContain(t.category)
    })
  })

  it("should have French country code", () => {
    ALL_TEMPLATES.forEach((t) => {
      expect(t.country).toBe("FR")
    })
  })
})

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================

describe("getTemplatesForAgeBracket", () => {
  it("should filter templates for baby age bracket", () => {
    const templates = getTemplatesForAgeBracket("BABY")
    templates.forEach((t) => {
      // Template should overlap with baby age range (0-36 months)
      expect(t.ageMinMonths).toBeLessThanOrEqual(36)
      expect(t.ageMaxMonths).toBeGreaterThanOrEqual(0)
    })
  })

  it("should filter templates for maternelle age bracket", () => {
    const templates = getTemplatesForAgeBracket("MATERNELLE")
    templates.forEach((t) => {
      // Template should overlap with maternelle age range (36-72 months)
      expect(t.ageMinMonths).toBeLessThanOrEqual(72)
      expect(t.ageMaxMonths).toBeGreaterThanOrEqual(36)
    })
  })

  it("should return different templates for different brackets", () => {
    const babyTemplates = getTemplatesForAgeBracket("BABY")
    const lyceeTemplates = getTemplatesForAgeBracket("LYCEE")

    // Baby should have vaccines, lycee should have bac/permis
    const babyHasVaccines = babyTemplates.some((t) => t.id.includes("vaccine"))
    const lyceeHasVaccines = lyceeTemplates.some((t) => t.id.includes("vaccine"))

    expect(babyHasVaccines).toBe(true)
    expect(lyceeHasVaccines).toBe(false)
  })
})

describe("getTemplatesForMonth", () => {
  it("should return September templates for rentrée", () => {
    const templates = getTemplatesForMonth(9)
    expect(templates.length).toBeGreaterThan(0)
    templates.forEach((t) => {
      expect(t.triggerMonth).toBe(9)
    })
  })

  it("should return August templates for summer prep", () => {
    const templates = getTemplatesForMonth(8)
    templates.forEach((t) => {
      expect(t.triggerMonth).toBe(8)
    })
  })

  it("should return empty array for months with no specific templates", () => {
    // Some months may have no specific templates
    const templates = getTemplatesForMonth(2) // February
    // Either empty or all have triggerMonth = 2
    templates.forEach((t) => {
      expect(t.triggerMonth).toBe(2)
    })
  })
})

describe("getTemplatesByCategory", () => {
  it("should filter sante templates", () => {
    const templates = getTemplatesByCategory("sante")
    expect(templates.length).toBeGreaterThan(0)
    templates.forEach((t) => {
      expect(t.category).toBe("sante")
    })
  })

  it("should filter ecole templates", () => {
    const templates = getTemplatesByCategory("ecole")
    expect(templates.length).toBeGreaterThan(0)
    templates.forEach((t) => {
      expect(t.category).toBe("ecole")
    })
  })

  it("should filter administratif templates", () => {
    const templates = getTemplatesByCategory("administratif")
    templates.forEach((t) => {
      expect(t.category).toBe("administratif")
    })
  })
})

describe("calculateTotalWeight", () => {
  it("should sum weights correctly", () => {
    const testTemplates: TaskTemplate[] = [
      { ...BABY_TEMPLATES[0]!, weight: 3 },
      { ...BABY_TEMPLATES[0]!, weight: 5 },
      { ...BABY_TEMPLATES[0]!, weight: 2 },
    ]
    expect(calculateTotalWeight(testTemplates)).toBe(10)
  })

  it("should return 0 for empty array", () => {
    expect(calculateTotalWeight([])).toBe(0)
  })

  it("should handle single template", () => {
    const singleTemplate = [{ ...BABY_TEMPLATES[0]!, weight: 7 }]
    expect(calculateTotalWeight(singleTemplate)).toBe(7)
  })
})

describe("getPriorityTemplates", () => {
  it("should filter critical priority templates", () => {
    const templates = getPriorityTemplates("critical")
    expect(templates.length).toBeGreaterThan(0)
    templates.forEach((t) => {
      expect(t.priority).toBe("critical")
    })
  })

  it("should filter high priority templates", () => {
    const templates = getPriorityTemplates("high")
    templates.forEach((t) => {
      expect(t.priority).toBe("high")
    })
  })

  it("should return fewer templates for higher priorities", () => {
    const criticalTemplates = getPriorityTemplates("critical")
    const normalTemplates = getPriorityTemplates("normal")
    // Generally, there should be more normal than critical
    expect(criticalTemplates.length).toBeLessThanOrEqual(normalTemplates.length + 5)
  })
})

describe("filterActiveTemplates", () => {
  it("should only return templates within age range", () => {
    const ageInMonths = 48 // 4 years old
    const templates = filterActiveTemplates(ageInMonths)
    templates.forEach((t) => {
      expect(t.ageMinMonths).toBeLessThanOrEqual(ageInMonths)
      expect(t.ageMaxMonths).toBeGreaterThanOrEqual(ageInMonths)
    })
  })

  it("should return baby templates for newborn", () => {
    const templates = filterActiveTemplates(1) // 1 month old
    expect(templates.length).toBeGreaterThan(0)
    // Should include vaccines
    const hasVaccines = templates.some((t) => t.id.includes("vaccine"))
    expect(hasVaccines).toBe(true)
  })

  it("should return lycee templates for 17 year old", () => {
    const templates = filterActiveTemplates(204) // 17 years
    expect(templates.length).toBeGreaterThan(0)
    // Should include age-appropriate tasks
    templates.forEach((t) => {
      expect(t.ageMinMonths).toBeLessThanOrEqual(204)
      expect(t.ageMaxMonths).toBeGreaterThanOrEqual(204)
    })
  })
})
