import OpenAI from "openai"
import { z } from "zod"
import { query, queryOne } from "@/lib/aws/database"

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
})

export const VocalAnalysisSchema = z.object({
  action: z.string().min(1),
  enfant: z.string().nullable(),
  date: z.string().nullable(),
  categorie: z.enum([
    "ecole",
    "sante",
    "administratif",
    "quotidien",
    "social",
    "activites",
    "logistique",
  ]),
  urgence: z.enum(["haute", "normale", "basse"]),
  confiance: z.number().min(0).max(1),
})

export type VocalAnalysis = z.infer<typeof VocalAnalysisSchema>

export const VocalTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  child_id: z.string().uuid().nullable(),
  child_name: z.string().nullable(),
  category_code: z.string(),
  priority: z.enum(["critical", "high", "normal", "low"]),
  deadline: z.string().datetime().nullable(),
  source: z.literal("vocal"),
  vocal_transcript: z.string(),
  confidence_score: z.number().min(0).max(1),
})

export type VocalTask = z.infer<typeof VocalTaskSchema>

const ANALYSIS_PROMPT = `Tu es un assistant de charge mentale familiale.
À partir du texte transcrit d'un message vocal, tu dois extraire les informations suivantes en JSON:

- action: string - L'action à faire (verbe + complément), formulée clairement
- enfant: string | null - Le prénom de l'enfant concerné, ou null si pas d'enfant mentionné
- date: string | null - La date mentionnée (format ISO YYYY-MM-DD ou description comme "demain", "la semaine prochaine"), ou null
- categorie: string - Une des catégories: "ecole", "sante", "administratif", "quotidien", "social", "activites", "logistique"
- urgence: string - "haute" (très urgent, aujourd'hui/demain), "normale" (cette semaine), "basse" (plus tard)
- confiance: number - Score de confiance entre 0 et 1 sur ton interprétation

Règles:
- Si plusieurs actions sont mentionnées, extrais la principale
- Pour les dates relatives ("demain", "lundi prochain"), garde le texte tel quel
- Si tu n'es pas sûr d'un champ, mets null et baisse le score de confiance
- La catégorie "administratif" inclut: papiers, assurance, CAF, impôts, inscriptions
- La catégorie "ecole" inclut: sorties scolaires, réunions, fournitures, cantine
- La catégorie "sante" inclut: médecin, dentiste, vaccins, ordonnances

Réponds UNIQUEMENT avec le JSON, sans commentaire.`

export async function analyzeTranscript(text: string): Promise<VocalAnalysis> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ANALYSIS_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 500,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error("No response from OpenAI")
  }

  const parsed = JSON.parse(content)
  const validated = VocalAnalysisSchema.parse(parsed)

  return validated
}

export async function matchChild(
  name: string | null,
  householdId: string
): Promise<{ id: string; first_name: string } | null> {
  if (!name) return null

  const normalizedName = name.toLowerCase().trim()

  const child = await queryOne<{ id: string; first_name: string }>(`
    SELECT id, first_name
    FROM children
    WHERE household_id = $1
      AND is_active = true
      AND LOWER(first_name) LIKE $2
    ORDER BY
      CASE WHEN LOWER(first_name) = $3 THEN 0 ELSE 1 END,
      first_name
    LIMIT 1
  `, [householdId, `%${normalizedName}%`, normalizedName])

  return child
}

export async function getCategoryId(categoryCode: string): Promise<string | null> {
  const category = await queryOne<{ id: string }>(`
    SELECT id FROM task_categories WHERE code = $1
  `, [categoryCode])

  return category?.id ?? null
}

export function inferDeadline(dateText: string | null): string | null {
  if (!dateText) return null

  const now = new Date()
  const normalizedText = dateText.toLowerCase().trim()

  if (normalizedText === "aujourd'hui" || normalizedText === "aujourd'hui") {
    return now.toISOString()
  }

  if (normalizedText === "demain") {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString()
  }

  if (normalizedText === "après-demain" || normalizedText === "apres-demain") {
    const afterTomorrow = new Date(now)
    afterTomorrow.setDate(afterTomorrow.getDate() + 2)
    return afterTomorrow.toISOString()
  }

  if (normalizedText.includes("semaine prochaine") || normalizedText.includes("la semaine prochaine")) {
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek.toISOString()
  }

  if (normalizedText.includes("mois prochain") || normalizedText.includes("le mois prochain")) {
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth.toISOString()
  }

  const dayNames: Record<string, number> = {
    dimanche: 0,
    lundi: 1,
    mardi: 2,
    mercredi: 3,
    jeudi: 4,
    vendredi: 5,
    samedi: 6,
  }

  for (const [dayName, dayIndex] of Object.entries(dayNames)) {
    if (normalizedText.includes(dayName)) {
      const targetDate = new Date(now)
      const currentDay = now.getDay()
      let daysToAdd = dayIndex - currentDay
      if (daysToAdd <= 0) daysToAdd += 7
      targetDate.setDate(targetDate.getDate() + daysToAdd)
      return targetDate.toISOString()
    }
  }

  // Try to parse as date
  const parsed = new Date(dateText)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  // Default: add 3 days if we can't parse
  const defaultDeadline = new Date(now)
  defaultDeadline.setDate(defaultDeadline.getDate() + 3)
  return defaultDeadline.toISOString()
}

export function mapUrgencyToPriority(urgence: "haute" | "normale" | "basse"): "critical" | "high" | "normal" | "low" {
  const mapping: Record<string, "critical" | "high" | "normal" | "low"> = {
    haute: "high",
    normale: "normal",
    basse: "low",
  }
  return mapping[urgence] ?? "normal"
}

export async function createVocalTask(
  transcript: string,
  householdId: string
): Promise<VocalTask> {
  const analysis = await analyzeTranscript(transcript)

  const child = await matchChild(analysis.enfant, householdId)
  const deadline = inferDeadline(analysis.date)

  return {
    title: analysis.action,
    description: null,
    child_id: child?.id ?? null,
    child_name: child?.first_name ?? analysis.enfant,
    category_code: analysis.categorie,
    priority: mapUrgencyToPriority(analysis.urgence),
    deadline,
    source: "vocal",
    vocal_transcript: transcript,
    confidence_score: analysis.confiance,
  }
}
