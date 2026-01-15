import OpenAI from "openai"
import { z } from "zod"
import { query, queryOne } from "@/lib/aws/database"

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
  })
}

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
  // Enhanced confidence details
  confidence_details: z.object({
    overall: z.number().min(0).max(1),
    action: z.number().min(0).max(1),
    date: z.number().min(0).max(1),
    child: z.number().min(0).max(1),
    category: z.number().min(0).max(1),
  }).optional(),
  date_parsed_from: z.string().nullable().optional(),
})

export type VocalTask = z.infer<typeof VocalTaskSchema>

/**
 * Confidence level descriptions
 */
export function getConfidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.9) return { label: "Très confiant", color: "green" }
  if (score >= 0.7) return { label: "Confiant", color: "blue" }
  if (score >= 0.5) return { label: "Modéré", color: "yellow" }
  return { label: "Incertain", color: "red" }
}

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
  const openai = getOpenAI()
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

/**
 * Parse date result with confidence
 */
export interface DateParseResult {
  date: string | null
  confidence: number
  source: "explicit" | "relative" | "inferred" | "default"
  parsed_from: string | null
}

/**
 * French month names for date parsing
 */
const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0,
  février: 1,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  août: 7,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  décembre: 11,
  decembre: 11,
}

/**
 * French day names
 */
const FRENCH_DAYS: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
}

/**
 * Enhanced date inference with confidence scoring
 * Supports complex French expressions
 */
export function inferDeadlineEnhanced(dateText: string | null): DateParseResult {
  if (!dateText) {
    return { date: null, confidence: 1, source: "explicit", parsed_from: null }
  }

  const now = new Date()
  const normalizedText = dateText.toLowerCase().trim()

  // Today
  if (normalizedText === "aujourd'hui" || normalizedText === "ce jour") {
    return {
      date: now.toISOString(),
      confidence: 1,
      source: "explicit",
      parsed_from: normalizedText,
    }
  }

  // Tomorrow
  if (normalizedText === "demain") {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return {
      date: tomorrow.toISOString(),
      confidence: 1,
      source: "relative",
      parsed_from: "demain",
    }
  }

  // Day after tomorrow
  if (normalizedText === "après-demain" || normalizedText === "apres-demain") {
    const afterTomorrow = new Date(now)
    afterTomorrow.setDate(afterTomorrow.getDate() + 2)
    return {
      date: afterTomorrow.toISOString(),
      confidence: 1,
      source: "relative",
      parsed_from: "après-demain",
    }
  }

  // This evening/tonight
  if (normalizedText === "ce soir" || normalizedText === "cette nuit") {
    const evening = new Date(now)
    evening.setHours(20, 0, 0, 0)
    return {
      date: evening.toISOString(),
      confidence: 0.9,
      source: "relative",
      parsed_from: normalizedText,
    }
  }

  // This morning
  if (normalizedText === "ce matin") {
    const morning = new Date(now)
    morning.setHours(9, 0, 0, 0)
    return {
      date: morning.toISOString(),
      confidence: 0.9,
      source: "relative",
      parsed_from: "ce matin",
    }
  }

  // This afternoon
  if (normalizedText === "cet après-midi" || normalizedText === "cet apres-midi") {
    const afternoon = new Date(now)
    afternoon.setHours(14, 0, 0, 0)
    return {
      date: afternoon.toISOString(),
      confidence: 0.9,
      source: "relative",
      parsed_from: "cet après-midi",
    }
  }

  // This week
  if (normalizedText === "cette semaine" || normalizedText.includes("dans la semaine")) {
    const endOfWeek = new Date(now)
    const daysUntilSunday = 7 - now.getDay()
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday)
    return {
      date: endOfWeek.toISOString(),
      confidence: 0.7,
      source: "relative",
      parsed_from: "cette semaine",
    }
  }

  // Next week
  if (normalizedText.includes("semaine prochaine") || normalizedText.includes("la semaine prochaine")) {
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return {
      date: nextWeek.toISOString(),
      confidence: 0.8,
      source: "relative",
      parsed_from: "semaine prochaine",
    }
  }

  // In X weeks
  const weeksMatch = normalizedText.match(/dans (\d+) semaines?/)
  if (weeksMatch && weeksMatch[1]) {
    const weeks = parseInt(weeksMatch[1], 10)
    const future = new Date(now)
    future.setDate(future.getDate() + weeks * 7)
    return {
      date: future.toISOString(),
      confidence: 0.9,
      source: "relative",
      parsed_from: `dans ${weeks} semaine(s)`,
    }
  }

  // In X days
  const daysMatch = normalizedText.match(/dans (\d+) jours?/)
  if (daysMatch && daysMatch[1]) {
    const days = parseInt(daysMatch[1], 10)
    const future = new Date(now)
    future.setDate(future.getDate() + days)
    return {
      date: future.toISOString(),
      confidence: 0.95,
      source: "relative",
      parsed_from: `dans ${days} jour(s)`,
    }
  }

  // This month
  if (normalizedText === "ce mois" || normalizedText === "ce mois-ci") {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      date: endOfMonth.toISOString(),
      confidence: 0.7,
      source: "relative",
      parsed_from: "ce mois-ci",
    }
  }

  // Next month
  if (normalizedText.includes("mois prochain") || normalizedText.includes("le mois prochain")) {
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return {
      date: nextMonth.toISOString(),
      confidence: 0.8,
      source: "relative",
      parsed_from: "mois prochain",
    }
  }

  // After the holidays (general French vacation periods)
  if (normalizedText.includes("après les vacances") || normalizedText.includes("apres les vacances")) {
    // Estimate: 2 weeks from now
    const afterHolidays = new Date(now)
    afterHolidays.setDate(afterHolidays.getDate() + 14)
    return {
      date: afterHolidays.toISOString(),
      confidence: 0.5,
      source: "inferred",
      parsed_from: "après les vacances",
    }
  }

  // At the start of school (rentrée)
  if (normalizedText.includes("rentrée") || normalizedText.includes("rentree")) {
    // September 1st
    const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear()
    const rentree = new Date(year, 8, 1)
    return {
      date: rentree.toISOString(),
      confidence: 0.6,
      source: "inferred",
      parsed_from: "rentrée",
    }
  }

  // End of year
  if (normalizedText.includes("fin d'année") || normalizedText.includes("fin d année")) {
    const endOfYear = new Date(now.getFullYear(), 11, 31)
    return {
      date: endOfYear.toISOString(),
      confidence: 0.7,
      source: "relative",
      parsed_from: "fin d'année",
    }
  }

  // "Before X" patterns
  if (normalizedText.startsWith("avant ")) {
    const beforeDate = normalizedText.slice(6)
    const result = inferDeadlineEnhanced(beforeDate)
    if (result.date) {
      const before = new Date(result.date)
      before.setDate(before.getDate() - 1)
      return {
        date: before.toISOString(),
        confidence: result.confidence * 0.9,
        source: result.source,
        parsed_from: `avant ${result.parsed_from}`,
      }
    }
  }

  // "D'ici" (within) patterns
  const dIciMatch = normalizedText.match(/d'ici (\w+)/)
  if (dIciMatch && dIciMatch[1]) {
    const result = inferDeadlineEnhanced(dIciMatch[1])
    if (result.date) {
      return {
        ...result,
        confidence: result.confidence * 0.85,
        parsed_from: `d'ici ${result.parsed_from ?? ""}`,
      }
    }
  }

  // Day names (prochain)
  for (const [dayName, dayIndex] of Object.entries(FRENCH_DAYS)) {
    if (normalizedText.includes(dayName)) {
      const targetDate = new Date(now)
      const currentDay = now.getDay()
      let daysToAdd = dayIndex - currentDay

      // Check for "prochain" which means next occurrence
      const isNextWeek = normalizedText.includes("prochain")
      if (daysToAdd <= 0 || isNextWeek) daysToAdd += 7

      targetDate.setDate(targetDate.getDate() + daysToAdd)
      return {
        date: targetDate.toISOString(),
        confidence: isNextWeek ? 0.95 : 0.85,
        source: "relative",
        parsed_from: `${dayName}${isNextWeek ? " prochain" : ""}`,
      }
    }
  }

  // French date format: "le X month" or "X month"
  // Use character class that includes French accented letters
  const frenchDateMatch = normalizedText.match(/(?:le\s+)?(\d{1,2})(?:er)?\s+([a-zàâäéèêëïîôùûüç]+)/i)
  if (frenchDateMatch && frenchDateMatch[1] && frenchDateMatch[2]) {
    const day = parseInt(frenchDateMatch[1], 10)
    const monthName = frenchDateMatch[2].toLowerCase()
    const month = FRENCH_MONTHS[monthName]

    if (month !== undefined && day >= 1 && day <= 31) {
      let year = now.getFullYear()
      const targetDate = new Date(year, month, day)

      // If date is in the past, assume next year
      if (targetDate < now) {
        year++
        targetDate.setFullYear(year)
      }

      return {
        date: targetDate.toISOString(),
        confidence: 0.95,
        source: "explicit",
        parsed_from: `${day} ${monthName}`,
      }
    }
  }

  // ISO date or standard format
  const parsed = new Date(dateText)
  if (!isNaN(parsed.getTime())) {
    return {
      date: parsed.toISOString(),
      confidence: 1,
      source: "explicit",
      parsed_from: dateText,
    }
  }

  // Default: add 3 days if we can't parse
  const defaultDeadline = new Date(now)
  defaultDeadline.setDate(defaultDeadline.getDate() + 3)
  return {
    date: defaultDeadline.toISOString(),
    confidence: 0.3,
    source: "default",
    parsed_from: null,
  }
}

/**
 * Simple deadline inference (backwards compatible)
 */
export function inferDeadline(dateText: string | null): string | null {
  return inferDeadlineEnhanced(dateText).date
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
  const dateResult = inferDeadlineEnhanced(analysis.date)

  // Calculate detailed confidence scores
  const actionConfidence = analysis.confiance
  const dateConfidence = dateResult.confidence
  const childConfidence = analysis.enfant
    ? (child ? 1 : 0.5)  // Found child = 1, mentioned but not found = 0.5
    : 1  // No child mentioned is certain
  const categoryConfidence = analysis.confiance * 0.95  // Categories are generally reliable

  // Overall confidence is weighted average
  const overallConfidence = (
    actionConfidence * 0.4 +
    dateConfidence * 0.3 +
    childConfidence * 0.15 +
    categoryConfidence * 0.15
  )

  return {
    title: analysis.action,
    description: null,
    child_id: child?.id ?? null,
    child_name: child?.first_name ?? analysis.enfant,
    category_code: analysis.categorie,
    priority: mapUrgencyToPriority(analysis.urgence),
    deadline: dateResult.date,
    source: "vocal",
    vocal_transcript: transcript,
    confidence_score: overallConfidence,
    confidence_details: {
      overall: overallConfidence,
      action: actionConfidence,
      date: dateConfidence,
      child: childConfidence,
      category: categoryConfidence,
    },
    date_parsed_from: dateResult.parsed_from,
  }
}
