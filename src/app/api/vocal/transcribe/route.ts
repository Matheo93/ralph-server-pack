import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { transcribeAudioFromS3 } from "@/lib/vocal/transcribe"
import { VocalTranscribeRequestSchema } from "@/lib/validations/vocal"
import { createApiLogger, createRequestTimer } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const logger = createApiLogger()
  const getElapsed = createRequestTimer()

  const userId = await getUserId()
  if (!userId) {
    logger.request("POST", "/api/vocal/transcribe", 401, getElapsed())
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const loggerWithUser = logger.withUserId(userId)

  const body = await request.json()
  const validation = VocalTranscribeRequestSchema.safeParse(body)

  if (!validation.success) {
    loggerWithUser.request("POST", "/api/vocal/transcribe", 400, getElapsed(), {
      validationError: validation.error.issues[0]?.message,
    })
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { s3Key } = validation.data

  try {
    const result = await transcribeAudioFromS3(s3Key)

    loggerWithUser.request("POST", "/api/vocal/transcribe", 200, getElapsed(), {
      audioDuration: result.duration,
      language: result.language,
      textLength: result.text.length,
    })

    return NextResponse.json({
      text: result.text,
      language: result.language,
      duration: result.duration,
    })
  } catch (error) {
    loggerWithUser.errorWithStack(
      "Transcription failed",
      error instanceof Error ? error : new Error(String(error)),
      { s3Key }
    )
    loggerWithUser.request("POST", "/api/vocal/transcribe", 500, getElapsed())
    return NextResponse.json(
      { error: "Erreur lors de la transcription" },
      { status: 500 }
    )
  }
}
