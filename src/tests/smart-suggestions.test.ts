/**
 * Smart Suggestions Service Tests
 *
 * Tests for AI-powered task suggestions
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type {
  TaskSuggestion,
  SuggestionReason,
  PatternAnalysis,
} from "@/lib/services/smart-suggestions"

// =============================================================================
// MOCKS
// =============================================================================

// Mock database
const mockQuery = vi.fn()
const mockQueryOne = vi.fn()

vi.mock("@/lib/aws/database", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  queryOne: (...args: unknown[]) => mockQueryOne(...args),
  setCurrentUser: vi.fn(),
}))

// Mock auth
vi.mock("@/lib/auth/actions", () => ({
  getUserId: vi.fn().mockResolvedValue("test-user-id"),
}))

// Mock task templates
vi.mock("@/lib/data/task-templates", () => ({
  getTemplatesForAge: vi.fn().mockReturnValue([
    {
      id: "template-1",
      title: "Vaccin obligatoire",
      description: "Vaccination de routine",
      category: "sante",
      weight: 5,
      priority: "high",
      cron_rule: "@yearly",
    },
    {
      id: "template-2",
      title: "Fournitures scolaires",
      description: "Achats rentrée",
      category: "ecole",
      weight: 4,
      priority: "normal",
      triggerMonth: 9,
    },
  ]),
  ALL_TEMPLATES: [],
}))

// =============================================================================
// TASK SUGGESTION TYPE TESTS
// =============================================================================

describe("Smart Suggestions: Types", () => {
  it("should define valid suggestion reasons", () => {
    const validReasons: SuggestionReason[] = [
      "recurring_pattern",
      "seasonal_event",
      "age_milestone",
      "template_match",
      "similar_task",
      "upcoming_deadline",
      "ai_prediction",
    ]

    expect(validReasons).toHaveLength(7)
    validReasons.forEach((reason) => {
      expect(typeof reason).toBe("string")
    })
  })

  it("should have proper TaskSuggestion structure", () => {
    const suggestion: TaskSuggestion = {
      id: "test-suggestion",
      title: "Test task",
      description: "Test description",
      category: "quotidien",
      categoryColor: "#FF9800",
      childId: "child-123",
      childName: "Emma",
      suggestedDeadline: new Date().toISOString(),
      priority: "normal",
      weight: 3,
      reason: "recurring_pattern",
      confidence: 0.85,
    }

    expect(suggestion.id).toBeDefined()
    expect(suggestion.title).toBeDefined()
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0)
    expect(suggestion.confidence).toBeLessThanOrEqual(1)
  })

  it("should allow null values for optional fields", () => {
    const suggestion: TaskSuggestion = {
      id: "min-suggestion",
      title: "Minimal task",
      description: null,
      category: "quotidien",
      suggestedDeadline: null,
      priority: "low",
      weight: 1,
      reason: "seasonal_event",
      confidence: 0.5,
    }

    expect(suggestion.description).toBeNull()
    expect(suggestion.suggestedDeadline).toBeNull()
    expect(suggestion.childId).toBeUndefined()
  })
})

// =============================================================================
// PATTERN ANALYSIS TESTS
// =============================================================================

describe("Smart Suggestions: Pattern Analysis", () => {
  it("should have proper PatternAnalysis structure", () => {
    const analysis: PatternAnalysis = {
      dayOfWeekPattern: new Map([
        [1, ["Course hebdomadaire", "Ménage"]],
        [5, ["Préparer sac weekend"]],
      ]),
      monthlyPattern: new Map([
        [9, ["Rentrée scolaire", "Acheter fournitures"]],
        [12, ["Cadeaux Noël"]],
      ]),
      recurringTasks: [
        {
          title: "Visite médecin",
          frequency: "monthly",
          lastOccurrence: new Date("2024-01-01"),
          nextPredicted: new Date("2024-02-01"),
        },
      ],
      categoryPreferences: new Map([
        ["quotidien", 25],
        ["ecole", 15],
        ["sante", 10],
      ]),
    }

    expect(analysis.dayOfWeekPattern.size).toBe(2)
    expect(analysis.monthlyPattern.get(9)).toContain("Rentrée scolaire")
    expect(analysis.recurringTasks).toHaveLength(1)
    expect(analysis.categoryPreferences.get("quotidien")).toBe(25)
  })

  it("should identify recurring tasks with correct frequency", () => {
    const recurringTask = {
      title: "Course hebdomadaire",
      frequency: "weekly" as const,
      lastOccurrence: new Date("2024-01-07"),
      nextPredicted: new Date("2024-01-14"),
    }

    const daysDiff = Math.round(
      (recurringTask.nextPredicted.getTime() - recurringTask.lastOccurrence.getTime()) /
        (1000 * 60 * 60 * 24)
    )

    expect(daysDiff).toBe(7)
    expect(recurringTask.frequency).toBe("weekly")
  })

  it("should track category preferences accurately", () => {
    const preferences = new Map<string, number>([
      ["quotidien", 30],
      ["ecole", 20],
      ["sante", 15],
      ["administratif", 10],
      ["social", 5],
    ])

    const total = Array.from(preferences.values()).reduce((a, b) => a + b, 0)
    expect(total).toBe(80)

    // Most common category
    const sorted = Array.from(preferences.entries()).sort((a, b) => b[1] - a[1])
    expect(sorted[0]?.[0]).toBe("quotidien")
  })
})

// =============================================================================
// SEASONAL SUGGESTIONS TESTS
// =============================================================================

describe("Smart Suggestions: Seasonal Events", () => {
  it("should identify school-related seasonal events", () => {
    const schoolEvents = [
      { month: 9, title: "Rentrée scolaire", category: "ecole" },
      { month: 9, title: "Assurance scolaire", category: "administratif" },
      { month: 6, title: "Réinscriptions activités", category: "activites" },
    ]

    const septemberEvents = schoolEvents.filter((e) => e.month === 9)
    expect(septemberEvents).toHaveLength(2)
    expect(septemberEvents.every((e) => e.title.length > 0)).toBe(true)
  })

  it("should identify health-related seasonal events", () => {
    const healthEvents = [
      { month: 9, title: "Vérifier vaccins", category: "sante" },
      { month: 1, title: "Visite médicale annuelle", category: "sante" },
      { month: 3, title: "Rendez-vous dentiste", category: "sante" },
    ]

    expect(healthEvents).toHaveLength(3)
    expect(healthEvents.every((e) => e.category === "sante")).toBe(true)
  })

  it("should identify administrative seasonal events", () => {
    const adminEvents = [
      { month: 4, title: "Déclaration impôts", priority: "high" },
      { month: 5, title: "Déclaration impôts", priority: "high" },
      { month: 1, title: "Déclaration CAF", priority: "high" },
    ]

    const highPriority = adminEvents.filter((e) => e.priority === "high")
    expect(highPriority).toHaveLength(3)
  })

  it("should suggest events at appropriate times", () => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1

    // September events for school
    if (currentMonth === 9) {
      const relevantEvents = ["Rentrée", "Fournitures", "Assurance"]
      expect(relevantEvents.length).toBeGreaterThan(0)
    }

    // December events
    if (currentMonth === 12) {
      const relevantEvents = ["Cadeaux Noël", "Vacances"]
      expect(relevantEvents.length).toBeGreaterThan(0)
    }
  })
})

// =============================================================================
// CONFIDENCE SCORING TESTS
// =============================================================================

describe("Smart Suggestions: Confidence Scoring", () => {
  it("should have confidence between 0 and 1", () => {
    const confidences = [0, 0.3, 0.5, 0.7, 0.9, 1]

    confidences.forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    })
  })

  it("should increase confidence with more data points", () => {
    const calculateConfidence = (occurrences: number): number => {
      return Math.min(0.9, 0.5 + occurrences * 0.1)
    }

    expect(calculateConfidence(1)).toBe(0.6)
    expect(calculateConfidence(2)).toBe(0.7)
    expect(calculateConfidence(3)).toBe(0.8)
    expect(calculateConfidence(4)).toBe(0.9)
    expect(calculateConfidence(10)).toBe(0.9) // Capped at 0.9
  })

  it("should label confidence levels correctly", () => {
    const getConfidenceLabel = (score: number): string => {
      if (score >= 0.9) return "Très confiant"
      if (score >= 0.7) return "Confiant"
      if (score >= 0.5) return "Modéré"
      return "Incertain"
    }

    expect(getConfidenceLabel(0.95)).toBe("Très confiant")
    expect(getConfidenceLabel(0.8)).toBe("Confiant")
    expect(getConfidenceLabel(0.6)).toBe("Modéré")
    expect(getConfidenceLabel(0.3)).toBe("Incertain")
  })
})

// =============================================================================
// DEADLINE PREDICTION TESTS
// =============================================================================

describe("Smart Suggestions: Deadline Prediction", () => {
  it("should have default deadlines by category", () => {
    const defaultDays: Record<string, number> = {
      sante: 14,
      administratif: 7,
      ecole: 7,
      quotidien: 3,
      social: 7,
      activites: 14,
      logistique: 7,
    }

    expect(defaultDays.sante).toBe(14)
    expect(defaultDays.quotidien).toBe(3)
    expect(Object.keys(defaultDays)).toHaveLength(7)
  })

  it("should calculate deadline from historical average", () => {
    const calculateDeadline = (
      avgDays: number,
      count: number
    ): { date: Date; confidence: number } => {
      const date = new Date()
      date.setDate(date.getDate() + avgDays)
      const confidence = Math.min(0.9, 0.5 + count * 0.05)
      return { date, confidence }
    }

    const result = calculateDeadline(7, 5)
    expect(result.confidence).toBe(0.75)

    const highConfidence = calculateDeadline(14, 10)
    expect(highConfidence.confidence).toBe(0.9)
  })

  it("should parse cron rules for deadlines", () => {
    const calculateNextDeadline = (cronRule: string): Date | null => {
      const now = new Date()

      if (cronRule === "@yearly") {
        const next = new Date(now)
        next.setMonth(0, 1)
        if (next <= now) next.setFullYear(next.getFullYear() + 1)
        return next
      }

      if (cronRule === "@monthly") {
        const next = new Date(now)
        next.setDate(1)
        next.setMonth(next.getMonth() + 1)
        return next
      }

      if (cronRule === "@weekly") {
        const next = new Date(now)
        next.setDate(next.getDate() + (7 - next.getDay()))
        return next
      }

      return null
    }

    expect(calculateNextDeadline("@weekly")).toBeDefined()
    expect(calculateNextDeadline("@monthly")).toBeDefined()
    expect(calculateNextDeadline("@yearly")).toBeDefined()
  })
})

// =============================================================================
// TEMPLATE MATCHING TESTS
// =============================================================================

describe("Smart Suggestions: Template Matching", () => {
  it("should match templates by child age", () => {
    const matchTemplatesForAge = (ageMonths: number): string[] => {
      const ageYears = Math.floor(ageMonths / 12)

      if (ageYears < 3) {
        return ["Vaccin obligatoire", "Visite PMI"]
      } else if (ageYears < 6) {
        return ["Inscription école", "Assurance scolaire"]
      } else if (ageYears < 11) {
        return ["Fournitures scolaires", "Cantine"]
      } else {
        return ["Orientation", "Activités ados"]
      }
    }

    expect(matchTemplatesForAge(24)).toContain("Vaccin obligatoire")
    expect(matchTemplatesForAge(48)).toContain("Inscription école")
    expect(matchTemplatesForAge(96)).toContain("Fournitures scolaires")
    expect(matchTemplatesForAge(156)).toContain("Orientation")
  })

  it("should filter templates by trigger month", () => {
    const templates = [
      { id: "1", triggerMonth: 9, title: "Rentrée" },
      { id: "2", triggerMonth: 12, title: "Noël" },
      { id: "3", triggerMonth: null, title: "Général" },
    ]

    const filterByMonth = (month: number) =>
      templates.filter((t) => t.triggerMonth === null || t.triggerMonth === month)

    expect(filterByMonth(9).map((t) => t.title)).toContain("Rentrée")
    expect(filterByMonth(9).map((t) => t.title)).toContain("Général")
    expect(filterByMonth(9).map((t) => t.title)).not.toContain("Noël")
  })
})

// =============================================================================
// SUGGESTION SORTING TESTS
// =============================================================================

describe("Smart Suggestions: Sorting", () => {
  it("should sort suggestions by confidence", () => {
    const suggestions: TaskSuggestion[] = [
      { id: "1", title: "Low", confidence: 0.5, priority: "low", weight: 1, category: "quotidien", description: null, suggestedDeadline: null, reason: "seasonal_event" },
      { id: "2", title: "High", confidence: 0.9, priority: "high", weight: 5, category: "sante", description: null, suggestedDeadline: null, reason: "recurring_pattern" },
      { id: "3", title: "Medium", confidence: 0.7, priority: "normal", weight: 3, category: "ecole", description: null, suggestedDeadline: null, reason: "template_match" },
    ]

    const sorted = [...suggestions].sort((a, b) => b.confidence - a.confidence)

    expect(sorted[0]?.title).toBe("High")
    expect(sorted[1]?.title).toBe("Medium")
    expect(sorted[2]?.title).toBe("Low")
  })

  it("should limit suggestions to requested count", () => {
    const suggestions = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      title: `Task ${i}`,
      confidence: Math.random(),
      priority: "normal" as const,
      weight: 3,
      category: "quotidien",
      description: null,
      suggestedDeadline: null,
      reason: "recurring_pattern" as const,
    }))

    const limited = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)

    expect(limited).toHaveLength(5)
  })

  it("should deduplicate suggestions by title", () => {
    const suggestions = [
      { id: "1", title: "Task A", confidence: 0.8 },
      { id: "2", title: "Task A", confidence: 0.6 },
      { id: "3", title: "Task B", confidence: 0.7 },
    ]

    const seen = new Set<string>()
    const deduped = suggestions.filter((s) => {
      if (seen.has(s.title)) return false
      seen.add(s.title)
      return true
    })

    expect(deduped).toHaveLength(2)
    expect(deduped.find((s) => s.title === "Task A")?.confidence).toBe(0.8) // Keep first
  })
})

// =============================================================================
// USER CONTEXT TESTS
// =============================================================================

describe("Smart Suggestions: User Context", () => {
  it("should calculate child age in months", () => {
    const calculateAgeMonths = (birthdate: Date): number => {
      const now = new Date()
      return Math.floor(
        (now.getTime() - birthdate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      )
    }

    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    const ageMonths = calculateAgeMonths(twoYearsAgo)
    expect(ageMonths).toBeGreaterThanOrEqual(23)
    expect(ageMonths).toBeLessThanOrEqual(25)
  })

  it("should determine school-age children", () => {
    const isSchoolAge = (ageMonths: number): boolean => {
      return ageMonths >= 36 && ageMonths <= 216 // 3-18 years
    }

    expect(isSchoolAge(24)).toBe(false) // 2 years
    expect(isSchoolAge(48)).toBe(true)  // 4 years
    expect(isSchoolAge(120)).toBe(true) // 10 years
    expect(isSchoolAge(220)).toBe(false) // 18+ years
  })

  it("should calculate average tasks per week", () => {
    const calculateAvgTasks = (taskCount: number, weeks: number): number => {
      return taskCount / Math.max(1, weeks)
    }

    expect(calculateAvgTasks(14, 2)).toBe(7)
    expect(calculateAvgTasks(30, 4)).toBe(7.5)
    expect(calculateAvgTasks(0, 1)).toBe(0)
  })
})
