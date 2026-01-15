/**
 * Period-Based Tasks Service Tests
 *
 * Unit tests for period detection and seasonal task generation.
 * Tests period configuration, transitions, and task filtering by period.
 */

import { describe, it, expect } from "vitest"
import {
  PERIODS,
  PERIOD_TASKS,
  getCurrentPeriod,
  getCurrentPeriodInfo,
  getPeriodConfig,
  isPeriodActive,
  getStaticTemplatesForPeriod,
  checkPeriodTransition,
  getPeriodTips,
} from "@/lib/services/period-tasks"
import type { PeriodType } from "@/types/template"

// =============================================================================
// PERIOD CONFIGURATION TESTS
// =============================================================================

describe("Period Configuration", () => {
  describe("PERIODS constant", () => {
    it("should have 6 periods defined", () => {
      expect(PERIODS).toHaveLength(6)
    })

    it("should cover all months of the year", () => {
      const coveredMonths = new Set<number>()
      for (const period of PERIODS) {
        for (let m = period.monthStart; m !== (period.monthEnd % 12) + 1; m = (m % 12) + 1) {
          coveredMonths.add(m)
        }
        coveredMonths.add(period.monthEnd)
      }
      expect(coveredMonths.size).toBe(12)
    })

    it("should have French and English labels", () => {
      for (const period of PERIODS) {
        expect(period.labelFr).toBeTruthy()
        expect(period.labelEn).toBeTruthy()
        expect(period.labelFr).not.toBe(period.labelEn)
      }
    })

    it("should have icons for all periods", () => {
      for (const period of PERIODS) {
        expect(period.icon).toBeTruthy()
      }
    })

    it("should have valid month ranges", () => {
      for (const period of PERIODS) {
        expect(period.monthStart).toBeGreaterThanOrEqual(1)
        expect(period.monthStart).toBeLessThanOrEqual(12)
        expect(period.monthEnd).toBeGreaterThanOrEqual(1)
        expect(period.monthEnd).toBeLessThanOrEqual(12)
      }
    })
  })

  describe("PERIOD_TASKS constant", () => {
    it("should have tasks for all periods", () => {
      const expectedPeriods: PeriodType[] = [
        "rentree",
        "toussaint",
        "noel",
        "hiver",
        "printemps",
        "ete",
        "year_round",
      ]
      for (const period of expectedPeriods) {
        expect(PERIOD_TASKS).toHaveProperty(period)
        expect(Array.isArray(PERIOD_TASKS[period])).toBe(true)
      }
    })

    it("should have most tasks for rentree (back to school)", () => {
      const rentreeTasks = PERIOD_TASKS.rentree
      expect(rentreeTasks.length).toBeGreaterThan(5)
      expect(rentreeTasks).toContain("Assurance scolaire")
      expect(rentreeTasks).toContain("Fournitures scolaires")
    })

    it("should have Parcoursup tasks for hiver", () => {
      const hiverTasks = PERIOD_TASKS.hiver
      expect(hiverTasks).toContain("Inscription Parcoursup")
    })

    it("should have empty year_round tasks", () => {
      expect(PERIOD_TASKS.year_round).toEqual([])
    })
  })
})

// =============================================================================
// PERIOD DETECTION TESTS (using current date)
// =============================================================================

describe("Period Detection", () => {
  describe("getCurrentPeriod", () => {
    it("should return a valid period code", () => {
      const period = getCurrentPeriod()
      const validPeriods: PeriodType[] = [
        "rentree",
        "toussaint",
        "noel",
        "hiver",
        "printemps",
        "ete",
        "year_round",
      ]
      expect(validPeriods).toContain(period)
    })

    it("should match the current month", () => {
      const month = new Date().getMonth() + 1
      const period = getCurrentPeriod()
      const config = getPeriodConfig(period)

      if (config) {
        // Period should contain current month
        if (config.monthStart <= config.monthEnd) {
          expect(month).toBeGreaterThanOrEqual(config.monthStart)
          expect(month).toBeLessThanOrEqual(config.monthEnd)
        } else {
          // Wrapping range (e.g., December-January)
          expect(month >= config.monthStart || month <= config.monthEnd).toBe(true)
        }
      }
    })
  })

  describe("getCurrentPeriodInfo", () => {
    it("should return complete period info", () => {
      const info = getCurrentPeriodInfo()

      expect(info).toHaveProperty("current")
      expect(info).toHaveProperty("daysRemaining")
      expect(info).toHaveProperty("nextPeriod")
      expect(info).toHaveProperty("daysUntilNext")
    })

    it("should have valid current period config", () => {
      const info = getCurrentPeriodInfo()

      expect(info.current.code).toBeTruthy()
      expect(info.current.labelFr).toBeTruthy()
      expect(info.current.labelEn).toBeTruthy()
    })

    it("should have non-negative days remaining", () => {
      const info = getCurrentPeriodInfo()
      expect(info.daysRemaining).toBeGreaterThanOrEqual(0)
    })

    it("should have positive days until next period", () => {
      const info = getCurrentPeriodInfo()
      expect(info.daysUntilNext).toBeGreaterThanOrEqual(0)
    })

    it("should have different current and next periods", () => {
      const info = getCurrentPeriodInfo()
      expect(info.nextPeriod.code).not.toBe(info.current.code)
    })
  })
})

// =============================================================================
// PERIOD CONFIG LOOKUP TESTS
// =============================================================================

describe("Period Config Lookup", () => {
  describe("getPeriodConfig", () => {
    it("should return config for valid period code", () => {
      const config = getPeriodConfig("rentree")
      expect(config).not.toBeNull()
      expect(config!.code).toBe("rentree")
      expect(config!.labelFr).toBe("Rentrée")
    })

    it("should return null for invalid period code", () => {
      const config = getPeriodConfig("invalid" as PeriodType)
      expect(config).toBeNull()
    })

    it("should return correct months for rentree", () => {
      const rentree = getPeriodConfig("rentree")
      expect(rentree!.monthStart).toBe(8)
      expect(rentree!.monthEnd).toBe(9)
    })

    it("should return correct months for noel", () => {
      const noel = getPeriodConfig("noel")
      expect(noel!.monthStart).toBe(12)
      expect(noel!.monthEnd).toBe(12)
    })

    it("should return correct months for hiver", () => {
      const hiver = getPeriodConfig("hiver")
      expect(hiver!.monthStart).toBe(1)
      expect(hiver!.monthEnd).toBe(2)
    })

    it("should return config for all standard periods", () => {
      const periods: PeriodType[] = ["rentree", "toussaint", "noel", "hiver", "printemps", "ete"]
      for (const period of periods) {
        const config = getPeriodConfig(period)
        expect(config).not.toBeNull()
        expect(config!.code).toBe(period)
      }
    })
  })
})

// =============================================================================
// PERIOD ACTIVITY TESTS
// =============================================================================

describe("Period Activity", () => {
  describe("isPeriodActive", () => {
    it("should return true for current period", () => {
      const currentPeriod = getCurrentPeriod()
      // year_round is special, skip if that's current
      if (currentPeriod !== "year_round") {
        expect(isPeriodActive(currentPeriod)).toBe(true)
      }
    })

    it("should handle lookAhead parameter", () => {
      const currentPeriod = getCurrentPeriod()
      // Current period should be active with any lookAhead value
      if (currentPeriod !== "year_round") {
        expect(isPeriodActive(currentPeriod, 0)).toBe(true)
        expect(isPeriodActive(currentPeriod, 30)).toBe(true)
      }
    })
  })
})

// =============================================================================
// STATIC TEMPLATES TESTS
// =============================================================================

describe("Static Templates", () => {
  describe("getStaticTemplatesForPeriod", () => {
    it("should return task names for rentree", () => {
      const tasks = getStaticTemplatesForPeriod("rentree")
      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks).toContain("Assurance scolaire")
    })

    it("should return empty array for year_round", () => {
      const tasks = getStaticTemplatesForPeriod("year_round")
      expect(tasks).toEqual([])
    })

    it("should return task names for each period", () => {
      const periods: PeriodType[] = ["rentree", "toussaint", "noel", "hiver", "printemps", "ete"]
      for (const period of periods) {
        const tasks = getStaticTemplatesForPeriod(period)
        expect(Array.isArray(tasks)).toBe(true)
        expect(tasks.length).toBeGreaterThan(0)
      }
    })

    it("should have noel-specific tasks", () => {
      const tasks = getStaticTemplatesForPeriod("noel")
      expect(tasks.some((t) => t.includes("Noël") || t.includes("cadeaux"))).toBe(true)
    })
  })
})

// =============================================================================
// PERIOD TRANSITION TESTS
// =============================================================================

describe("Period Transition", () => {
  describe("checkPeriodTransition", () => {
    it("should return null or valid transition object", () => {
      const result = checkPeriodTransition()

      if (result !== null) {
        expect(result).toHaveProperty("isTransitioning")
        expect(result).toHaveProperty("message")
        expect(result).toHaveProperty("currentPeriod")
        expect(result).toHaveProperty("nextPeriod")
        expect(result).toHaveProperty("daysUntilTransition")
      }
    })

    it("should have valid transition data when transitioning", () => {
      const result = checkPeriodTransition()

      if (result?.isTransitioning) {
        expect(result.daysUntilTransition).toBeLessThanOrEqual(7)
        expect(result.message).toContain("période")
        expect(result.currentPeriod.code).not.toBe(result.nextPeriod.code)
      }
    })
  })
})

// =============================================================================
// PERIOD TIPS TESTS
// =============================================================================

describe("Period Tips", () => {
  describe("getPeriodTips", () => {
    it("should return tips for rentree", () => {
      const tips = getPeriodTips("rentree")
      expect(tips.length).toBeGreaterThan(0)
    })

    it("should return tips for all periods", () => {
      const periods: PeriodType[] = [
        "rentree",
        "toussaint",
        "noel",
        "hiver",
        "printemps",
        "ete",
        "year_round",
      ]

      for (const period of periods) {
        const tips = getPeriodTips(period)
        expect(Array.isArray(tips)).toBe(true)
        expect(tips.length).toBeGreaterThan(0)
      }
    })

    it("should have relevant content for noel", () => {
      const tips = getPeriodTips("noel")
      const hasRelevantTip = tips.some((t) =>
        t.toLowerCase().includes("cadeau") || t.toLowerCase().includes("noël")
      )
      expect(hasRelevantTip).toBe(true)
    })

    it("should have relevant content for hiver", () => {
      const tips = getPeriodTips("hiver")
      const hasRelevantTip = tips.some((t) =>
        t.toLowerCase().includes("parcoursup") || t.toLowerCase().includes("inscription")
      )
      expect(hasRelevantTip).toBe(true)
    })

    it("should have relevant content for rentree", () => {
      const tips = getPeriodTips("rentree")
      const hasRelevantTip = tips.some((t) =>
        t.toLowerCase().includes("fournitures") ||
        t.toLowerCase().includes("rentrée") ||
        t.toLowerCase().includes("assurance")
      )
      expect(hasRelevantTip).toBe(true)
    })
  })
})

// =============================================================================
// PERIOD CONSISTENCY TESTS
// =============================================================================

describe("Period Consistency", () => {
  it("should have consistent period codes between PERIODS and PERIOD_TASKS", () => {
    const periodCodes = PERIODS.map((p) => p.code)
    const taskPeriodCodes = Object.keys(PERIOD_TASKS)

    // All PERIODS should have tasks
    for (const code of periodCodes) {
      expect(taskPeriodCodes).toContain(code)
    }
  })

  it("should have sequential month coverage", () => {
    const periods = [...PERIODS].sort((a, b) => a.monthStart - b.monthStart)

    // Check that periods cover all months without gaps
    for (let month = 1; month <= 12; month++) {
      const hasCoverage = periods.some((p) => {
        if (p.monthStart <= p.monthEnd) {
          return month >= p.monthStart && month <= p.monthEnd
        }
        return month >= p.monthStart || month <= p.monthEnd
      })
      expect(hasCoverage).toBe(true)
    }
  })
})
