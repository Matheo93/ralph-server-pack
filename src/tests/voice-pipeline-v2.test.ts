/**
 * Voice Pipeline V2 Tests - Sprint 21
 *
 * Comprehensive tests for the new voice-to-task pipeline:
 * - Audio processor (format validation, chunked uploads)
 * - Speech-to-text (transcription management)
 * - Semantic extractor (category detection, date parsing, child matching)
 * - Task generator (preview generation, charge weights)
 *
 * Total: 60+ tests
 */

import { describe, it, expect, beforeEach } from "bun:test"

// =============================================================================
// AUDIO PROCESSOR IMPORTS
// =============================================================================

import {
  createAudioProcessorStore,
  initializeUpload,
  addChunk,
  assembleChunks,
  getUploadStatus,
  generateUploadId,
  detectFormatFromMimeType,
  validateAudioFormat,
  validateAudioSize,
  validateAudioDuration,
  formatDuration,
  formatFileSize,
  AUDIO_CONFIG,
  type AudioProcessorStore,
} from "@/lib/voice/audio-processor"

// =============================================================================
// SPEECH-TO-TEXT IMPORTS
// =============================================================================

import {
  createSTTStore,
  startTranscription,
  completeTranscription,
  getTranscription,
  createMockTranscription,
  cleanTranscriptionText,
  formatTranscriptionText,
  normalizeLanguage,
  assessTranscriptionQuality,
  isTranscriptionReliable,
  STT_CONFIG,
  type STTStore,
  type TranscriptionResult,
  type TranscriptionRequest,
} from "@/lib/voice/speech-to-text"

// =============================================================================
// SEMANTIC EXTRACTOR IMPORTS
// =============================================================================

import {
  createExtractionStore,
  detectCategoryFromKeywords,
  detectUrgencyFromKeywords,
  parseDateFromText,
  matchChildFromContext,
  extractActionBasic,
  type ExtractionStore,
  type TaskCategory,
} from "@/lib/voice/semantic-extractor"

// =============================================================================
// TASK GENERATOR IMPORTS
// =============================================================================

import {
  createTaskGeneratorStore,
  addPreview,
  confirmTask,
  cancelPreview,
  updatePreview,
  getPreview,
  getPendingPreviews,
  getConfirmedTasks,
  createMockWorkloads,
  calculateChargeWeight,
  suggestAssignee,
  generateTitle,
  type TaskGeneratorStore,
  type TaskPreview,
} from "@/lib/voice/task-generator"

// =============================================================================
// AUDIO PROCESSOR TESTS (15 tests)
// =============================================================================

describe("Audio Processor", () => {
  let store: AudioProcessorStore

  beforeEach(() => {
    store = createAudioProcessorStore()
  })

  describe("Store Creation", () => {
    it("should create an empty store with config", () => {
      expect(store.uploads.size).toBe(0)
      expect(store.config).toBeDefined()
      expect(store.config.maxFileSize).toBeGreaterThan(0)
    })

    it("should have immutable structure", () => {
      const store2 = createAudioProcessorStore()
      expect(store).not.toBe(store2)
    })
  })

  describe("Upload ID Generation", () => {
    it("should generate unique upload IDs", () => {
      const id1 = generateUploadId()
      const id2 = generateUploadId()
      expect(id1).not.toBe(id2)
      expect(id1.length).toBeGreaterThan(10)
    })

    it("should include upload prefix", () => {
      const id = generateUploadId()
      expect(id.startsWith("upload_")).toBe(true)
    })

    it("should generate 10 unique IDs", () => {
      const ids = Array.from({ length: 10 }, () => generateUploadId())
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(10)
    })
  })

  describe("Audio Validation", () => {
    it("should accept valid audio format", () => {
      const result = validateAudioFormat("webm", "audio/webm")
      expect(result.valid).toBe(true)
    })

    it("should validate audio size within limits", () => {
      const result = validateAudioSize(1024 * 1024)
      expect(result.valid).toBe(true)
    })

    it("should reject oversized files", () => {
      const result = validateAudioSize(AUDIO_CONFIG.maxFileSize + 1)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should detect format from MIME type", () => {
      expect(detectFormatFromMimeType("audio/webm")).toBe("webm")
      expect(detectFormatFromMimeType("audio/mpeg")).toBe("mp3")
      expect(detectFormatFromMimeType("audio/wav")).toBe("wav")
    })

    it("should return null for unknown MIME types", () => {
      expect(detectFormatFromMimeType("video/mp4")).toBeNull()
      expect(detectFormatFromMimeType("text/plain")).toBeNull()
    })
  })

  describe("Upload Management", () => {
    it("should initialize a new upload session", () => {
      const updated = initializeUpload(store, "upload_123", "user_456", "audio.webm", 1024)
      expect(updated.uploads.has("upload_123")).toBe(true)
      const upload = updated.uploads.get("upload_123")
      expect(upload?.status).toBe("pending")
      expect(upload?.userId).toBe("user_456")
    })

    it("should not modify original store (immutability)", () => {
      const updated = initializeUpload(store, "upload_123", "user_456", "audio.webm", 1024)
      expect(store.uploads.has("upload_123")).toBe(false)
      expect(updated.uploads.has("upload_123")).toBe(true)
    })

    it("should return upload status object", () => {
      const updated = initializeUpload(store, "upload_123", "user_456", "audio.webm", 1024)
      const status = getUploadStatus(updated, "upload_123")
      expect(status).toBeDefined()
      expect(status?.status).toBe("pending")
    })

    it("should return undefined for unknown upload", () => {
      const status = getUploadStatus(store, "unknown_id")
      expect(status).toBeUndefined()
    })
  })

  describe("Utilities", () => {
    it("should format duration correctly", () => {
      expect(formatDuration(65)).toBe("1:05")
      expect(formatDuration(3600)).toBe("60:00")
      expect(formatDuration(0)).toBe("0:00")
    })

    it("should format file size correctly", () => {
      expect(formatFileSize(1024)).toContain("KB")
      expect(formatFileSize(1024 * 1024)).toContain("MB")
      expect(formatFileSize(500)).toContain("B")
    })
  })
})

// =============================================================================
// SPEECH-TO-TEXT TESTS (15 tests)
// =============================================================================

describe("Speech-to-Text", () => {
  let store: STTStore

  beforeEach(() => {
    store = createSTTStore()
  })

  describe("Store Creation", () => {
    it("should create an empty store with config", () => {
      expect(store.transcriptions.size).toBe(0)
      expect(store.pendingRequests.size).toBe(0)
      expect(store.config).toBeDefined()
    })
  })

  describe("Transcription Management", () => {
    it("should start a new transcription request", () => {
      const request: TranscriptionRequest = {
        audioId: "audio_123",
        audioUrl: "https://example.com/audio/123.webm",
        language: "fr",
        enableWordTimings: true,
        enableSegments: true,
      }
      const updated = startTranscription(store, request)
      expect(updated.pendingRequests.has("audio_123")).toBe(true)
    })

    it("should complete transcription with result", () => {
      const request: TranscriptionRequest = {
        audioId: "audio_123",
        audioUrl: "https://example.com/audio/123.webm",
        language: "fr",
        enableWordTimings: true,
        enableSegments: true,
      }
      let updated = startTranscription(store, request)

      const result: TranscriptionResult = {
        id: "trans_123",
        audioId: "audio_123",
        text: "Emmener Marie à la danse demain",
        language: "fr",
        confidence: 0.95,
        duration: 3.5,
        segments: [
          { id: 1, text: "Emmener Marie à la danse demain", start: 0, end: 3.5, confidence: 0.95 },
        ],
        provider: "whisper",
        processedAt: new Date(),
        processingTimeMs: 400,
      }

      updated = completeTranscription(updated, result)
      expect(updated.transcriptions.has("trans_123")).toBe(true)
      expect(updated.pendingRequests.has("audio_123")).toBe(false)
    })

    it("should return transcription by ID", () => {
      const result: TranscriptionResult = {
        id: "trans_123",
        audioId: "audio_123",
        text: "Test",
        language: "fr",
        confidence: 0.9,
        duration: 1.0,
        segments: [],
        provider: "whisper",
        processedAt: new Date(),
        processingTimeMs: 100,
      }
      const updated = completeTranscription(store, result)
      const trans = getTranscription(updated, "trans_123")
      expect(trans).toBeDefined()
      expect(trans?.text).toBe("Test")
    })

    it("should return undefined for unknown ID", () => {
      const trans = getTranscription(store, "unknown_id")
      expect(trans).toBeUndefined()
    })
  })

  describe("Mock Transcription", () => {
    it("should create mock transcription in French", () => {
      const mock = createMockTranscription("audio_fr_123", "Emmener Marie à l'école", "fr")
      expect(mock.language).toBe("fr")
      expect(mock.text.length).toBeGreaterThan(0)
      expect(mock.confidence).toBeGreaterThan(0.8)
    })

    it("should create mock transcription in English", () => {
      const mock = createMockTranscription("audio_en_123", "Take the kids to school", "en")
      expect(mock.language).toBe("en")
      expect(mock.text.length).toBeGreaterThan(0)
    })

    it("should create mock transcription in Spanish", () => {
      const mock = createMockTranscription("audio_es_123", "Llevar a los niños a la escuela", "es")
      expect(mock.language).toBe("es")
    })

    it("should create mock with valid structure", () => {
      const mock = createMockTranscription("audio_test_123", "Test transcription")
      expect(mock.id).toBeDefined()
      expect(mock.audioId).toBe("audio_test_123")
      expect(mock.duration).toBeGreaterThan(0)
    })
  })

  describe("Text Processing", () => {
    it("should clean transcription text", () => {
      const cleaned = cleanTranscriptionText("  hello   world  ")
      expect(cleaned).not.toContain("  ")
      expect(cleaned.trim()).toBe(cleaned)
    })

    it("should format transcription text with capitalization", () => {
      const formatted = formatTranscriptionText("hello world", "fr")
      expect(formatted.charAt(0)).toBe("H")
    })

    it("should normalize language codes", () => {
      expect(normalizeLanguage("french")).toBe("fr")
      expect(normalizeLanguage("FR")).toBe("fr")
      expect(normalizeLanguage("en")).toBe("en")
      expect(normalizeLanguage("ENGLISH")).toBe("en")
    })
  })

  describe("Quality Assessment", () => {
    it("should assess transcription quality", () => {
      const result: TranscriptionResult = {
        id: "trans_123",
        audioId: "audio_123",
        text: "Test transcription with enough words for assessment",
        language: "fr",
        confidence: 0.92,
        duration: 5.0,
        segments: [{ id: 1, text: "Test transcription with enough words for assessment", start: 0, end: 5, confidence: 0.92 }],
        provider: "whisper",
        processedAt: new Date(),
        processingTimeMs: 500,
      }
      const quality = assessTranscriptionQuality(result)
      expect(quality.overall).toBeDefined()
      expect(quality.confidenceScore).toBeGreaterThan(0)
    })

    it("should check transcription reliability", () => {
      const goodResult: TranscriptionResult = {
        id: "trans_1",
        audioId: "audio_1",
        text: "Clear transcription with good content",
        language: "fr",
        confidence: 0.92,
        duration: 2.0,
        segments: [{ id: 1, text: "Clear transcription with good content", start: 0, end: 2, confidence: 0.92 }],
        provider: "whisper",
        processedAt: new Date(),
        processingTimeMs: 300,
      }
      expect(isTranscriptionReliable(goodResult)).toBe(true)

      const poorResult: TranscriptionResult = {
        id: "trans_2",
        audioId: "audio_2",
        text: "X",
        language: "fr",
        confidence: 0.3,
        duration: 0.1,
        segments: [],
        provider: "whisper",
        processedAt: new Date(),
        processingTimeMs: 50,
      }
      expect(isTranscriptionReliable(poorResult)).toBe(false)
    })
  })
})

// =============================================================================
// SEMANTIC EXTRACTOR TESTS (18 tests)
// =============================================================================

describe("Semantic Extractor", () => {
  let store: ExtractionStore

  beforeEach(() => {
    store = createExtractionStore()
  })

  describe("Store Creation", () => {
    it("should create an empty store", () => {
      expect(store.extractions.size).toBe(0)
    })
  })

  describe("Category Detection", () => {
    it("should detect transport category", () => {
      const result = detectCategoryFromKeywords("emmener à l'école en voiture", "fr")
      expect(result.primary).toBe("transport")
    })

    it("should detect health category", () => {
      const result = detectCategoryFromKeywords("rendez-vous chez le médecin", "fr")
      expect(result.primary).toBe("health")
    })

    it("should detect education category", () => {
      const result = detectCategoryFromKeywords("aider avec les devoirs", "fr")
      expect(result.primary).toBe("education")
    })

    it("should detect food category", () => {
      // "dîner" is in food keywords
      const result = detectCategoryFromKeywords("commander le repas du soir", "fr")
      expect(result.primary).toBe("food")
    })

    it("should detect household category", () => {
      const result = detectCategoryFromKeywords("faire le ménage", "fr")
      expect(result.primary).toBe("household")
    })

    it("should detect activities category", () => {
      const result = detectCategoryFromKeywords("cours de piano mercredi", "fr")
      expect(result.primary).toBe("activities")
    })

    it("should detect social category", () => {
      const result = detectCategoryFromKeywords("anniversaire de Tom", "fr")
      expect(result.primary).toBe("social")
    })

    it("should return other for unknown text", () => {
      const result = detectCategoryFromKeywords("xyz abc 123", "fr")
      expect(result.primary).toBe("other")
    })

    it("should provide confidence score", () => {
      const result = detectCategoryFromKeywords("emmener à l'école", "fr")
      expect(result.confidence.score).toBeGreaterThan(0)
      expect(result.confidence.score).toBeLessThanOrEqual(1)
    })
  })

  describe("Urgency Detection", () => {
    it("should detect critical urgency", () => {
      const result = detectUrgencyFromKeywords("urgence médicale maintenant", "fr")
      expect(result.level).toBe("critical")
    })

    it("should detect high urgency", () => {
      // "cette semaine" is high urgency in the keywords
      const result = detectUrgencyFromKeywords("à faire cette semaine", "fr")
      expect(result.level).toBe("high")
    })

    it("should detect no urgency by default", () => {
      // No urgency keywords = returns 'none'
      const result = detectUrgencyFromKeywords("faire les courses", "fr")
      expect(result.level).toBe("none")
    })

    it("should detect low urgency", () => {
      // "quand possible" is in low urgency keywords
      const result = detectUrgencyFromKeywords("à faire quand possible", "fr")
      expect(result.level).toBe("low")
    })

    it("should provide confidence for urgency", () => {
      const result = detectUrgencyFromKeywords("urgent!", "fr")
      expect(result.confidence.score).toBeGreaterThan(0)
    })
  })

  describe("Date Parsing", () => {
    it("should parse demain", () => {
      const result = parseDateFromText("demain", "fr")
      expect(result.type).toBe("relative")
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(result.parsed?.getDate()).toBe(tomorrow.getDate())
    })

    it("should parse aujourd'hui", () => {
      const result = parseDateFromText("aujourd'hui", "fr")
      expect(result.type).toBe("relative")
      expect(result.parsed?.getDate()).toBe(new Date().getDate())
    })

    it("should parse absolute date DD/MM/YYYY", () => {
      const result = parseDateFromText("15/03/2025", "fr")
      expect(result.type).toBe("absolute")
      expect(result.parsed?.getDate()).toBe(15)
      expect(result.parsed?.getMonth()).toBe(2) // 0-indexed
    })

    it("should parse lundi prochain", () => {
      const result = parseDateFromText("lundi prochain", "fr")
      expect(result.type).toBe("relative")
      expect(result.parsed?.getDay()).toBe(1) // Monday
    })

    it("should return null for no date", () => {
      const result = parseDateFromText("faire les courses", "fr")
      expect(result.parsed).toBeNull()
    })
  })

  describe("Child Matching", () => {
    const household = {
      householdId: "household_123",
      children: [
        { id: "child_1", name: "Marie", nicknames: ["Mimi"], age: 8 },
        { id: "child_2", name: "Lucas", nicknames: ["Lulu"], age: 5 },
        { id: "child_3", name: "Emma", nicknames: [], age: 12 },
      ],
      parents: [
        { id: "parent_1", name: "Jean", role: "father" },
        { id: "parent_2", name: "Sophie", role: "mother" },
      ]
    }

    it("should match child by exact name", () => {
      const result = matchChildFromContext("emmener Marie à l'école", household)
      expect(result?.matchedId).toBe("child_1")
    })

    it("should match child by name in different context", () => {
      const result = matchChildFromContext("les devoirs de Lucas", household)
      expect(result?.matchedId).toBe("child_2")
    })

    it("should return null for no match", () => {
      const result = matchChildFromContext("faire le ménage", household)
      expect(result).toBeNull()
    })

    it("should handle empty children array", () => {
      const emptyHousehold = { householdId: "h1", children: [], parents: [] }
      const result = matchChildFromContext("emmener Marie", emptyHousehold)
      expect(result).toBeNull()
    })
  })

  describe("Action Extraction", () => {
    it("should extract verb and object", () => {
      const result = extractActionBasic("Emmener les enfants à l'école")
      expect(result.verb).toBe("Emmener")
      expect(result.object).toContain("enfants")
    })

    it("should handle single word", () => {
      const result = extractActionBasic("Appeler")
      expect(result.verb).toBe("Appeler")
      expect(result.object).toBeNull()
    })

    it("should trim text", () => {
      // extractActionBasic only trims, doesn't collapse internal spaces
      const result = extractActionBasic("  extra spaces here  ")
      expect(result.normalized).toBe("extra spaces here")
    })

    it("should preserve raw text", () => {
      const result = extractActionBasic("  original  text  ")
      expect(result.raw).toBe("  original  text  ")
    })
  })
})

// =============================================================================
// TASK GENERATOR TESTS (15 tests)
// =============================================================================

describe("Task Generator", () => {
  let store: TaskGeneratorStore

  beforeEach(() => {
    store = createTaskGeneratorStore()
  })

  describe("Store Creation", () => {
    it("should create an empty store", () => {
      expect(store.previews.size).toBe(0)
      expect(store.confirmedTasks.size).toBe(0)
    })
  })

  describe("Title Generation", () => {
    it("should generate title from extraction and household", () => {
      const extraction = {
        id: "ext_123",
        transcriptionId: "trans_123",
        originalText: "Emmener Marie à la danse",
        language: "fr" as const,
        action: {
          raw: "Emmener Marie à la danse",
          normalized: "emmener marie à la danse",
          verb: "emmener",
          object: "Marie à la danse",
          confidence: { score: 0.9, reason: "LLM extraction" },
        },
        category: {
          primary: "transport" as TaskCategory,
          secondary: null,
          confidence: { score: 0.9, reason: "Keyword match" },
        },
        urgency: {
          level: "none" as const,
          indicators: [],
          confidence: { score: 0.85, reason: "Default" },
        },
        date: {
          type: "none" as const,
          raw: "",
          parsed: null,
          confidence: { score: 0.5, reason: "No date found" },
        },
        child: null,
        assigneeSuggestion: null,
        overallConfidence: 0.85,
        extractedAt: new Date(),
        processingTimeMs: 150,
        llmModel: "gpt-4",
        warnings: [],
      }
      const household = {
        householdId: "household_123",
        children: [],
        parents: [],
      }
      const result = generateTitle(extraction, household)
      expect(result.title.length).toBeGreaterThan(0)
      expect(result.alternatives).toBeDefined()
    })
  })

  describe("Preview Management", () => {
    const createTestPreview = (id: string): TaskPreview => ({
      id,
      extractionId: "ext_123",
      title: "Test task",
      description: "Test description",
      category: "household",
      priority: "medium",
      dueDate: new Date(),
      isRecurring: false,
      childId: null,
      childName: null,
      suggestedAssigneeId: null,
      suggestedAssigneeName: null,
      chargeWeight: {
        mentalLoad: 3,
        timeLoad: 2,
        emotionalLoad: 1,
        physicalLoad: 1,
        totalWeight: 7,
      },
      confidence: 0.85,
      warnings: [],
      alternativeTitles: [],
      generatedAt: new Date(),
    })

    it("should add preview to store", () => {
      const preview = createTestPreview("preview_123")
      const updated = addPreview(store, preview)
      expect(updated.previews.has("preview_123")).toBe(true)
    })

    it("should confirm preview and create task", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      // confirmTask returns { store, task }
      const result = confirmTask(updated, "preview_123", "household_123", "member_456")

      expect(result.store.confirmedTasks.size).toBe(1)
      expect(result.task).not.toBeNull()
    })

    it("should cancel preview by removing from pending confirmation", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      // First add to pending confirmation
      updated = { ...updated, pendingConfirmation: new Set(["preview_123"]) }
      updated = cancelPreview(updated, "preview_123")

      // cancelPreview removes from pendingConfirmation set
      expect(updated.pendingConfirmation.has("preview_123")).toBe(false)
    })

    it("should update preview fields", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      updated = updatePreview(updated, "preview_123", {
        title: "Updated title",
        priority: "high",
      })

      const previewAfter = updated.previews.get("preview_123")
      expect(previewAfter?.title).toBe("Updated title")
      expect(previewAfter?.priority).toBe("high")
    })

    it("should get preview by ID", () => {
      const preview = createTestPreview("preview_123")
      const updated = addPreview(store, preview)
      const retrieved = getPreview(updated, "preview_123")
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe("preview_123")
    })

    it("should return undefined for unknown preview", () => {
      const retrieved = getPreview(store, "unknown_id")
      expect(retrieved).toBeUndefined()
    })

    it("should return only pending previews from pendingConfirmation set", () => {
      const preview1 = createTestPreview("preview_1")
      const preview2 = createTestPreview("preview_2")

      let updated = addPreview(store, preview1)
      updated = addPreview(updated, preview2)
      // Add only preview_1 to pendingConfirmation
      updated = { ...updated, pendingConfirmation: new Set(["preview_1"]) }

      // getPendingPreviews only takes store, filters by pendingConfirmation set
      const pending = getPendingPreviews(updated)
      expect(pending.length).toBe(1)
      expect(pending[0]?.id).toBe("preview_1")
    })

    it("should get confirmed tasks with filters", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      const { store: updatedStore } = confirmTask(updated, "preview_123", "household_123", "member_456")

      // getConfirmedTasks takes store and optional filters object
      const confirmed = getConfirmedTasks(updatedStore, { householdId: "household_123" })
      expect(confirmed.length).toBe(1)
    })
  })

  describe("Charge Weight Calculation", () => {
    it("should calculate weight for different categories", () => {
      const transportWeight = calculateChargeWeight("transport", "medium")
      const householdWeight = calculateChargeWeight("household", "medium")
      expect(transportWeight.totalWeight).toBeGreaterThan(0)
      expect(householdWeight.totalWeight).toBeGreaterThan(0)
    })

    it("should increase weight for high priority", () => {
      const mediumWeight = calculateChargeWeight("household", "medium")
      const highWeight = calculateChargeWeight("household", "high")
      expect(highWeight.totalWeight).toBeGreaterThan(mediumWeight.totalWeight)
    })

    it("should have mental load component", () => {
      const weight = calculateChargeWeight("health", "high")
      expect(weight.mentalLoad).toBeDefined()
      expect(weight.mentalLoad).toBeGreaterThan(0)
    })

    it("should have time load component", () => {
      const weight = calculateChargeWeight("transport", "medium")
      expect(weight.timeLoad).toBeDefined()
      expect(weight.timeLoad).toBeGreaterThan(0)
    })
  })

  describe("Mock Workloads", () => {
    it("should create mock workloads", () => {
      const workloads = createMockWorkloads()
      expect(workloads).toBeDefined()
      expect(Array.isArray(workloads)).toBe(true)
    })

    it("should have parent workload structure", () => {
      const workloads = createMockWorkloads()
      if (workloads.length > 0) {
        expect(workloads[0]?.parentId).toBeDefined()
      }
    })
  })
})

// =============================================================================
// INTEGRATION TESTS (8 tests)
// =============================================================================

describe("Voice Pipeline Integration", () => {
  it("should extract semantics from transcription text", () => {
    const text = "Emmener Marie à l'école en voiture demain matin urgent"

    const category = detectCategoryFromKeywords(text, "fr")
    expect(category.primary).toBe("transport")

    const urgency = detectUrgencyFromKeywords(text, "fr")
    expect(["high", "critical"]).toContain(urgency.level)

    const date = parseDateFromText(text, "fr")
    expect(date.type).toBe("relative")
  })

  it("should handle multi-language detection", () => {
    const frLang = normalizeLanguage("french")
    const enLang = normalizeLanguage("english")

    expect(frLang).toBe("fr")
    expect(enLang).toBe("en")
  })

  it("should calculate appropriate charge weights", () => {
    const medicalWeight = calculateChargeWeight("health", "high")
    const choreWeight = calculateChargeWeight("household", "low")

    // Health with high priority should have higher total weight than household with low
    expect(medicalWeight.totalWeight).toBeGreaterThan(choreWeight.totalWeight)
  })

  it("should match children correctly in context", () => {
    const household = {
      householdId: "h1",
      children: [
        { id: "c1", name: "Sophie", nicknames: [], age: 6 },
        { id: "c2", name: "Thomas", nicknames: [], age: 10 },
      ],
      parents: []
    }

    const result1 = matchChildFromContext("accompagner Sophie à l'école", household)
    expect(result1?.matchedId).toBe("c1")

    const result2 = matchChildFromContext("les devoirs de Thomas", household)
    expect(result2?.matchedId).toBe("c2")

    const result3 = matchChildFromContext("faire les courses", household)
    expect(result3).toBeNull()
  })

  it("should handle edge cases gracefully", () => {
    // Empty text
    const emptyCategory = detectCategoryFromKeywords("", "fr")
    expect(emptyCategory.primary).toBe("other")

    // No date in text
    const noDate = parseDateFromText("quelque chose sans date", "fr")
    expect(noDate.parsed).toBeNull()

    // No child match with empty household
    const emptyHousehold = { householdId: "h1", children: [], parents: [] }
    const noChild = matchChildFromContext("tâche générique", emptyHousehold)
    expect(noChild).toBeNull()
  })

  it("should create and complete transcription flow", () => {
    let store = createSTTStore()

    const request: TranscriptionRequest = {
      audioId: "audio_test",
      audioUrl: "https://example.com/audio/test.webm",
      language: "fr",
      enableWordTimings: false,
      enableSegments: true,
    }
    store = startTranscription(store, request)
    expect(store.pendingRequests.has("audio_test")).toBe(true)

    const result: TranscriptionResult = {
      id: "trans_test",
      audioId: "audio_test",
      text: "Test transcription complete",
      language: "fr",
      confidence: 0.9,
      duration: 2.0,
      segments: [],
      provider: "whisper",
      processedAt: new Date(),
      processingTimeMs: 200,
    }
    store = completeTranscription(store, result)
    expect(store.transcriptions.has("trans_test")).toBe(true)
    expect(store.pendingRequests.has("audio_test")).toBe(false)
  })

  it("should extract action components from text", () => {
    const result = extractActionBasic("Emmener Lucas au football samedi")

    expect(result.verb).toBe("Emmener")
    expect(result.object).toContain("Lucas")
    expect(result.normalized).not.toContain("  ")
  })

  it("should detect multiple semantic elements from one text", () => {
    const text = "Urgent: emmener Marie chez le médecin demain matin"

    const category = detectCategoryFromKeywords(text, "fr")
    const urgency = detectUrgencyFromKeywords(text, "fr")
    const date = parseDateFromText(text, "fr")
    const household = {
      householdId: "h1",
      children: [{ id: "c1", name: "Marie", nicknames: [], age: 8 }],
      parents: []
    }
    const child = matchChildFromContext(text, household)

    // Should detect health due to médecin
    expect(category.primary).toBe("health")
    // Should detect high/critical urgency
    expect(["high", "critical"]).toContain(urgency.level)
    // Should parse demain
    expect(date.parsed).not.toBeNull()
    // Should match Marie
    expect(child?.matchedId).toBe("c1")
  })
})
