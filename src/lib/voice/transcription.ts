/**
 * Voice Transcription Service
 *
 * Provides speech-to-text functionality using Whisper API (OpenAI).
 * Falls back to Deepgram if configured.
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptionResult {
  success: boolean
  text?: string
  language?: string
  duration?: number
  confidence?: number
  error?: string
}

export interface TranscriptionOptions {
  language?: "fr" | "en" | "auto"
  prompt?: string
  responseFormat?: "json" | "text" | "verbose_json"
}

const TranscriptionResponseSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
  segments: z.array(z.object({
    text: z.string(),
    start: z.number(),
    end: z.number(),
    confidence: z.number().optional(),
  })).optional(),
})

// =============================================================================
// CONSTANTS
// =============================================================================

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions"
const DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen"

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024 // 25MB limit
const MAX_DURATION_SECONDS = 30

// =============================================================================
// CONFIGURATION
// =============================================================================

function getOpenAIKey(): string | null {
  return process.env["OPENAI_API_KEY"] ?? null
}

function getDeepgramKey(): string | null {
  return process.env["DEEPGRAM_API_KEY"] ?? null
}

export function isTranscriptionConfigured(): boolean {
  return getOpenAIKey() !== null || getDeepgramKey() !== null
}

export function getTranscriptionProvider(): "whisper" | "deepgram" | null {
  if (getOpenAIKey()) return "whisper"
  if (getDeepgramKey()) return "deepgram"
  return null
}

// =============================================================================
// WHISPER API
// =============================================================================

async function transcribeWithWhisper(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const apiKey = getOpenAIKey()
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured" }
  }

  const { language = "auto", prompt, responseFormat = "verbose_json" } = options

  try {
    const formData = new FormData()
    formData.append("file", audioBlob, "audio.webm")
    formData.append("model", "whisper-1")
    formData.append("response_format", responseFormat)

    if (language !== "auto") {
      formData.append("language", language)
    }

    if (prompt) {
      formData.append("prompt", prompt)
    }

    const response = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Whisper API error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    const parsed = TranscriptionResponseSchema.safeParse(data)

    if (!parsed.success) {
      return { success: false, error: "Invalid response from Whisper API" }
    }

    // Calculate average confidence from segments
    let confidence: number | undefined
    if (parsed.data.segments && parsed.data.segments.length > 0) {
      const confidences = parsed.data.segments
        .map((s) => s.confidence)
        .filter((c): c is number => c !== undefined)
      if (confidences.length > 0) {
        confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length
      }
    }

    return {
      success: true,
      text: normalizeText(parsed.data.text),
      language: parsed.data.language ?? (language !== "auto" ? language : undefined),
      duration: parsed.data.duration,
      confidence,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transcription error",
    }
  }
}

// =============================================================================
// DEEPGRAM API
// =============================================================================

async function transcribeWithDeepgram(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const apiKey = getDeepgramKey()
  if (!apiKey) {
    return { success: false, error: "Deepgram API key not configured" }
  }

  const { language = "auto" } = options

  try {
    const params = new URLSearchParams({
      model: "nova-2",
      smart_format: "true",
      punctuate: "true",
    })

    if (language !== "auto") {
      params.append("language", language)
    } else {
      params.append("detect_language", "true")
    }

    const response = await fetch(`${DEEPGRAM_API_URL}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": audioBlob.type || "audio/webm",
      },
      body: audioBlob,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Deepgram API error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()

    const channel = data.results?.channels?.[0]
    const alternative = channel?.alternatives?.[0]

    if (!alternative?.transcript) {
      return { success: false, error: "No transcription in response" }
    }

    return {
      success: true,
      text: normalizeText(alternative.transcript),
      language: channel?.detected_language ?? (language !== "auto" ? language : undefined),
      duration: data.metadata?.duration,
      confidence: alternative.confidence,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transcription error",
    }
  }
}

// =============================================================================
// TEXT NORMALIZATION
// =============================================================================

/**
 * Normalize transcribed text for better processing
 */
export function normalizeText(text: string): string {
  let normalized = text.trim()

  // Remove excessive whitespace
  normalized = normalized.replace(/\s+/g, " ")

  // Capitalize first letter
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  // Ensure proper sentence ending
  if (!/[.!?]$/.test(normalized) && normalized.length > 0) {
    normalized += "."
  }

  return normalized
}

// =============================================================================
// VALIDATION
// =============================================================================

export function validateAudioBlob(blob: Blob): { valid: boolean; error?: string } {
  if (blob.size === 0) {
    return { valid: false, error: "Audio file is empty" }
  }

  if (blob.size > MAX_AUDIO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Audio file too large. Maximum size is ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024}MB`,
    }
  }

  const validTypes = [
    "audio/webm",
    "audio/mp3",
    "audio/mpeg",
    "audio/mp4",
    "audio/m4a",
    "audio/wav",
    "audio/ogg",
  ]

  if (blob.type && !validTypes.includes(blob.type)) {
    return {
      valid: false,
      error: `Unsupported audio format: ${blob.type}. Supported: ${validTypes.join(", ")}`,
    }
  }

  return { valid: true }
}

// =============================================================================
// MAIN TRANSCRIPTION FUNCTION
// =============================================================================

/**
 * Transcribe audio to text
 *
 * Uses Whisper API by default, falls back to Deepgram if configured.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // Validate audio
  const validation = validateAudioBlob(audioBlob)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // Check configuration
  const provider = getTranscriptionProvider()
  if (!provider) {
    return {
      success: false,
      error: "No transcription service configured. Set OPENAI_API_KEY or DEEPGRAM_API_KEY.",
    }
  }

  // Transcribe with appropriate provider
  if (provider === "whisper") {
    const result = await transcribeWithWhisper(audioBlob, options)

    // Fallback to Deepgram if Whisper fails and Deepgram is configured
    if (!result.success && getDeepgramKey()) {
      return transcribeWithDeepgram(audioBlob, options)
    }

    return result
  }

  return transcribeWithDeepgram(audioBlob, options)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert audio duration to human-readable format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)

  if (mins === 0) {
    return `${secs}s`
  }

  return `${mins}m ${secs}s`
}

/**
 * Check if duration is within limits
 */
export function isValidDuration(seconds: number): boolean {
  return seconds > 0 && seconds <= MAX_DURATION_SECONDS
}

/**
 * Get max audio duration in seconds
 */
export function getMaxDuration(): number {
  return MAX_DURATION_SECONDS
}
