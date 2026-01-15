/**
 * Voice Transcription API
 *
 * POST: Transcribe audio to text using Whisper/Deepgram
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser } from "@/lib/aws/database"
import {
  transcribeAudio,
  isTranscriptionConfigured,
  validateAudioBlob,
  getMaxDuration,
} from "@/lib/voice/transcription"

/**
 * POST /api/voice/transcribe
 * Transcribe audio file to text
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Check if transcription is configured
  if (!isTranscriptionConfigured()) {
    return NextResponse.json(
      { error: "Transcription non configurée" },
      { status: 503 }
    )
  }

  try {
    // Get form data
    const formData = await request.formData()
    const audioFile = formData.get("audio")
    const language = formData.get("language") as string | null

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Fichier audio manquant" },
        { status: 400 }
      )
    }

    // Validate audio
    const validation = validateAudioBlob(audioFile)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Transcribe
    const result = await transcribeAudio(audioFile, {
      language: language === "en" ? "en" : language === "fr" ? "fr" : "auto",
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Erreur de transcription" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
      confidence: result.confidence,
    })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la transcription" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/voice/transcribe
 * Get transcription configuration info
 */
export async function GET() {
  return NextResponse.json({
    configured: isTranscriptionConfigured(),
    maxDurationSeconds: getMaxDuration(),
    supportedFormats: ["audio/webm", "audio/mp3", "audio/wav", "audio/m4a"],
    supportedLanguages: ["fr", "en", "auto"],
  })
}
