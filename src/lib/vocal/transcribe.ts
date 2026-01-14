import OpenAI from "openai"
import { getObjectAsBuffer } from "@/lib/aws/s3"

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
})

export interface TranscriptionResult {
  text: string
  language: string
  duration?: number
}

export async function transcribeAudioFromS3(
  s3Key: string
): Promise<TranscriptionResult> {
  const audioBuffer = await getObjectAsBuffer(s3Key)

  const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" })

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    language: "fr",
    response_format: "verbose_json",
  })

  return {
    text: transcription.text,
    language: transcription.language ?? "fr",
    duration: transcription.duration,
  }
}

export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  filename: string = "audio.webm",
  mimeType: string = "audio/webm"
): Promise<TranscriptionResult> {
  const file = new File([audioBuffer], filename, { type: mimeType })

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    language: "fr",
    response_format: "verbose_json",
  })

  return {
    text: transcription.text,
    language: transcription.language ?? "fr",
    duration: transcription.duration,
  }
}

export async function transcribeAudioFromUrl(
  audioUrl: string
): Promise<TranscriptionResult> {
  const response = await fetch(audioUrl)
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = Buffer.from(arrayBuffer)

  return transcribeAudioBuffer(audioBuffer)
}
