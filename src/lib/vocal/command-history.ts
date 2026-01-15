/**
 * Vocal Command History Service
 *
 * Tracks and stores vocal command history for users.
 * Provides feedback, corrections, and analytics.
 */

import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"

/**
 * Vocal command status
 */
export type VocalCommandStatus = "pending" | "success" | "corrected" | "cancelled"

/**
 * Vocal command record schema
 */
export const VocalCommandSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  household_id: z.string().uuid(),
  transcript: z.string(),
  parsed_action: z.string(),
  parsed_child: z.string().nullable(),
  parsed_date: z.string().nullable(),
  parsed_category: z.string(),
  confidence_score: z.number().min(0).max(1),
  task_id: z.string().uuid().nullable(),
  status: z.enum(["pending", "success", "corrected", "cancelled"]),
  correction_notes: z.string().nullable(),
  created_at: z.string().datetime(),
})

export type VocalCommand = z.infer<typeof VocalCommandSchema>

/**
 * Create a new vocal command record
 */
export async function createVocalCommand(data: {
  user_id: string
  household_id: string
  transcript: string
  parsed_action: string
  parsed_child: string | null
  parsed_date: string | null
  parsed_category: string
  confidence_score: number
  task_id?: string | null
}): Promise<string> {
  const result = await queryOne<{ id: string }>(`
    INSERT INTO vocal_commands (
      user_id,
      household_id,
      transcript,
      parsed_action,
      parsed_child,
      parsed_date,
      parsed_category,
      confidence_score,
      task_id,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
    RETURNING id
  `, [
    data.user_id,
    data.household_id,
    data.transcript,
    data.parsed_action,
    data.parsed_child,
    data.parsed_date,
    data.parsed_category,
    data.confidence_score,
    data.task_id ?? null,
  ])

  if (!result) {
    throw new Error("Failed to create vocal command record")
  }

  return result.id
}

/**
 * Update vocal command status
 */
export async function updateVocalCommandStatus(
  commandId: string,
  status: VocalCommandStatus,
  taskId?: string,
  correctionNotes?: string
): Promise<void> {
  await query(`
    UPDATE vocal_commands
    SET
      status = $2,
      task_id = COALESCE($3, task_id),
      correction_notes = $4,
      updated_at = NOW()
    WHERE id = $1
  `, [commandId, status, taskId ?? null, correctionNotes ?? null])
}

/**
 * Get user's recent vocal commands
 */
export async function getUserVocalHistory(
  userId: string,
  limit: number = 10
): Promise<VocalCommand[]> {
  const commands = await query<VocalCommand>(`
    SELECT
      id,
      user_id,
      household_id,
      transcript,
      parsed_action,
      parsed_child,
      parsed_date,
      parsed_category,
      confidence_score,
      task_id,
      status,
      correction_notes,
      created_at
    FROM vocal_commands
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [userId, limit])

  return commands
}

/**
 * Get household vocal command statistics
 */
export async function getVocalStats(householdId: string): Promise<{
  total_commands: number
  success_rate: number
  avg_confidence: number
  correction_rate: number
  top_categories: { category: string; count: number }[]
}> {
  const stats = await queryOne<{
    total_commands: string
    success_count: string
    avg_confidence: string
    corrected_count: string
  }>(`
    SELECT
      COUNT(*) as total_commands,
      COUNT(*) FILTER (WHERE status = 'success') as success_count,
      AVG(confidence_score) as avg_confidence,
      COUNT(*) FILTER (WHERE status = 'corrected') as corrected_count
    FROM vocal_commands
    WHERE household_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
  `, [householdId])

  const topCategories = await query<{ category: string; count: string }>(`
    SELECT parsed_category as category, COUNT(*) as count
    FROM vocal_commands
    WHERE household_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY parsed_category
    ORDER BY count DESC
    LIMIT 5
  `, [householdId])

  const total = parseInt(stats?.total_commands ?? "0", 10)
  const success = parseInt(stats?.success_count ?? "0", 10)
  const corrected = parseInt(stats?.corrected_count ?? "0", 10)

  return {
    total_commands: total,
    success_rate: total > 0 ? success / total : 0,
    avg_confidence: parseFloat(stats?.avg_confidence ?? "0"),
    correction_rate: total > 0 ? corrected / total : 0,
    top_categories: topCategories.map(c => ({
      category: c.category,
      count: parseInt(c.count, 10),
    })),
  }
}

/**
 * Format vocal command summary for display
 */
export function formatCommandSummary(command: {
  parsed_action: string
  parsed_child: string | null
  parsed_date: string | null
  parsed_category: string
  confidence_score: number
}): string {
  const parts: string[] = []

  parts.push(`"${command.parsed_action}"`)

  if (command.parsed_child) {
    parts.push(`pour ${command.parsed_child}`)
  }

  if (command.parsed_date) {
    const date = new Date(command.parsed_date)
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    parts.push(`le ${formatted}`)
  }

  const confidencePercent = Math.round(command.confidence_score * 100)
  parts.push(`(${confidencePercent}% confiance)`)

  return parts.join(" ")
}

/**
 * Category display names in French
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  ecole: "École",
  sante: "Santé",
  administratif: "Administratif",
  quotidien: "Quotidien",
  social: "Social",
  activites: "Activités",
  logistique: "Logistique",
}
