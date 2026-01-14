/**
 * Tests for Vocal MVP
 *
 * Run with: bun run src/tests/vocal-test.ts
 *
 * These tests verify:
 * 1. Vocal validation schemas
 * 2. Semantic analysis schemas
 * 3. Deadline inference
 * 4. Priority mapping
 */

import { z } from "zod"
import {
  VocalUploadRequestSchema,
  VocalTranscribeRequestSchema,
  VocalAnalyzeRequestSchema,
  VocalCreateTaskRequestSchema,
  VocalAnalysisResultSchema,
} from "@/lib/validations/vocal"
import {
  VocalAnalysisSchema,
  inferDeadline,
  mapUrgencyToPriority,
} from "@/lib/vocal/analyze"

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`)
  }
  console.log(`PASS: ${message}`)
}

function testGroup(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`)
  try {
    fn()
  } catch (error) {
    console.error(`ERROR in ${name}:`, error)
    process.exitCode = 1
  }
}

// Tests
testGroup("VocalUploadRequestSchema", () => {
  const valid = { filename: "audio.webm", contentType: "audio/webm" }
  const result = VocalUploadRequestSchema.safeParse(valid)
  assert(result.success, "Valid upload request should pass")

  const noFilename = { contentType: "audio/webm" }
  const noFilenameResult = VocalUploadRequestSchema.safeParse(noFilename)
  assert(!noFilenameResult.success, "Upload without filename should fail")

  const defaultContentType = { filename: "test.webm" }
  const defaultResult = VocalUploadRequestSchema.safeParse(defaultContentType)
  assert(defaultResult.success, "Default content type should work")
  if (defaultResult.success) {
    assert(defaultResult.data.contentType === "audio/webm", "Default should be audio/webm")
  }
})

testGroup("VocalTranscribeRequestSchema", () => {
  const valid = { s3Key: "vocal/123-audio.webm" }
  const result = VocalTranscribeRequestSchema.safeParse(valid)
  assert(result.success, "Valid transcribe request should pass")

  const emptyKey = { s3Key: "" }
  const emptyResult = VocalTranscribeRequestSchema.safeParse(emptyKey)
  assert(!emptyResult.success, "Empty s3Key should fail")
})

testGroup("VocalAnalyzeRequestSchema", () => {
  const valid = { transcript: "Je dois emmener Emma chez le médecin" }
  const result = VocalAnalyzeRequestSchema.safeParse(valid)
  assert(result.success, "Valid analyze request should pass")

  const empty = { transcript: "" }
  const emptyResult = VocalAnalyzeRequestSchema.safeParse(empty)
  assert(!emptyResult.success, "Empty transcript should fail")
})

testGroup("VocalCreateTaskRequestSchema", () => {
  const valid = {
    title: "Rendez-vous médecin Emma",
    category_code: "sante",
    vocal_transcript: "Je dois emmener Emma chez le médecin",
    priority: "high",
  }
  const result = VocalCreateTaskRequestSchema.safeParse(valid)
  assert(result.success, "Valid create task request should pass")

  const noTitle = {
    category_code: "sante",
    vocal_transcript: "test",
  }
  const noTitleResult = VocalCreateTaskRequestSchema.safeParse(noTitle)
  assert(!noTitleResult.success, "Create task without title should fail")

  const invalidPriority = {
    title: "Test",
    category_code: "sante",
    vocal_transcript: "test",
    priority: "urgent",
  }
  const invalidPriorityResult = VocalCreateTaskRequestSchema.safeParse(invalidPriority)
  assert(!invalidPriorityResult.success, "Invalid priority should fail")
})

testGroup("VocalAnalysisSchema", () => {
  const valid = {
    action: "Emmener Emma chez le médecin",
    enfant: "Emma",
    date: "demain",
    categorie: "sante",
    urgence: "haute",
    confiance: 0.9,
  }
  const result = VocalAnalysisSchema.safeParse(valid)
  assert(result.success, "Valid analysis should pass")

  const nullChild = {
    action: "Faire les courses",
    enfant: null,
    date: null,
    categorie: "quotidien",
    urgence: "normale",
    confiance: 0.8,
  }
  const nullResult = VocalAnalysisSchema.safeParse(nullChild)
  assert(nullResult.success, "Analysis with null enfant should pass")

  const invalidCategory = {
    action: "Test",
    enfant: null,
    date: null,
    categorie: "invalid",
    urgence: "normale",
    confiance: 0.5,
  }
  const invalidCatResult = VocalAnalysisSchema.safeParse(invalidCategory)
  assert(!invalidCatResult.success, "Invalid category should fail")

  const invalidConfiance = {
    action: "Test",
    enfant: null,
    date: null,
    categorie: "quotidien",
    urgence: "normale",
    confiance: 1.5,
  }
  const invalidConfResult = VocalAnalysisSchema.safeParse(invalidConfiance)
  assert(!invalidConfResult.success, "Confidence > 1 should fail")
})

testGroup("inferDeadline", () => {
  // Null input
  const nullResult = inferDeadline(null)
  assert(nullResult === null, "Null input should return null")

  // Tomorrow
  const tomorrow = inferDeadline("demain")
  assert(tomorrow !== null, "demain should return a date")
  if (tomorrow) {
    const tomorrowDate = new Date(tomorrow)
    const expected = new Date()
    expected.setDate(expected.getDate() + 1)
    assert(
      tomorrowDate.getDate() === expected.getDate(),
      "demain should return tomorrow's date"
    )
  }

  // Semaine prochaine
  const nextWeek = inferDeadline("la semaine prochaine")
  assert(nextWeek !== null, "la semaine prochaine should return a date")
  if (nextWeek) {
    const nextWeekDate = new Date(nextWeek)
    const expected = new Date()
    expected.setDate(expected.getDate() + 7)
    assert(
      nextWeekDate.getDate() === expected.getDate(),
      "la semaine prochaine should be 7 days from now"
    )
  }

  // Day name (lundi)
  const monday = inferDeadline("lundi")
  assert(monday !== null, "lundi should return a date")

  // Unknown text - should default to +3 days
  const unknown = inferDeadline("plus tard")
  assert(unknown !== null, "Unknown text should return +3 days default")
})

testGroup("mapUrgencyToPriority", () => {
  assert(mapUrgencyToPriority("haute") === "high", "haute -> high")
  assert(mapUrgencyToPriority("normale") === "normal", "normale -> normal")
  assert(mapUrgencyToPriority("basse") === "low", "basse -> low")
})

console.log("\n=== All vocal tests completed ===")
