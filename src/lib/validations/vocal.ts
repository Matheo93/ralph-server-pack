import { z } from "zod"

export const VocalUploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().default("audio/webm"),
})

export type VocalUploadRequest = z.infer<typeof VocalUploadRequestSchema>

export const VocalTranscribeRequestSchema = z.object({
  s3Key: z.string().min(1),
})

export type VocalTranscribeRequest = z.infer<typeof VocalTranscribeRequestSchema>

export const VocalAnalyzeRequestSchema = z.object({
  transcript: z.string().min(1),
})

export type VocalAnalyzeRequest = z.infer<typeof VocalAnalyzeRequestSchema>

export const VocalCreateTaskRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  child_id: z.string().uuid().nullable().optional(),
  category_code: z.string().min(1),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  deadline: z.string().datetime().nullable().optional(),
  vocal_transcript: z.string().min(1),
  vocal_audio_url: z.string().url().nullable().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
})

export type VocalCreateTaskRequest = z.infer<typeof VocalCreateTaskRequestSchema>

export const VocalAnalysisResultSchema = z.object({
  action: z.string(),
  enfant: z.string().nullable(),
  date: z.string().nullable(),
  categorie: z.string(),
  urgence: z.enum(["haute", "normale", "basse"]),
  confiance: z.number(),
})

export type VocalAnalysisResult = z.infer<typeof VocalAnalysisResultSchema>
