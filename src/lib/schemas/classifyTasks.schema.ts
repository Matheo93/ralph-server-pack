import { z } from "zod"

// Schema for a single classified task
export const ClassifiedTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  child_name: z.string().nullable(),
  category: z.enum([
    "ecole",
    "sante",
    "administratif",
    "quotidien",
    "social",
    "activites",
    "logistique",
  ]),
  priority: z.enum(["critical", "high", "normal", "low"]),
  deadline_text: z.string().nullable(),
  assigned_to: z.enum(["me", "partner", "both", "anyone"]).nullable(),
})

export type ClassifiedTask = z.infer<typeof ClassifiedTaskSchema>

// Schema for the full classification response
export const ClassificationResponseSchema = z.object({
  tasks: z.array(ClassifiedTaskSchema),
  summary: z.string().optional(),
})

// Mapped task with resolved IDs
export interface MappedTask {
  title: string
  description: string | null
  child_id: string | null
  child_name: string | null
  category_code: string
  category_id: string | null
  priority: "critical" | "high" | "normal" | "low"
  deadline: string | null
  deadline_text: string | null
  assigned_to: "me" | "partner" | "both" | "anyone" | null
  confidence: number
}

export interface ClassifyTasksResult {
  success: boolean
  tasks: MappedTask[]
  error?: string
  rawText?: string
}
