/**
 * Semantic Analysis Service
 *
 * Analyzes transcribed text to extract task information using LLM.
 * Supports OpenAI GPT-4 and Anthropic Claude.
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export const TASK_CATEGORIES = [
  "ecole",
  "sante",
  "administratif",
  "quotidien",
  "social",
  "activites",
  "logistique",
  "autre",
] as const

export type TaskCategory = (typeof TASK_CATEGORIES)[number]

export type Urgency = "haute" | "normale" | "basse"

export const TaskExtractionSchema = z.object({
  action: z.string().min(3).max(200),
  childName: z.string().nullable(),
  date: z.string().nullable(),
  category: z.enum([
    "ecole",
    "sante",
    "administratif",
    "quotidien",
    "social",
    "activites",
    "logistique",
    "autre",
  ]),
  urgency: z.enum(["haute", "normale", "basse"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
})

export type TaskExtraction = z.infer<typeof TaskExtractionSchema>

export interface AnalysisResult {
  success: boolean
  extraction?: TaskExtraction
  rawResponse?: string
  error?: string
}

export interface AnalysisOptions {
  childrenNames?: string[]
  language?: "fr" | "en"
  householdContext?: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

function getOpenAIKey(): string | null {
  return process.env["OPENAI_API_KEY"] ?? null
}

function getAnthropicKey(): string | null {
  return process.env["ANTHROPIC_API_KEY"] ?? null
}

export function isAnalysisConfigured(): boolean {
  return getOpenAIKey() !== null || getAnthropicKey() !== null
}

export function getAnalysisProvider(): "openai" | "anthropic" | null {
  if (getOpenAIKey()) return "openai"
  if (getAnthropicKey()) return "anthropic"
  return null
}

// =============================================================================
// PROMPT
// =============================================================================

function buildSystemPrompt(options: AnalysisOptions): string {
  const { childrenNames = [], language = "fr" } = options

  const childrenContext =
    childrenNames.length > 0
      ? `\nEnfants du foyer: ${childrenNames.join(", ")}`
      : ""

  if (language === "fr") {
    return `Tu es un assistant de charge mentale familiale.
À partir du texte fourni par un parent, extrais les informations de la tâche en JSON.
${childrenContext}

Catégories disponibles:
- ecole: inscriptions, fournitures, réunions, sorties scolaires
- sante: vaccins, médecin, dentiste, ordonnances, médicaments
- administratif: papiers, assurance, CAF, impôts, documents
- quotidien: repas, vêtements, courses, ménage
- social: anniversaires, cadeaux, invitations, fêtes
- activites: sport, musique, inscriptions loisirs
- logistique: transport, garde, vacances, déplacements
- autre: tout ce qui ne rentre pas dans les catégories ci-dessus

Règles:
1. Si un prénom d'enfant est mentionné, mets-le dans childName
2. Si une date/période est mentionnée (demain, lundi, semaine prochaine...), mets-la dans date
3. Estime l'urgence: haute (aujourd'hui/demain), normale (cette semaine), basse (plus tard)
4. La confiance doit refléter la clarté du texte (0.9+ si très clair, 0.5-0.7 si ambigu)
5. L'action doit être formulée comme une tâche actionnable

Réponds UNIQUEMENT avec un JSON valide, sans texte supplémentaire.`
  }

  return `You are a family mental load assistant.
Extract task information from the parent's text and return JSON.
${childrenContext}

Categories:
- ecole: school registrations, supplies, meetings, outings
- sante: vaccines, doctor, dentist, prescriptions
- administratif: paperwork, insurance, taxes, documents
- quotidien: meals, clothing, groceries, housekeeping
- social: birthdays, gifts, invitations, parties
- activites: sports, music, leisure registrations
- logistique: transportation, childcare, vacations
- autre: anything else

Rules:
1. Put child name in childName if mentioned
2. Put date/period in date if mentioned (tomorrow, Monday, next week...)
3. Urgency: haute (today/tomorrow), normale (this week), basse (later)
4. Confidence reflects clarity (0.9+ if clear, 0.5-0.7 if ambiguous)
5. Action should be an actionable task

Respond ONLY with valid JSON.`
}

function buildExampleOutput(): string {
  return JSON.stringify(
    {
      action: "Renvoyer l'autorisation de sortie scolaire",
      childName: "Emma",
      date: "cette semaine",
      category: "ecole",
      urgency: "normale",
      confidence: 0.92,
      reasoning: "Texte clair, enfant identifié, délai implicite court",
    },
    null,
    2
  )
}

// =============================================================================
// OPENAI ANALYSIS
// =============================================================================

async function analyzeWithOpenAI(
  text: string,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  const apiKey = getOpenAIKey()
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured" }
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSystemPrompt(options) },
          {
            role: "user",
            content: `Exemple de sortie attendue:\n${buildExampleOutput()}\n\nTexte à analyser:\n"${text}"`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, error: "No content in OpenAI response" }
    }

    return parseExtractionResponse(content)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown analysis error",
    }
  }
}

// =============================================================================
// ANTHROPIC ANALYSIS
// =============================================================================

async function analyzeWithAnthropic(
  text: string,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  const apiKey = getAnthropicKey()
  if (!apiKey) {
    return { success: false, error: "Anthropic API key not configured" }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        system: buildSystemPrompt(options),
        messages: [
          {
            role: "user",
            content: `Exemple de sortie attendue:\n${buildExampleOutput()}\n\nTexte à analyser:\n"${text}"`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Anthropic API error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    const content = data.content?.[0]?.text

    if (!content) {
      return { success: false, error: "No content in Anthropic response" }
    }

    return parseExtractionResponse(content)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown analysis error",
    }
  }
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

function parseExtractionResponse(content: string): AnalysisResult {
  try {
    // Try to extract JSON from the response
    let jsonContent = content.trim()

    // Handle markdown code blocks
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1]?.trim() ?? jsonContent
    }

    const parsed = JSON.parse(jsonContent)
    const validated = TaskExtractionSchema.safeParse(parsed)

    if (!validated.success) {
      return {
        success: false,
        rawResponse: content,
        error: `Invalid extraction format: ${validated.error.message}`,
      }
    }

    return {
      success: true,
      extraction: validated.data,
      rawResponse: content,
    }
  } catch (error) {
    return {
      success: false,
      rawResponse: content,
      error: error instanceof Error ? `JSON parse error: ${error.message}` : "Parse error",
    }
  }
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze transcribed text to extract task information
 */
export async function analyzeText(
  text: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  // Validate input
  if (!text || text.trim().length < 3) {
    return { success: false, error: "Text too short to analyze" }
  }

  if (text.length > 1000) {
    return { success: false, error: "Text too long. Maximum 1000 characters." }
  }

  // Check configuration
  const provider = getAnalysisProvider()
  if (!provider) {
    return {
      success: false,
      error: "No analysis service configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.",
    }
  }

  // Analyze with appropriate provider
  if (provider === "openai") {
    const result = await analyzeWithOpenAI(text, options)

    // Fallback to Anthropic if OpenAI fails
    if (!result.success && getAnthropicKey()) {
      return analyzeWithAnthropic(text, options)
    }

    return result
  }

  return analyzeWithAnthropic(text, options)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: TaskCategory, language: "fr" | "en" = "fr"): string {
  const names: Record<TaskCategory, { fr: string; en: string }> = {
    ecole: { fr: "École", en: "School" },
    sante: { fr: "Santé", en: "Health" },
    administratif: { fr: "Administratif", en: "Administrative" },
    quotidien: { fr: "Quotidien", en: "Daily" },
    social: { fr: "Social", en: "Social" },
    activites: { fr: "Activités", en: "Activities" },
    logistique: { fr: "Logistique", en: "Logistics" },
    autre: { fr: "Autre", en: "Other" },
  }

  return names[category]?.[language] ?? category
}

/**
 * Get urgency display name
 */
export function getUrgencyDisplayName(urgency: Urgency, language: "fr" | "en" = "fr"): string {
  const names: Record<Urgency, { fr: string; en: string }> = {
    haute: { fr: "Haute", en: "High" },
    normale: { fr: "Normale", en: "Normal" },
    basse: { fr: "Basse", en: "Low" },
  }

  return names[urgency]?.[language] ?? urgency
}

/**
 * Convert urgency to priority number (1-3)
 */
export function urgencyToPriority(urgency: Urgency | string): number {
  switch (urgency) {
    case "haute":
    case "high":
      return 1
    case "normale":
    case "normal":
      return 2
    case "basse":
    case "low":
      return 3
    default:
      return 2
  }
}

/**
 * Get system prompt for analysis
 */
export function getSystemPrompt(language: "fr" | "en", childrenNames?: string[]): string {
  return buildSystemPrompt({ childrenNames, language })
}

/**
 * Detect task category from text using keywords
 */
export function detectCategoryFromText(text: string): TaskCategory {
  const lower = text.toLowerCase()

  // Health keywords
  if (/médecin|docteur|dentiste|vaccin|ordonnance|pharmacie|médicament|santé|hôpital|rendez-vous médical/i.test(lower)) {
    return "sante"
  }

  // School keywords
  if (/école|collège|lycée|prof|enseignant|réunion.*parent|fourniture|cartable|rentrée|scolaire|élève|devoirs/i.test(lower)) {
    return "ecole"
  }

  // Activities keywords
  if (/sport|foot|football|rugby|tennis|natation|piscine|musique|piano|guitare|danse|activité|club|cours de/i.test(lower)) {
    return "activites"
  }

  // Social keywords
  if (/anniversaire|fête|cadeau|invitation|ami|amis|soirée|goûter|copain|copine/i.test(lower)) {
    return "social"
  }

  // Administrative keywords
  if (/papier|document|formulaire|assurance|caf|impôt|passeport|carte.*identité|administratif|dossier|inscription/i.test(lower)) {
    return "administratif"
  }

  // Logistics keywords
  if (/emmener|chercher|récupérer|conduire|transport|garde|baby|nourrice|vacances|voyage|déplacement|voiture/i.test(lower)) {
    return "logistique"
  }

  // Daily keywords
  if (/couche|repas|cuisine|courses|vêtement|lessive|ménage|linge|manger|supermarché|acheter.*pain|acheter.*lait/i.test(lower)) {
    return "quotidien"
  }

  return "autre"
}

/**
 * Detect urgency from text using keywords
 */
export function detectUrgencyFromText(text: string): Urgency {
  const lower = text.toLowerCase()

  // High urgency
  if (/urgent|important|immédiat|aujourd'hui|tout de suite|vite|rapidement|asap|maintenant/i.test(lower)) {
    return "haute"
  }

  // Low urgency
  if (/quand.*peut|si possible|éventuellement|pas pressé|plus tard|un jour|occasionnel/i.test(lower)) {
    return "basse"
  }

  return "normale"
}

/**
 * Extract child name from text
 */
export function extractChildName(text: string, childrenNames: string[]): string | null {
  if (!text || childrenNames.length === 0) return null

  const lower = text.toLowerCase()

  for (const name of childrenNames) {
    if (lower.includes(name.toLowerCase())) {
      return name
    }
  }

  return null
}

/**
 * Parse relative date string to Date object
 */
export function parseRelativeDate(dateStr: string | null, language: "fr" | "en" = "fr"): Date | null {
  if (!dateStr) return null

  const lower = dateStr.toLowerCase().trim()
  const now = new Date()

  // French patterns
  if (language === "fr") {
    if (lower === "aujourd'hui" || lower === "aujourdhui") {
      return now
    }
    if (lower === "demain") {
      const date = new Date(now)
      date.setDate(date.getDate() + 1)
      return date
    }
    if (lower === "après-demain" || lower === "apres-demain") {
      const date = new Date(now)
      date.setDate(date.getDate() + 2)
      return date
    }
    if (lower.includes("semaine prochaine") || lower.includes("la semaine prochaine")) {
      const date = new Date(now)
      date.setDate(date.getDate() + 7)
      return date
    }
    if (lower.includes("cette semaine")) {
      const date = new Date(now)
      date.setDate(date.getDate() + 3) // Mid-week estimate
      return date
    }
    if (lower.includes("mois prochain") || lower.includes("le mois prochain")) {
      const date = new Date(now)
      date.setMonth(date.getMonth() + 1)
      return date
    }

    // Day of week parsing (French)
    const daysFr: Record<string, number> = {
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
      dimanche: 0,
    }

    for (const [day, dayIndex] of Object.entries(daysFr)) {
      if (lower.includes(day)) {
        const date = new Date(now)
        const currentDay = date.getDay()
        const daysUntil = (dayIndex - currentDay + 7) % 7 || 7
        date.setDate(date.getDate() + daysUntil)
        return date
      }
    }
  }

  // English patterns
  if (language === "en") {
    if (lower === "today") return now
    if (lower === "tomorrow") {
      const date = new Date(now)
      date.setDate(date.getDate() + 1)
      return date
    }
    if (lower === "next week") {
      const date = new Date(now)
      date.setDate(date.getDate() + 7)
      return date
    }
    if (lower === "this week") {
      const date = new Date(now)
      date.setDate(date.getDate() + 3)
      return date
    }
  }

  return null
}
