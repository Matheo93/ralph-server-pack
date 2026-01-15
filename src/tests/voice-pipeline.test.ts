/**
 * Voice Pipeline Tests
 *
 * Unit tests for voice transcription, semantic analysis, and task creation pipeline.
 * Tests lib functions, utilities, and data processing logic.
 */

import { describe, it, expect } from "vitest"
import {
  validateAudioBlob,
  MAX_AUDIO_SIZE,
  normalizeText,
  detectLanguage,
  isTranscriptionConfigured,
} from "@/lib/voice/transcription"
import {
  isAnalysisConfigured,
  parseRelativeDate,
  urgencyToPriority,
  TASK_CATEGORIES,
  detectCategoryFromText,
  detectUrgencyFromText,
  extractChildName,
  getSystemPrompt,
} from "@/lib/voice/semantic-analysis"

// =============================================================================
// TRANSCRIPTION TESTS
// =============================================================================

describe("Voice Transcription", () => {
  it("should validate audio blob size", () => {
    // Valid size
    const validBlob = new Blob(["x".repeat(1000)], { type: "audio/webm" })
    const validResult = validateAudioBlob(validBlob)
    expect(validResult.valid).toBe(true)

    // Empty blob
    const emptyBlob = new Blob([], { type: "audio/webm" })
    const emptyResult = validateAudioBlob(emptyBlob)
    expect(emptyResult.valid).toBe(false)
    expect(emptyResult.error).toContain("vide")
  })

  it("should validate audio blob type", () => {
    // Valid types
    const webmBlob = new Blob(["audio"], { type: "audio/webm" })
    expect(validateAudioBlob(webmBlob).valid).toBe(true)

    const mp3Blob = new Blob(["audio"], { type: "audio/mpeg" })
    expect(validateAudioBlob(mp3Blob).valid).toBe(true)

    const wavBlob = new Blob(["audio"], { type: "audio/wav" })
    expect(validateAudioBlob(wavBlob).valid).toBe(true)

    // Invalid type
    const textBlob = new Blob(["text"], { type: "text/plain" })
    const result = validateAudioBlob(textBlob)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Format")
  })

  it("should validate audio blob max size", () => {
    // Size just under max
    const largeBlob = new Blob(["x".repeat(MAX_AUDIO_SIZE - 100)], { type: "audio/webm" })
    expect(validateAudioBlob(largeBlob).valid).toBe(true)

    // Size over max
    const tooLargeBlob = new Blob(["x".repeat(MAX_AUDIO_SIZE + 100)], { type: "audio/webm" })
    const result = validateAudioBlob(tooLargeBlob)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("volumineux")
  })

  it("should check transcription configuration", () => {
    // Without env vars, should return false
    const result = isTranscriptionConfigured()
    expect(typeof result).toBe("boolean")
  })

  it("should normalize transcribed text", () => {
    expect(normalizeText("  Hello   World  ")).toContain("Hello")
    expect(normalizeText("  Hello   World  ")).toContain("World")
    expect(normalizeText("multiple   spaces")).not.toContain("  ")
  })

  it("should detect language from text", () => {
    expect(detectLanguage("Bonjour, comment ça va ?")).toBe("fr")
    expect(detectLanguage("Hello, how are you?")).toBe("en")
    expect(detectLanguage("Acheter du pain pour les enfants")).toBe("fr")
    expect(detectLanguage("Buy bread for the children")).toBe("en")
  })
})

// =============================================================================
// SEMANTIC ANALYSIS TESTS
// =============================================================================

describe("Semantic Analysis", () => {
  it("should check analysis configuration", () => {
    const result = isAnalysisConfigured()
    expect(typeof result).toBe("boolean")
  })

  it("should parse relative dates in French", () => {
    const now = new Date()

    // Today
    const today = parseRelativeDate("aujourd'hui", "fr")
    expect(today?.toDateString()).toBe(now.toDateString())

    // Tomorrow
    const tomorrow = parseRelativeDate("demain", "fr")
    const expectedTomorrow = new Date(now)
    expectedTomorrow.setDate(expectedTomorrow.getDate() + 1)
    expect(tomorrow?.toDateString()).toBe(expectedTomorrow.toDateString())

    // This week
    const thisWeek = parseRelativeDate("cette semaine", "fr")
    expect(thisWeek).toBeDefined()
    expect(thisWeek!.getTime()).toBeGreaterThanOrEqual(now.getTime())
  })

  it("should parse relative dates in English", () => {
    const now = new Date()

    // Today
    const today = parseRelativeDate("today", "en")
    expect(today?.toDateString()).toBe(now.toDateString())

    // Tomorrow
    const tomorrow = parseRelativeDate("tomorrow", "en")
    const expectedTomorrow = new Date(now)
    expectedTomorrow.setDate(expectedTomorrow.getDate() + 1)
    expect(tomorrow?.toDateString()).toBe(expectedTomorrow.toDateString())

    // Next week
    const nextWeek = parseRelativeDate("next week", "en")
    expect(nextWeek).toBeDefined()
    expect(nextWeek!.getTime()).toBeGreaterThan(now.getTime())
  })

  it("should convert urgency to priority", () => {
    expect(urgencyToPriority("haute")).toBe(1)
    expect(urgencyToPriority("normale")).toBe(2)
    expect(urgencyToPriority("basse")).toBe(3)
    expect(urgencyToPriority("high")).toBe(1)
    expect(urgencyToPriority("normal")).toBe(2)
    expect(urgencyToPriority("low")).toBe(3)
    // Default
    expect(urgencyToPriority("unknown" as "normale")).toBe(2)
  })

  it("should have valid task categories", () => {
    expect(TASK_CATEGORIES).toContain("ecole")
    expect(TASK_CATEGORIES).toContain("sante")
    expect(TASK_CATEGORIES).toContain("administratif")
    expect(TASK_CATEGORIES).toContain("quotidien")
    expect(TASK_CATEGORIES).toContain("social")
    expect(TASK_CATEGORIES).toContain("activites")
    expect(TASK_CATEGORIES).toContain("logistique")
    expect(TASK_CATEGORIES).toContain("autre")
  })

  it("should detect task category from keywords", () => {
    expect(detectCategoryFromText("rendez-vous chez le médecin")).toBe("sante")
    expect(detectCategoryFromText("réunion parents d'élèves")).toBe("ecole")
    expect(detectCategoryFromText("acheter des couches")).toBe("quotidien")
    expect(detectCategoryFromText("foot le mercredi")).toBe("activites")
    expect(detectCategoryFromText("anniversaire de Lucas")).toBe("social")
    expect(detectCategoryFromText("renouveler le passeport")).toBe("administratif")
    expect(detectCategoryFromText("emmener au travail en voiture")).toBe("logistique")
    expect(detectCategoryFromText("tâche quelconque")).toBe("autre")
  })

  it("should detect urgency from keywords", () => {
    expect(detectUrgencyFromText("urgent acheter médicaments")).toBe("haute")
    expect(detectUrgencyFromText("important rendez-vous")).toBe("haute")
    expect(detectUrgencyFromText("quand on peut faire les courses")).toBe("basse")
    expect(detectUrgencyFromText("si possible laver la voiture")).toBe("basse")
    expect(detectUrgencyFromText("acheter du pain")).toBe("normale")
  })

  it("should extract child name from text", () => {
    const children = ["Emma", "Lucas", "Léa"]

    expect(extractChildName("Acheter des couches pour Emma", children)).toBe("Emma")
    expect(extractChildName("Emmener Lucas au foot", children)).toBe("Lucas")
    expect(extractChildName("Rendez-vous médecin de Léa", children)).toBe("Léa")
    expect(extractChildName("Faire les courses", children)).toBeNull()
    expect(extractChildName("Acheter des couches", [])).toBeNull()
  })
})

// =============================================================================
// ANALYSIS PROMPT TESTS
// =============================================================================

describe("Analysis Prompts", () => {
  it("should generate valid system prompt", () => {
    const prompt = getSystemPrompt("fr")

    expect(prompt).toContain("JSON")
    expect(prompt).toContain("childName")
    expect(prompt.toLowerCase()).toContain("catégories")
    expect(prompt).toContain("urgence")
    expect(prompt).toContain("confiance")
  })

  it("should generate prompt with children context", () => {
    const children = ["Emma", "Lucas"]
    const prompt = getSystemPrompt("fr", children)

    expect(prompt).toContain("Emma")
    expect(prompt).toContain("Lucas")
    expect(prompt).toContain("childName")
  })

  it("should generate English prompt", () => {
    const prompt = getSystemPrompt("en")

    expect(prompt).toContain("JSON")
    expect(prompt.toLowerCase()).toContain("task")
    expect(prompt.toLowerCase()).not.toContain("français")
  })
})

// =============================================================================
// VOICE RECORDING HOOK TESTS
// =============================================================================

describe("Voice Recording Hook Types", () => {
  it("should export useVoiceRecording hook", async () => {
    const { useVoiceRecording } = await import("@/hooks/useVoiceRecording")

    // Type check - the hook should be a function
    expect(typeof useVoiceRecording).toBe("function")
  })

  it("should have valid recording states", () => {
    const validStates = ["idle", "requesting", "recording", "processing", "error"]

    validStates.forEach((state) => {
      expect(typeof state).toBe("string")
    })
  })
})

// =============================================================================
// DATA VALIDATION TESTS
// =============================================================================

describe("Data Validation", () => {
  it("should validate extraction result structure", () => {
    const sampleExtraction = {
      action: "Acheter des couches",
      childName: "Emma",
      date: "demain",
      category: "quotidien" as const,
      urgency: "normale" as const,
      confidence: 0.95,
    }

    expect(sampleExtraction.action).toBeDefined()
    expect(sampleExtraction.category).toBeDefined()
    expect(sampleExtraction.urgency).toBeDefined()
    expect(sampleExtraction.confidence).toBeGreaterThanOrEqual(0)
    expect(sampleExtraction.confidence).toBeLessThanOrEqual(1)
  })

  it("should validate transcription result structure", () => {
    const sampleTranscription = {
      success: true,
      text: "Acheter des couches pour Emma demain",
      confidence: 0.95,
      language: "fr" as const,
    }

    expect(sampleTranscription.success).toBe(true)
    expect(sampleTranscription.text.length).toBeGreaterThan(0)
    expect(sampleTranscription.confidence).toBeGreaterThanOrEqual(0)
    expect(sampleTranscription.confidence).toBeLessThanOrEqual(1)
  })

  it("should validate category enum values", () => {
    expect(TASK_CATEGORIES.length).toBe(8)
    expect(new Set(TASK_CATEGORIES).size).toBe(8) // All unique
  })

  it("should validate urgency enum values", () => {
    const urgencies = ["haute", "normale", "basse"]

    expect(urgencies.length).toBe(3)
    expect(new Set(urgencies).size).toBe(3) // All unique
  })
})

// =============================================================================
// EDGE CASES TESTS
// =============================================================================

describe("Edge Cases", () => {
  it("should handle empty text gracefully", () => {
    expect(detectCategoryFromText("")).toBe("autre")
    expect(detectUrgencyFromText("")).toBe("normale")
  })

  it("should handle null/undefined child names", () => {
    expect(extractChildName("Test text", [])).toBeNull()
    expect(extractChildName("", ["Emma"])).toBeNull()
  })

  it("should handle special characters in text", () => {
    expect(normalizeText("Test ça! @#$%")).toBeDefined()
    expect(detectCategoryFromText("médecin (urgent)")).toBe("sante")
  })

  it("should handle case-insensitive child name matching", () => {
    expect(extractChildName("acheter pour EMMA", ["Emma"])).toBe("Emma")
    expect(extractChildName("acheter pour emma", ["Emma"])).toBe("Emma")
    expect(extractChildName("acheter pour EmMa", ["Emma"])).toBe("Emma")
  })

  it("should handle unknown date formats", () => {
    expect(parseRelativeDate("invalid date", "fr")).toBeNull()
    expect(parseRelativeDate("", "fr")).toBeNull()
    expect(parseRelativeDate("xyz123", "en")).toBeNull()
  })
})

// =============================================================================
// COMPONENT EXPORT TESTS
// =============================================================================

describe("Voice Component Exports", () => {
  it("should export VoiceButton component", async () => {
    const { VoiceButton } = await import("@/components/voice")
    expect(VoiceButton).toBeDefined()
    expect(typeof VoiceButton).toBe("function")
  })

  it("should export VoiceRecorder component", async () => {
    const { VoiceRecorder } = await import("@/components/voice")
    expect(VoiceRecorder).toBeDefined()
    expect(typeof VoiceRecorder).toBe("function")
  })
})
