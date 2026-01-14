import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { transcribeAudioFromS3 } from "@/lib/vocal/transcribe"
import { VocalTranscribeRequestSchema } from "@/lib/validations/vocal"

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const body = await request.json()
  const validation = VocalTranscribeRequestSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { s3Key } = validation.data

  const result = await transcribeAudioFromS3(s3Key)

  return NextResponse.json({
    text: result.text,
    language: result.language,
    duration: result.duration,
  })
}
