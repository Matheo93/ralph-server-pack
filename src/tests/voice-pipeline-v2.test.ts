/**
 * Voice Pipeline V2 Tests - Sprint 21
 *
 * Comprehensive tests for the new voice-to-task pipeline:
 * - Audio processor (format validation, chunked uploads, normalization)
 * - Speech-to-text (transcription management, STT stores)
 * - Semantic extractor (LLM extraction, keyword detection, date parsing)
 * - Task generator (preview generation, task creation, charge weights)
 *
 * Total: 60+ tests
 */

import { describe, it, expect, beforeEach } from "bun:test"

// =============================================================================
// AUDIO PROCESSOR IMPORTS
// =============================================================================

import {
  createAudioProcessorStore,
  validateAudio,
  initializeUpload,
  addChunk,
  assembleChunks,
  getUploadStatus,
  generateUploadId,
  getAudioProcessorStats,
  isFormatSupported,
  getMaxDuration,
  getMaxFileSize,
  estimateProcessingTime,
  normalizeVolume,
  getFormatFromMimeType,
  SUPPORTED_FORMATS,
  type AudioProcessorStore,
  type AudioFormat,
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
  getSTTStats,
  estimateTranscriptionTime,
  normalizeTranscript,
  detectLanguage,
  calculateWordConfidence,
  SUPPORTED_LANGUAGES,
  type STTStore,
  type TranscriptionResult,
} from "@/lib/voice/speech-to-text"

// =============================================================================
// SEMANTIC EXTRACTOR IMPORTS
// =============================================================================

import {
  createExtractionStore,
  startExtraction,
  completeExtraction,
  getExtraction,
  detectCategoryFromKeywords,
  detectUrgencyFromKeywords,
  parseDateFromText,
  matchChildFromContext,
  extractActionBasic,
  CATEGORY_KEYWORDS,
  URGENCY_KEYWORDS,
  type ExtractionStore,
  type SemanticExtraction,
  type TaskCategory,
} from "@/lib/voice/semantic-extractor"

// =============================================================================
// TASK GENERATOR IMPORTS
// =============================================================================

import {
  createTaskGeneratorStore,
  generateTaskPreview,
  addPreview,
  confirmTask,
  cancelPreview,
  updatePreview,
  getPreview,
  getPendingPreviews,
  getConfirmedTasks,
  createMockWorkloads,
  calculateChargeWeight,
  estimateTaskDuration,
  suggestAssignee,
  type TaskGeneratorStore,
  type TaskPreview,
  type ConfirmedTask,
} from "@/lib/voice/task-generator"

// =============================================================================
// AUDIO PROCESSOR TESTS (18 tests)
// =============================================================================

describe("Audio Processor", () => {
  let store: AudioProcessorStore

  beforeEach(() => {
    store = createAudioProcessorStore()
  })

  describe("Store Creation", () => {
    it("should create an empty store", () => {
      expect(store.uploads.size).toBe(0)
      expect(store.processedCount).toBe(0)
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
    it("should accept valid audio data", () => {
      const audioData = new Uint8Array(1024)
      const result = validateAudio(audioData, "audio/webm")
      expect(result.valid).toBe(true)
    })

    it("should reject empty audio data", () => {
      const audioData = new Uint8Array(0)
      const result = validateAudio(audioData, "audio/webm")
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should reject unsupported formats", () => {
      const audioData = new Uint8Array(1024)
      const result = validateAudio(audioData, "audio/midi")
      expect(result.valid).toBe(false)
    })

    it("should reject oversized files", () => {
      const result = validateAudio(new Uint8Array(1024), "audio/webm", {
        maxSize: 512,
      })
      expect(result.valid).toBe(false)
    })

    it("should accept multiple valid formats", () => {
      const data = new Uint8Array(100)
      expect(validateAudio(data, "audio/webm").valid).toBe(true)
      expect(validateAudio(data, "audio/mpeg").valid).toBe(true)
      expect(validateAudio(data, "audio/wav").valid).toBe(true)
      expect(validateAudio(data, "audio/ogg").valid).toBe(true)
    })
  })

  describe("Upload Management", () => {
    it("should initialize a new upload session", () => {
      const updated = initializeUpload(store, "upload_123", "audio/webm")
      expect(updated.uploads.has("upload_123")).toBe(true)
      const upload = updated.uploads.get("upload_123")
      expect(upload?.status).toBe("pending")
      expect(upload?.mimeType).toBe("audio/webm")
    })

    it("should not modify original store (immutability)", () => {
      const updated = initializeUpload(store, "upload_123", "audio/webm")
      expect(store.uploads.has("upload_123")).toBe(false)
      expect(updated.uploads.has("upload_123")).toBe(true)
    })

    it("should add chunks to upload", () => {
      let updated = initializeUpload(store, "upload_123", "audio/webm")
      const chunk1 = new Uint8Array([1, 2, 3])
      const chunk2 = new Uint8Array([4, 5, 6])

      updated = addChunk(updated, "upload_123", chunk1, 0)
      updated = addChunk(updated, "upload_123", chunk2, 1)

      const upload = updated.uploads.get("upload_123")
      expect(upload?.chunks.length).toBe(2)
    })

    it("should return unchanged store for unknown upload", () => {
      const updated = addChunk(store, "unknown_id", new Uint8Array([1, 2, 3]), 0)
      expect(updated).toBe(store)
    })

    it("should assemble chunks into final audio data", () => {
      let updated = initializeUpload(store, "upload_123", "audio/webm")
      updated = addChunk(updated, "upload_123", new Uint8Array([1, 2, 3]), 0)
      updated = addChunk(updated, "upload_123", new Uint8Array([4, 5, 6]), 1)

      const result = assembleChunks(updated, "upload_123")
      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(6)
    })

    it("should fail assembly for missing upload", () => {
      const result = assembleChunks(store, "unknown_id")
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should return upload status", () => {
      const updated = initializeUpload(store, "upload_123", "audio/webm")
      const status = getUploadStatus(updated, "upload_123")
      expect(status).toBe("pending")
    })

    it("should return null status for unknown upload", () => {
      const status = getUploadStatus(store, "unknown_id")
      expect(status).toBeNull()
    })
  })

  describe("Format Helpers", () => {
    it("should validate supported formats", () => {
      expect(isFormatSupported("audio/webm")).toBe(true)
      expect(isFormatSupported("audio/mpeg")).toBe(true)
      expect(isFormatSupported("audio/wav")).toBe(true)
      expect(isFormatSupported("video/mp4")).toBe(false)
    })

    it("should extract format from MIME type", () => {
      expect(getFormatFromMimeType("audio/webm")).toBe("webm")
      expect(getFormatFromMimeType("audio/mpeg")).toBe("mp3")
    })

    it("should return valid duration limits", () => {
      const duration = getMaxDuration()
      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeLessThanOrEqual(300) // Max 5 minutes
    })

    it("should return valid size limits", () => {
      const size = getMaxFileSize()
      expect(size).toBeGreaterThan(0)
    })

    it("should estimate processing time", () => {
      const time = estimateProcessingTime(60)
      expect(time).toBeGreaterThan(0)
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
    it("should create an empty store", () => {
      expect(store.transcriptions.size).toBe(0)
      expect(store.completedCount).toBe(0)
    })
  })

  describe("Transcription Management", () => {
    it("should start a new transcription", () => {
      const updated = startTranscription(store, "trans_123", "upload_456", "fr")
      expect(updated.transcriptions.has("trans_123")).toBe(true)
      const trans = updated.transcriptions.get("trans_123")
      expect(trans?.status).toBe("pending")
      expect(trans?.language).toBe("fr")
    })

    it("should complete transcription with result", () => {
      let updated = startTranscription(store, "trans_123", "upload_456", "fr")
      const result: TranscriptionResult = {
        text: "Emmener Marie à la danse demain",
        language: "fr",
        confidence: 0.95,
        duration: 3.5,
        words: [
          { word: "Emmener", start: 0, end: 0.5, confidence: 0.96 },
          { word: "Marie", start: 0.6, end: 1.0, confidence: 0.98 },
        ],
      }

      updated = completeTranscription(updated, "trans_123", result)
      const trans = updated.transcriptions.get("trans_123")
      expect(trans?.status).toBe("completed")
      expect(trans?.result?.text).toBe("Emmener Marie à la danse demain")
    })

    it("should increment completed count", () => {
      let updated = startTranscription(store, "trans_123", "upload_456", "fr")
      const result: TranscriptionResult = {
        text: "Test",
        language: "fr",
        confidence: 0.9,
        duration: 1.0,
        words: [],
      }
      updated = completeTranscription(updated, "trans_123", result)
      expect(updated.completedCount).toBe(1)
    })

    it("should return transcription by ID", () => {
      const updated = startTranscription(store, "trans_123", "upload_456", "fr")
      const trans = getTranscription(updated, "trans_123")
      expect(trans).not.toBeNull()
      expect(trans?.uploadId).toBe("upload_456")
    })

    it("should return null for unknown ID", () => {
      const trans = getTranscription(store, "unknown_id")
      expect(trans).toBeNull()
    })
  })

  describe("Mock Transcription", () => {
    it("should create mock transcription in French", () => {
      const mock = createMockTranscription("fr")
      expect(mock.language).toBe("fr")
      expect(mock.text.length).toBeGreaterThan(0)
      expect(mock.confidence).toBeGreaterThan(0.8)
    })

    it("should create mock transcription in English", () => {
      const mock = createMockTranscription("en")
      expect(mock.language).toBe("en")
      expect(mock.text.length).toBeGreaterThan(0)
    })

    it("should create mock transcription in Spanish", () => {
      const mock = createMockTranscription("es")
      expect(mock.language).toBe("es")
    })

    it("should create mock transcription in German", () => {
      const mock = createMockTranscription("de")
      expect(mock.language).toBe("de")
    })
  })

  describe("Text Processing", () => {
    it("should normalize whitespace", () => {
      const normalized = normalizeTranscript("  hello   world  ")
      expect(normalized).toBe("hello world")
    })

    it("should handle special characters", () => {
      const normalized = normalizeTranscript("café résumé naïve")
      expect(normalized).toContain("café")
    })

    it("should detect French language", () => {
      const lang = detectLanguage("Je dois emmener les enfants à l'école")
      expect(lang).toBe("fr")
    })

    it("should detect English language", () => {
      const lang = detectLanguage("I need to take the kids to school")
      expect(lang).toBe("en")
    })

    it("should return default for ambiguous text", () => {
      const lang = detectLanguage("ok ok ok")
      expect(SUPPORTED_LANGUAGES.includes(lang)).toBe(true)
    })
  })

  describe("Utilities", () => {
    it("should estimate transcription time", () => {
      const estimate = estimateTranscriptionTime(60)
      expect(estimate).toBeGreaterThan(0)
      expect(estimate).toBeLessThan(60)
    })

    it("should calculate word confidence", () => {
      const words = [
        { word: "hello", start: 0, end: 0.5, confidence: 0.9 },
        { word: "world", start: 0.6, end: 1.0, confidence: 0.8 },
      ]
      const avg = calculateWordConfidence(words)
      expect(avg).toBe(0.85)
    })

    it("should return 0 for empty word array", () => {
      const avg = calculateWordConfidence([])
      expect(avg).toBe(0)
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
      expect(store.completedCount).toBe(0)
    })
  })

  describe("Category Detection", () => {
    it("should detect transport category", () => {
      const result = detectCategoryFromKeywords("emmener à l'école en voiture")
      expect(result.primary).toBe("transport")
    })

    it("should detect health category", () => {
      const result = detectCategoryFromKeywords("rendez-vous chez le médecin")
      expect(result.primary).toBe("health")
    })

    it("should detect education category", () => {
      const result = detectCategoryFromKeywords("aider avec les devoirs")
      expect(result.primary).toBe("education")
    })

    it("should detect food category", () => {
      const result = detectCategoryFromKeywords("préparer le dîner")
      expect(result.primary).toBe("food")
    })

    it("should detect household category", () => {
      const result = detectCategoryFromKeywords("faire le ménage")
      expect(result.primary).toBe("household")
    })

    it("should detect activities category", () => {
      const result = detectCategoryFromKeywords("cours de piano mercredi")
      expect(result.primary).toBe("activities")
    })

    it("should detect social category", () => {
      const result = detectCategoryFromKeywords("anniversaire de Tom")
      expect(result.primary).toBe("social")
    })

    it("should return other for unknown text", () => {
      const result = detectCategoryFromKeywords("xyz abc 123")
      expect(result.primary).toBe("other")
    })

    it("should provide confidence score", () => {
      const result = detectCategoryFromKeywords("emmener à l'école")
      expect(result.confidence.score).toBeGreaterThan(0)
      expect(result.confidence.score).toBeLessThanOrEqual(1)
    })

    it("should detect secondary category", () => {
      const result = detectCategoryFromKeywords("emmener Marie chez le docteur")
      expect(result.secondary).not.toBeNull()
    })
  })

  describe("Urgency Detection", () => {
    it("should detect critical urgency", () => {
      const result = detectUrgencyFromKeywords("urgence médicale maintenant")
      expect(result.level).toBe("critical")
    })

    it("should detect high urgency", () => {
      const result = detectUrgencyFromKeywords("important à faire aujourd'hui")
      expect(result.level).toBe("high")
    })

    it("should detect normal urgency by default", () => {
      const result = detectUrgencyFromKeywords("faire les courses")
      expect(result.level).toBe("normal")
    })

    it("should detect low urgency", () => {
      const result = detectUrgencyFromKeywords("quand tu auras le temps")
      expect(result.level).toBe("low")
    })

    it("should provide confidence for urgency", () => {
      const result = detectUrgencyFromKeywords("urgent!")
      expect(result.confidence.score).toBeGreaterThan(0)
    })
  })

  describe("Date Parsing", () => {
    it("should parse demain", () => {
      const result = parseDateFromText("demain")
      expect(result.type).toBe("relative")
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(result.parsed?.getDate()).toBe(tomorrow.getDate())
    })

    it("should parse aujourd'hui", () => {
      const result = parseDateFromText("aujourd'hui")
      expect(result.type).toBe("relative")
      expect(result.parsed?.getDate()).toBe(new Date().getDate())
    })

    it("should parse absolute date DD/MM/YYYY", () => {
      const result = parseDateFromText("15/03/2025")
      expect(result.type).toBe("absolute")
      expect(result.parsed?.getDate()).toBe(15)
      expect(result.parsed?.getMonth()).toBe(2) // 0-indexed
    })

    it("should parse absolute date DD-MM-YYYY", () => {
      const result = parseDateFromText("20-06-2025")
      expect(result.type).toBe("absolute")
      expect(result.parsed?.getDate()).toBe(20)
    })

    it("should parse lundi prochain", () => {
      const result = parseDateFromText("lundi prochain")
      expect(result.type).toBe("relative")
      expect(result.parsed?.getDay()).toBe(1) // Monday
    })

    it("should return null for no date", () => {
      const result = parseDateFromText("faire les courses")
      expect(result.parsed).toBeNull()
    })

    it("should parse this week", () => {
      const result = parseDateFromText("cette semaine")
      expect(result.type).toBe("relative")
      expect(result.parsed).not.toBeNull()
    })
  })

  describe("Child Matching", () => {
    const children = [
      { id: "child_1", firstName: "Marie", age: 8 },
      { id: "child_2", firstName: "Lucas", age: 5 },
      { id: "child_3", firstName: "Emma", age: 12 },
    ]

    it("should match child by exact name", () => {
      const result = matchChildFromContext("emmener Marie à l'école", children)
      expect(result.childId).toBe("child_1")
      expect(result.confidence.score).toBeGreaterThan(0.8)
    })

    it("should match child by partial name", () => {
      const result = matchChildFromContext("les devoirs de Lucas", children)
      expect(result.childId).toBe("child_2")
    })

    it("should return null for no match", () => {
      const result = matchChildFromContext("faire le ménage", children)
      expect(result.childId).toBeNull()
    })

    it("should handle case insensitive matching", () => {
      const result = matchChildFromContext("emmener EMMA à la danse", children)
      expect(result.childId).toBe("child_3")
    })

    it("should handle empty children array", () => {
      const result = matchChildFromContext("emmener Marie", [])
      expect(result.childId).toBeNull()
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

    it("should normalize text", () => {
      const result = extractActionBasic("  extra  spaces  here  ")
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

  describe("Task Preview Generation", () => {
    it("should generate preview from extraction", () => {
      const extraction: SemanticExtraction = {
        transcriptionId: "trans_123",
        action: {
          raw: "Emmener Marie à la danse",
          normalized: "emmener marie à la danse",
          verb: "emmener",
          object: "Marie à la danse",
          confidence: { score: 0.9, reason: "LLM extraction" },
        },
        category: {
          primary: "transport",
          secondary: null,
          confidence: { score: 0.85, reason: "Keywords matched" },
        },
        urgency: {
          level: "normal",
          confidence: { score: 0.8, reason: "Default" },
        },
        date: {
          raw: "demain",
          parsed: new Date(),
          type: "relative",
          confidence: { score: 0.9, reason: "Parsed demain" },
        },
        child: {
          childId: "child_1",
          confidence: { score: 0.95, reason: "Name match" },
        },
        confidence: { score: 0.88, reason: "Overall confidence" },
        createdAt: new Date(),
      }

      const preview = generateTaskPreview(extraction, "household_123")
      expect(preview.title).toContain("Emmener")
      expect(preview.category).toBe("transport")
      expect(preview.childId).toBe("child_1")
    })
  })

  describe("Preview Management", () => {
    const createTestPreview = (id: string, status: "pending" | "confirmed" | "cancelled" = "pending"): TaskPreview => ({
      id,
      householdId: "household_123",
      title: "Test task",
      description: "Test description",
      category: "household",
      urgency: "normal",
      childId: null,
      dueDate: new Date(),
      chargeWeight: 2,
      suggestedAssignee: null,
      status,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    })

    it("should add preview to store", () => {
      const preview = createTestPreview("preview_123")
      const updated = addPreview(store, preview)
      expect(updated.previews.has("preview_123")).toBe(true)
    })

    it("should confirm preview and create task", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      updated = confirmTask(updated, "preview_123", "member_456")

      expect(updated.confirmedTasks.size).toBe(1)
      const previewAfter = updated.previews.get("preview_123")
      expect(previewAfter?.status).toBe("confirmed")
    })

    it("should cancel preview", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      updated = cancelPreview(updated, "preview_123")

      const previewAfter = updated.previews.get("preview_123")
      expect(previewAfter?.status).toBe("cancelled")
    })

    it("should update preview fields", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      updated = updatePreview(updated, "preview_123", {
        title: "Updated title",
        urgency: "high",
      })

      const previewAfter = updated.previews.get("preview_123")
      expect(previewAfter?.title).toBe("Updated title")
      expect(previewAfter?.urgency).toBe("high")
    })

    it("should get preview by ID", () => {
      const preview = createTestPreview("preview_123")
      const updated = addPreview(store, preview)
      const retrieved = getPreview(updated, "preview_123")
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe("preview_123")
    })

    it("should return null for unknown preview", () => {
      const retrieved = getPreview(store, "unknown_id")
      expect(retrieved).toBeNull()
    })

    it("should return only pending previews", () => {
      const preview1 = createTestPreview("preview_1", "pending")
      const preview2 = createTestPreview("preview_2", "confirmed")

      let updated = addPreview(store, preview1)
      updated = addPreview(updated, preview2)

      const pending = getPendingPreviews(updated, "household_123")
      expect(pending.length).toBe(1)
      expect(pending[0]?.id).toBe("preview_1")
    })

    it("should get confirmed tasks", () => {
      const preview = createTestPreview("preview_123")
      let updated = addPreview(store, preview)
      updated = confirmTask(updated, "preview_123", "member_456")

      const confirmed = getConfirmedTasks(updated, "household_123")
      expect(confirmed.length).toBe(1)
    })
  })

  describe("Charge Weight Calculation", () => {
    it("should calculate weight based on category", () => {
      const weight1 = calculateChargeWeight("transport", "normal", 30)
      const weight2 = calculateChargeWeight("household", "normal", 30)
      // Different categories should have different base weights
      expect(typeof weight1).toBe("number")
      expect(typeof weight2).toBe("number")
    })

    it("should increase weight for high urgency", () => {
      const normalWeight = calculateChargeWeight("household", "normal", 30)
      const highWeight = calculateChargeWeight("household", "high", 30)
      expect(highWeight).toBeGreaterThan(normalWeight)
    })

    it("should increase weight for critical urgency", () => {
      const highWeight = calculateChargeWeight("household", "high", 30)
      const criticalWeight = calculateChargeWeight("household", "critical", 30)
      expect(criticalWeight).toBeGreaterThan(highWeight)
    })

    it("should factor in duration", () => {
      const shortWeight = calculateChargeWeight("household", "normal", 15)
      const longWeight = calculateChargeWeight("household", "normal", 60)
      expect(longWeight).toBeGreaterThan(shortWeight)
    })

    it("should handle health category with high weight", () => {
      const healthWeight = calculateChargeWeight("health", "high", 60)
      const householdWeight = calculateChargeWeight("household", "high", 60)
      expect(healthWeight).toBeGreaterThan(householdWeight)
    })
  })

  describe("Task Duration Estimation", () => {
    it("should estimate duration by category", () => {
      const transportDuration = estimateTaskDuration("transport")
      const householdDuration = estimateTaskDuration("household")
      expect(transportDuration).toBeGreaterThan(0)
      expect(householdDuration).toBeGreaterThan(0)
    })

    it("should return reasonable estimates", () => {
      const duration = estimateTaskDuration("activities")
      expect(duration).toBeGreaterThanOrEqual(15)
      expect(duration).toBeLessThanOrEqual(180)
    })
  })

  describe("Assignee Suggestion", () => {
    it("should suggest assignee based on workloads", () => {
      const workloads = createMockWorkloads([
        { memberId: "member_1", currentLoad: 5, maxLoad: 10 },
        { memberId: "member_2", currentLoad: 8, maxLoad: 10 },
      ])

      const suggestion = suggestAssignee(workloads, "household", 2)
      expect(suggestion.memberId).toBe("member_1")
    })

    it("should return null if all members overloaded", () => {
      const workloads = createMockWorkloads([
        { memberId: "member_1", currentLoad: 10, maxLoad: 10 },
        { memberId: "member_2", currentLoad: 10, maxLoad: 10 },
      ])

      const suggestion = suggestAssignee(workloads, "household", 2)
      expect(suggestion.memberId).toBeNull()
    })

    it("should prefer member with lower load percentage", () => {
      const workloads = createMockWorkloads([
        { memberId: "member_1", currentLoad: 3, maxLoad: 10 }, // 30%
        { memberId: "member_2", currentLoad: 4, maxLoad: 8 },  // 50%
      ])

      const suggestion = suggestAssignee(workloads, "household", 2)
      expect(suggestion.memberId).toBe("member_1")
    })
  })
})

// =============================================================================
// INTEGRATION TESTS (8 tests)
// =============================================================================

describe("Voice Pipeline Integration", () => {
  it("should process audio upload through transcription", () => {
    let audioStore = createAudioProcessorStore()
    const uploadId = generateUploadId()
    audioStore = initializeUpload(audioStore, uploadId, "audio/webm")

    audioStore = addChunk(audioStore, uploadId, new Uint8Array([1, 2, 3]), 0)
    audioStore = addChunk(audioStore, uploadId, new Uint8Array([4, 5, 6]), 1)

    const assembled = assembleChunks(audioStore, uploadId)
    expect(assembled.success).toBe(true)

    let sttStore = createSTTStore()
    sttStore = startTranscription(sttStore, "trans_1", uploadId, "fr")
    expect(sttStore.transcriptions.has("trans_1")).toBe(true)
  })

  it("should extract semantics from transcription text", () => {
    const text = "Emmener Marie à la danse demain matin urgent"

    const category = detectCategoryFromKeywords(text)
    expect(category.primary).toBe("transport")

    const urgency = detectUrgencyFromKeywords(text)
    expect(["high", "critical"]).toContain(urgency.level)

    const date = parseDateFromText(text)
    expect(date.type).toBe("relative")
  })

  it("should generate task preview from complete extraction", () => {
    const extraction: SemanticExtraction = {
      transcriptionId: "trans_123",
      action: {
        raw: "Préparer le repas du soir",
        normalized: "préparer le repas du soir",
        verb: "préparer",
        object: "le repas du soir",
        confidence: { score: 0.9, reason: "Extracted" },
      },
      category: {
        primary: "food",
        secondary: null,
        confidence: { score: 0.9, reason: "Keywords" },
      },
      urgency: {
        level: "normal",
        confidence: { score: 0.8, reason: "Default" },
      },
      date: {
        raw: null,
        parsed: null,
        type: "none",
        confidence: { score: 0.5, reason: "No date" },
      },
      child: {
        childId: null,
        confidence: { score: 0.5, reason: "No child" },
      },
      confidence: { score: 0.85, reason: "Overall" },
      createdAt: new Date(),
    }

    const preview = generateTaskPreview(extraction, "household_123")
    expect(preview.category).toBe("food")
    expect(preview.title).toContain("Préparer")
  })

  it("should handle multi-language detection", () => {
    const frText = "Je dois préparer le dîner"
    const enText = "I need to prepare dinner"

    expect(detectLanguage(frText)).toBe("fr")
    expect(detectLanguage(enText)).toBe("en")
  })

  it("should calculate appropriate charge weights", () => {
    const medicalWeight = calculateChargeWeight("health", "high", 60)
    const choreWeight = calculateChargeWeight("household", "low", 15)

    expect(medicalWeight).toBeGreaterThan(choreWeight)
  })

  it("should match children correctly in context", () => {
    const children = [
      { id: "c1", firstName: "Sophie", age: 6 },
      { id: "c2", firstName: "Thomas", age: 10 },
    ]

    const result1 = matchChildFromContext("accompagner Sophie à l'école", children)
    expect(result1.childId).toBe("c1")

    const result2 = matchChildFromContext("les devoirs de Thomas", children)
    expect(result2.childId).toBe("c2")

    const result3 = matchChildFromContext("faire les courses", children)
    expect(result3.childId).toBeNull()
  })

  it("should handle full pipeline from audio to task preview", () => {
    // Step 1: Audio upload
    let audioStore = createAudioProcessorStore()
    const uploadId = generateUploadId()
    audioStore = initializeUpload(audioStore, uploadId, "audio/webm")
    audioStore = addChunk(audioStore, uploadId, new Uint8Array([1, 2, 3, 4, 5]), 0)
    const assembled = assembleChunks(audioStore, uploadId)
    expect(assembled.success).toBe(true)

    // Step 2: Transcription
    let sttStore = createSTTStore()
    sttStore = startTranscription(sttStore, "trans_1", uploadId, "fr")
    const result: TranscriptionResult = {
      text: "Emmener Lucas au football samedi",
      language: "fr",
      confidence: 0.92,
      duration: 2.5,
      words: [],
    }
    sttStore = completeTranscription(sttStore, "trans_1", result)

    // Step 3: Semantic extraction
    const category = detectCategoryFromKeywords(result.text)
    const urgency = detectUrgencyFromKeywords(result.text)
    const date = parseDateFromText(result.text)
    const children = [{ id: "c1", firstName: "Lucas", age: 8 }]
    const child = matchChildFromContext(result.text, children)

    // Verify extraction
    expect(category.primary).toBe("transport")
    expect(urgency.level).toBe("normal")
    expect(child.childId).toBe("c1")

    // Step 4: Task preview generation
    const extraction: SemanticExtraction = {
      transcriptionId: "trans_1",
      action: extractActionBasic(result.text),
      category,
      urgency,
      date,
      child,
      confidence: { score: 0.88, reason: "Pipeline test" },
      createdAt: new Date(),
    }

    const preview = generateTaskPreview(extraction, "household_123")
    expect(preview.title).toContain("Emmener")
    expect(preview.category).toBe("transport")
    expect(preview.childId).toBe("c1")
  })

  it("should handle edge cases gracefully", () => {
    // Empty text
    const emptyCategory = detectCategoryFromKeywords("")
    expect(emptyCategory.primary).toBe("other")

    // Unknown language
    const unknownLang = detectLanguage("xyz xyz xyz")
    expect(SUPPORTED_LANGUAGES.includes(unknownLang)).toBe(true)

    // No date in text
    const noDate = parseDateFromText("quelque chose sans date")
    expect(noDate.parsed).toBeNull()

    // No child match
    const noChild = matchChildFromContext("tâche générique", [])
    expect(noChild.childId).toBeNull()
  })
})
