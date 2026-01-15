/**
 * Enhanced Vocal System Tests
 *
 * Tests for improved date parsing, confidence scoring,
 * and French expression support.
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  inferDeadlineEnhanced,
  inferDeadline,
  mapUrgencyToPriority,
  getConfidenceLabel,
  VocalAnalysisSchema,
  VocalTaskSchema,
} from "@/lib/vocal/analyze"
import {
  formatCommandSummary,
  CATEGORY_DISPLAY_NAMES,
} from "@/lib/vocal/command-history"

describe("inferDeadlineEnhanced", () => {
  describe("explicit dates", () => {
    it("should handle aujourd'hui", () => {
      const result = inferDeadlineEnhanced("aujourd'hui")
      expect(result.confidence).toBe(1)
      expect(result.source).toBe("explicit")
      expect(result.date).toBeDefined()

      const date = new Date(result.date!)
      const now = new Date()
      expect(date.getDate()).toBe(now.getDate())
    })

    it("should handle ce jour", () => {
      const result = inferDeadlineEnhanced("ce jour")
      expect(result.confidence).toBe(1)
      expect(result.source).toBe("explicit")
    })
  })

  describe("relative dates - simple", () => {
    it("should handle demain with high confidence", () => {
      const result = inferDeadlineEnhanced("demain")
      expect(result.confidence).toBe(1)
      expect(result.source).toBe("relative")
      expect(result.parsed_from).toBe("demain")

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(tomorrow.getDate())
    })

    it("should handle après-demain", () => {
      const result = inferDeadlineEnhanced("après-demain")
      expect(result.confidence).toBe(1)
      expect(result.source).toBe("relative")

      const afterTomorrow = new Date()
      afterTomorrow.setDate(afterTomorrow.getDate() + 2)
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(afterTomorrow.getDate())
    })
  })

  describe("relative dates - time of day", () => {
    it("should handle ce soir", () => {
      const result = inferDeadlineEnhanced("ce soir")
      expect(result.confidence).toBe(0.9)
      expect(result.source).toBe("relative")

      const parsed = new Date(result.date!)
      expect(parsed.getHours()).toBe(20)
    })

    it("should handle ce matin", () => {
      const result = inferDeadlineEnhanced("ce matin")
      expect(result.confidence).toBe(0.9)

      const parsed = new Date(result.date!)
      expect(parsed.getHours()).toBe(9)
    })

    it("should handle cet après-midi", () => {
      const result = inferDeadlineEnhanced("cet après-midi")
      expect(result.confidence).toBe(0.9)

      const parsed = new Date(result.date!)
      expect(parsed.getHours()).toBe(14)
    })
  })

  describe("relative dates - week references", () => {
    it("should handle cette semaine", () => {
      const result = inferDeadlineEnhanced("cette semaine")
      expect(result.confidence).toBe(0.7)
      expect(result.source).toBe("relative")
    })

    it("should handle la semaine prochaine", () => {
      const result = inferDeadlineEnhanced("la semaine prochaine")
      expect(result.confidence).toBe(0.8)

      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(nextWeek.getDate())
    })

    it("should handle dans 2 semaines", () => {
      const result = inferDeadlineEnhanced("dans 2 semaines")
      expect(result.confidence).toBe(0.9)
      expect(result.parsed_from).toBe("dans 2 semaine(s)")

      const twoWeeks = new Date()
      twoWeeks.setDate(twoWeeks.getDate() + 14)
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(twoWeeks.getDate())
    })

    it("should handle dans 3 jours", () => {
      const result = inferDeadlineEnhanced("dans 3 jours")
      expect(result.confidence).toBe(0.95)

      const threeDays = new Date()
      threeDays.setDate(threeDays.getDate() + 3)
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(threeDays.getDate())
    })
  })

  describe("relative dates - month references", () => {
    it("should handle le mois prochain", () => {
      const result = inferDeadlineEnhanced("le mois prochain")
      expect(result.confidence).toBe(0.8)

      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const parsed = new Date(result.date!)
      expect(parsed.getMonth()).toBe(nextMonth.getMonth())
    })

    it("should handle ce mois-ci", () => {
      const result = inferDeadlineEnhanced("ce mois-ci")
      expect(result.confidence).toBe(0.7)
    })
  })

  describe("French cultural expressions", () => {
    it("should handle après les vacances with low confidence", () => {
      const result = inferDeadlineEnhanced("après les vacances")
      expect(result.confidence).toBe(0.5)
      expect(result.source).toBe("inferred")

      const twoWeeks = new Date()
      twoWeeks.setDate(twoWeeks.getDate() + 14)
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(twoWeeks.getDate())
    })

    it("should handle rentrée", () => {
      const result = inferDeadlineEnhanced("à la rentrée")
      expect(result.confidence).toBe(0.6)
      expect(result.source).toBe("inferred")

      const parsed = new Date(result.date!)
      expect(parsed.getMonth()).toBe(8) // September
      expect(parsed.getDate()).toBe(1)
    })

    it("should handle fin d'année", () => {
      const result = inferDeadlineEnhanced("fin d'année")
      expect(result.confidence).toBe(0.7)

      const parsed = new Date(result.date!)
      expect(parsed.getMonth()).toBe(11) // December
      expect(parsed.getDate()).toBe(31)
    })
  })

  describe("French day names", () => {
    it("should handle lundi", () => {
      const result = inferDeadlineEnhanced("lundi")
      expect(result.confidence).toBe(0.85)

      const parsed = new Date(result.date!)
      expect(parsed.getDay()).toBe(1) // Monday
    })

    it("should handle vendredi prochain with higher confidence", () => {
      const result = inferDeadlineEnhanced("vendredi prochain")
      expect(result.confidence).toBe(0.95)
      expect(result.parsed_from).toBe("vendredi prochain")

      const parsed = new Date(result.date!)
      expect(parsed.getDay()).toBe(5) // Friday
    })

    it("should handle mercredi", () => {
      const result = inferDeadlineEnhanced("mercredi")
      const parsed = new Date(result.date!)
      expect(parsed.getDay()).toBe(3) // Wednesday
    })
  })

  describe("French date formats", () => {
    it("should handle le 15 janvier", () => {
      const result = inferDeadlineEnhanced("le 15 janvier")
      expect(result.confidence).toBe(0.95)
      expect(result.source).toBe("explicit")

      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(15)
      expect(parsed.getMonth()).toBe(0) // January
    })

    it("should handle 1er mars", () => {
      const result = inferDeadlineEnhanced("1er mars")
      expect(result.confidence).toBe(0.95)

      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(1)
      expect(parsed.getMonth()).toBe(2) // March
    })

    it("should handle 25 décembre", () => {
      const result = inferDeadlineEnhanced("25 décembre")
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(25)
      expect(parsed.getMonth()).toBe(11) // December
    })
  })

  describe("modifier patterns", () => {
    it("should handle avant demain", () => {
      const result = inferDeadlineEnhanced("avant demain")
      expect(result.confidence).toBeLessThan(1)
      expect(result.parsed_from).toContain("avant")

      // Should be today (day before tomorrow)
      const parsed = new Date(result.date!)
      const today = new Date()
      expect(parsed.getDate()).toBe(today.getDate())
    })

    it("should handle d'ici lundi", () => {
      const result = inferDeadlineEnhanced("d'ici lundi")
      expect(result.confidence).toBeLessThan(0.95)
      expect(result.parsed_from).toContain("d'ici")
    })
  })

  describe("null and default handling", () => {
    it("should return null date for null input", () => {
      const result = inferDeadlineEnhanced(null)
      expect(result.date).toBeNull()
      expect(result.confidence).toBe(1)
    })

    it("should return default date with low confidence for unparseable text", () => {
      const result = inferDeadlineEnhanced("quand j'aurai le temps")
      expect(result.confidence).toBe(0.3)
      expect(result.source).toBe("default")
      expect(result.parsed_from).toBeNull()

      // Default is +3 days
      const threeDays = new Date()
      threeDays.setDate(threeDays.getDate() + 3)
      const parsed = new Date(result.date!)
      expect(parsed.getDate()).toBe(threeDays.getDate())
    })
  })

  describe("backwards compatibility", () => {
    it("inferDeadline should return date string directly", () => {
      const result = inferDeadline("demain")
      expect(typeof result).toBe("string")
      expect(result).toBeDefined()
    })

    it("inferDeadline should return null for null input", () => {
      const result = inferDeadline(null)
      expect(result).toBeNull()
    })
  })
})

describe("mapUrgencyToPriority", () => {
  it("should map haute to high", () => {
    expect(mapUrgencyToPriority("haute")).toBe("high")
  })

  it("should map normale to normal", () => {
    expect(mapUrgencyToPriority("normale")).toBe("normal")
  })

  it("should map basse to low", () => {
    expect(mapUrgencyToPriority("basse")).toBe("low")
  })
})

describe("getConfidenceLabel", () => {
  it("should return Très confiant for score >= 0.9", () => {
    expect(getConfidenceLabel(0.95).label).toBe("Très confiant")
    expect(getConfidenceLabel(0.9).label).toBe("Très confiant")
  })

  it("should return Confiant for score >= 0.7", () => {
    expect(getConfidenceLabel(0.8).label).toBe("Confiant")
    expect(getConfidenceLabel(0.7).label).toBe("Confiant")
  })

  it("should return Modéré for score >= 0.5", () => {
    expect(getConfidenceLabel(0.6).label).toBe("Modéré")
    expect(getConfidenceLabel(0.5).label).toBe("Modéré")
  })

  it("should return Incertain for score < 0.5", () => {
    expect(getConfidenceLabel(0.4).label).toBe("Incertain")
    expect(getConfidenceLabel(0.1).label).toBe("Incertain")
  })

  it("should return appropriate colors", () => {
    expect(getConfidenceLabel(0.9).color).toBe("green")
    expect(getConfidenceLabel(0.7).color).toBe("blue")
    expect(getConfidenceLabel(0.5).color).toBe("yellow")
    expect(getConfidenceLabel(0.3).color).toBe("red")
  })
})

describe("VocalAnalysisSchema validation", () => {
  it("should validate correct analysis", () => {
    const valid = {
      action: "Emmener Emma chez le médecin",
      enfant: "Emma",
      date: "demain",
      categorie: "sante",
      urgence: "haute",
      confiance: 0.9,
    }
    expect(VocalAnalysisSchema.safeParse(valid).success).toBe(true)
  })

  it("should reject invalid category", () => {
    const invalid = {
      action: "Test",
      enfant: null,
      date: null,
      categorie: "invalid_category",
      urgence: "normale",
      confiance: 0.5,
    }
    expect(VocalAnalysisSchema.safeParse(invalid).success).toBe(false)
  })

  it("should reject confidence > 1", () => {
    const invalid = {
      action: "Test",
      enfant: null,
      date: null,
      categorie: "quotidien",
      urgence: "normale",
      confiance: 1.5,
    }
    expect(VocalAnalysisSchema.safeParse(invalid).success).toBe(false)
  })

  it("should reject confidence < 0", () => {
    const invalid = {
      action: "Test",
      enfant: null,
      date: null,
      categorie: "quotidien",
      urgence: "normale",
      confiance: -0.1,
    }
    expect(VocalAnalysisSchema.safeParse(invalid).success).toBe(false)
  })
})

describe("VocalTaskSchema validation", () => {
  it("should validate task with confidence details", () => {
    const valid = {
      title: "Rendez-vous médecin",
      description: null,
      child_id: "550e8400-e29b-41d4-a716-446655440000",
      child_name: "Emma",
      category_code: "sante",
      priority: "high",
      deadline: "2024-12-25T10:00:00.000Z",
      source: "vocal" as const,
      vocal_transcript: "Emmener Emma chez le médecin demain",
      confidence_score: 0.85,
      confidence_details: {
        overall: 0.85,
        action: 0.9,
        date: 0.8,
        child: 1,
        category: 0.9,
      },
      date_parsed_from: "demain",
    }
    expect(VocalTaskSchema.safeParse(valid).success).toBe(true)
  })

  it("should validate task without optional confidence details", () => {
    const valid = {
      title: "Test task",
      description: null,
      child_id: null,
      child_name: null,
      category_code: "quotidien",
      priority: "normal",
      deadline: null,
      source: "vocal" as const,
      vocal_transcript: "Test",
      confidence_score: 0.7,
    }
    expect(VocalTaskSchema.safeParse(valid).success).toBe(true)
  })
})

describe("formatCommandSummary", () => {
  it("should format basic command", () => {
    const summary = formatCommandSummary({
      parsed_action: "Acheter du pain",
      parsed_child: null,
      parsed_date: null,
      parsed_category: "quotidien",
      confidence_score: 0.8,
    })
    expect(summary).toContain("Acheter du pain")
    expect(summary).toContain("80%")
  })

  it("should include child name when present", () => {
    const summary = formatCommandSummary({
      parsed_action: "Emmener chez le médecin",
      parsed_child: "Emma",
      parsed_date: null,
      parsed_category: "sante",
      confidence_score: 0.9,
    })
    expect(summary).toContain("pour Emma")
  })

  it("should include formatted date when present", () => {
    const summary = formatCommandSummary({
      parsed_action: "Test",
      parsed_child: null,
      parsed_date: "2024-12-25T10:00:00.000Z",
      parsed_category: "quotidien",
      confidence_score: 0.75,
    })
    expect(summary).toContain("le ")
    expect(summary).toContain("décembre")
  })
})

describe("CATEGORY_DISPLAY_NAMES", () => {
  it("should have French names for all categories", () => {
    expect(CATEGORY_DISPLAY_NAMES["ecole"]).toBe("École")
    expect(CATEGORY_DISPLAY_NAMES["sante"]).toBe("Santé")
    expect(CATEGORY_DISPLAY_NAMES["administratif"]).toBe("Administratif")
    expect(CATEGORY_DISPLAY_NAMES["quotidien"]).toBe("Quotidien")
    expect(CATEGORY_DISPLAY_NAMES["social"]).toBe("Social")
    expect(CATEGORY_DISPLAY_NAMES["activites"]).toBe("Activités")
    expect(CATEGORY_DISPLAY_NAMES["logistique"]).toBe("Logistique")
  })
})
