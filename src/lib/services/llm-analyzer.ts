/**
 * LLM Analyzer Service
 *
 * Advanced semantic analysis using LLM for vocal command processing.
 * Enhances the basic vocal analysis with:
 * - Multi-entity extraction (multiple children, dates, actions)
 * - Ambiguity detection and resolution suggestions
 * - Context-aware category suggestions
 * - Urgency detection with reasoning
 */

import OpenAI from "openai"
import { z } from "zod"
import { query, queryOne } from "@/lib/aws/database"

// =============================================================================
// CONFIGURATION
// =============================================================================

function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
  })
}

const LLM_MODEL = "gpt-4o-mini"
const MAX_TOKENS = 1000
const TEMPERATURE = 0.2

// =============================================================================
// SCHEMAS
// =============================================================================

export const EntitySchema = z.object({
  type: z.enum(["child", "date", "action", "location", "object", "person"]),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  position: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
})

export type Entity = z.infer<typeof EntitySchema>

export const AmbiguitySchema = z.object({
  type: z.enum(["child", "date", "action", "category"]),
  description: z.string(),
  suggestions: z.array(z.string()),
  original_text: z.string(),
})

export type Ambiguity = z.infer<typeof AmbiguitySchema>

export const UrgencyAnalysisSchema = z.object({
  level: z.enum(["critical", "high", "normal", "low"]),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  deadline_pressure: z.boolean(),
  keywords_found: z.array(z.string()),
})

export type UrgencyAnalysis = z.infer<typeof UrgencyAnalysisSchema>

export const CategorySuggestionSchema = z.object({
  code: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
})

export type CategorySuggestion = z.infer<typeof CategorySuggestionSchema>

export const VocalCommandAnalysisSchema = z.object({
  primary_action: z.string(),
  secondary_actions: z.array(z.string()),
  entities: z.array(EntitySchema),
  urgency: UrgencyAnalysisSchema,
  suggested_categories: z.array(CategorySuggestionSchema),
  ambiguities: z.array(AmbiguitySchema),
  context_hints: z.array(z.string()),
  multi_task: z.boolean(),
  overall_confidence: z.number().min(0).max(1),
})

export type VocalCommandAnalysis = z.infer<typeof VocalCommandAnalysisSchema>

// =============================================================================
// PROMPTS
// =============================================================================

const ENTITY_EXTRACTION_PROMPT = `Tu es un expert en extraction d'entités pour une application de gestion familiale.

Analyse le texte suivant et extrais TOUTES les entités présentes:
- child: Prénoms d'enfants mentionnés
- date: Dates, expressions temporelles (demain, lundi prochain, dans 3 jours)
- action: Actions à effectuer (verbes + compléments)
- location: Lieux mentionnés (école, médecin, pharmacie)
- object: Objets concernés (cahier, médicament, uniforme)
- person: Autres personnes mentionnées (professeur, médecin, nounou)

Pour chaque entité, fournis:
- type: Le type d'entité
- value: La valeur extraite
- confidence: Score de confiance (0-1)

Réponds UNIQUEMENT en JSON avec le format:
{
  "entities": [
    { "type": "child", "value": "Emma", "confidence": 0.95 },
    { "type": "date", "value": "lundi prochain", "confidence": 0.9 }
  ]
}`

const URGENCY_DETECTION_PROMPT = `Tu es un expert en analyse d'urgence pour les tâches familiales.

Analyse le texte suivant et détermine le niveau d'urgence:
- critical: URGENT - doit être fait immédiatement (aujourd'hui)
- high: Important - doit être fait très bientôt (demain, cette semaine)
- normal: Standard - peut attendre un peu
- low: Pas urgent - à faire quand possible

Cherche ces indicateurs:
- Mots d'urgence: urgent, vite, rapidement, ne pas oublier, important, critique
- Pression temporelle: aujourd'hui, demain matin, avant ce soir, dernier délai
- Conséquences: sinon, autrement, sous peine de, risque
- Contexte médical/administratif urgent

Réponds UNIQUEMENT en JSON:
{
  "level": "high",
  "score": 0.8,
  "reasons": ["Expression 'demain matin' indique urgence", "Contexte médical"],
  "deadline_pressure": true,
  "keywords_found": ["demain", "rendez-vous"]
}`

const CATEGORY_SUGGESTION_PROMPT = `Tu es un expert en catégorisation de tâches familiales.

Catégories disponibles:
- ecole: École, devoirs, sorties scolaires, réunions parents, fournitures, cantine, transport scolaire
- sante: Médecin, dentiste, vaccins, ordonnances, pharmacie, allergies, urgences médicales
- administratif: Papiers, CAF, impôts, assurance, inscriptions, certificats, documents officiels
- quotidien: Courses, repas, ménage, linge, organisation maison
- social: Anniversaires, fêtes, invitations, cadeaux, activités sociales
- activites: Sport, musique, loisirs, clubs, stages, vacances
- logistique: Transport, déplacements, organisation, planning, coordination

Analyse le texte et suggère la meilleure catégorie avec tes raisons.

Réponds UNIQUEMENT en JSON:
{
  "suggested_categories": [
    {
      "code": "sante",
      "name": "Santé",
      "confidence": 0.9,
      "reasons": ["Mention de 'médecin'", "Contexte de rendez-vous médical"]
    }
  ]
}`

const AMBIGUITY_DETECTION_PROMPT = `Tu es un expert en détection d'ambiguïtés dans les commandes vocales.

Analyse le texte et identifie toute ambiguïté:
- child: Plusieurs enfants mentionnés sans clarté sur lequel est concerné
- date: Expression temporelle floue ou multiple interprétations
- action: Action pas claire ou multiple possibilités
- category: Pourrait appartenir à plusieurs catégories

Pour chaque ambiguïté, propose des questions de clarification.

Réponds UNIQUEMENT en JSON:
{
  "ambiguities": [
    {
      "type": "child",
      "description": "Deux enfants mentionnés: Emma et Lucas",
      "suggestions": ["Pour Emma ou Lucas ?", "Les deux enfants ?"],
      "original_text": "emmène les enfants"
    }
  ]
}`

const FULL_ANALYSIS_PROMPT = `Tu es un expert en analyse sémantique pour une application de gestion de charge mentale familiale.

Analyse le texte vocal transcrit et fournis une analyse complète:

1. PRIMARY_ACTION: L'action principale à effectuer
2. SECONDARY_ACTIONS: Actions secondaires si multiples tâches détectées
3. ENTITIES: Toutes les entités (enfants, dates, lieux, objets, personnes)
4. URGENCY: Niveau d'urgence avec justification
5. CATEGORIES: Catégories suggérées avec confiance
6. AMBIGUITIES: Ambiguïtés détectées avec suggestions
7. CONTEXT_HINTS: Indices contextuels pour améliorer l'interprétation
8. MULTI_TASK: Indique si plusieurs tâches distinctes

Catégories: ecole, sante, administratif, quotidien, social, activites, logistique

Niveaux d'urgence: critical, high, normal, low

Réponds UNIQUEMENT en JSON avec ce format exact:
{
  "primary_action": "string",
  "secondary_actions": ["string"],
  "entities": [{"type": "child|date|action|location|object|person", "value": "string", "confidence": 0.0-1.0}],
  "urgency": {"level": "critical|high|normal|low", "score": 0.0-1.0, "reasons": ["string"], "deadline_pressure": boolean, "keywords_found": ["string"]},
  "suggested_categories": [{"code": "string", "name": "string", "confidence": 0.0-1.0, "reasons": ["string"]}],
  "ambiguities": [{"type": "child|date|action|category", "description": "string", "suggestions": ["string"], "original_text": "string"}],
  "context_hints": ["string"],
  "multi_task": boolean,
  "overall_confidence": 0.0-1.0
}`

// =============================================================================
// ENTITY EXTRACTION
// =============================================================================

/**
 * Extract all entities from a vocal command text
 */
export async function extractEntities(text: string): Promise<Entity[]> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: ENTITY_EXTRACTION_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return []
  }

  const parsed = JSON.parse(content)
  const entities = z.array(EntitySchema).safeParse(parsed.entities)

  return entities.success ? entities.data : []
}

/**
 * Extract multiple children from text and match against household
 */
export async function extractChildren(
  text: string,
  householdId: string
): Promise<Array<{ id: string; first_name: string; mentioned_as: string; confidence: number }>> {
  const entities = await extractEntities(text)
  const childEntities = entities.filter((e) => e.type === "child")

  if (childEntities.length === 0) {
    return []
  }

  // Get all children in household
  const children = await query<{ id: string; first_name: string }>(`
    SELECT id, first_name
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  const results: Array<{ id: string; first_name: string; mentioned_as: string; confidence: number }> = []

  for (const entity of childEntities) {
    const normalizedMention = entity.value.toLowerCase().trim()

    // Find best matching child
    const match = children.find((c) => {
      const normalizedName = c.first_name.toLowerCase()
      return (
        normalizedName === normalizedMention ||
        normalizedName.includes(normalizedMention) ||
        normalizedMention.includes(normalizedName)
      )
    })

    if (match) {
      results.push({
        id: match.id,
        first_name: match.first_name,
        mentioned_as: entity.value,
        confidence: entity.confidence,
      })
    }
  }

  return results
}

// =============================================================================
// URGENCY DETECTION
// =============================================================================

/**
 * Analyze urgency level of a vocal command
 */
export async function detectUrgency(text: string): Promise<UrgencyAnalysis> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: URGENCY_DETECTION_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return {
      level: "normal",
      score: 0.5,
      reasons: [],
      deadline_pressure: false,
      keywords_found: [],
    }
  }

  const parsed = JSON.parse(content)
  const result = UrgencyAnalysisSchema.safeParse(parsed)

  return result.success
    ? result.data
    : {
        level: "normal",
        score: 0.5,
        reasons: [],
        deadline_pressure: false,
        keywords_found: [],
      }
}

/**
 * Fast urgency detection using keyword matching (no LLM call)
 */
export function detectUrgencyFast(text: string): UrgencyAnalysis {
  const normalizedText = text.toLowerCase()

  // Check low urgency FIRST because "pas urgent" contains "urgent"
  const lowKeywords = [
    "quand possible",
    "pas urgent",
    "c'est pas urgent",
    "un jour",
    "éventuellement",
    "si tu as le temps",
    "à l'occasion",
  ]

  const criticalKeywords = [
    "urgent",
    "urgence",
    "immédiatement",
    "tout de suite",
    "maintenant",
    "critique",
    "avant ce soir",
    "dans l'heure",
  ]

  const highKeywords = [
    "important",
    "vite",
    "rapidement",
    "ne pas oublier",
    "demain",
    "ce soir",
    "aujourd'hui",
    "dernier délai",
    "impératif",
  ]

  // Check low urgency first (contains phrases like "pas urgent")
  const foundLow = lowKeywords.filter((k) => normalizedText.includes(k))

  // Only check critical/high if not explicitly marked as low urgency
  const foundCritical = foundLow.length === 0
    ? criticalKeywords.filter((k) => normalizedText.includes(k))
    : []
  const foundHigh = foundLow.length === 0 && foundCritical.length === 0
    ? highKeywords.filter((k) => normalizedText.includes(k))
    : []

  let level: "critical" | "high" | "normal" | "low" = "normal"
  let score = 0.5
  const reasons: string[] = []
  const keywords = [...foundCritical, ...foundHigh, ...foundLow]

  // Low urgency takes priority (explicit de-escalation)
  if (foundLow.length > 0) {
    level = "low"
    score = 0.25
    reasons.push(`Indicateurs de faible urgence: ${foundLow.join(", ")}`)
  } else if (foundCritical.length > 0) {
    level = "critical"
    score = 0.95
    reasons.push(`Mots critiques détectés: ${foundCritical.join(", ")}`)
  } else if (foundHigh.length > 0) {
    level = "high"
    score = 0.75
    reasons.push(`Mots importants détectés: ${foundHigh.join(", ")}`)
  }

  // Check for deadline pressure
  const deadlinePatterns = [
    /avant\s+(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i,
    /d'ici\s+(demain|ce soir|la fin)/i,
    /pour\s+(demain|ce soir|lundi|mardi)/i,
  ]

  const deadlinePressure = deadlinePatterns.some((p) => p.test(text))
  if (deadlinePressure && level === "normal") {
    level = "high"
    score = 0.7
    reasons.push("Pression temporelle détectée")
  }

  return {
    level,
    score,
    reasons,
    deadline_pressure: deadlinePressure,
    keywords_found: keywords,
  }
}

// =============================================================================
// CATEGORY SUGGESTION
// =============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  ecole: [
    "école",
    "ecole",
    "devoir",
    "devoirs",
    "professeur",
    "maîtresse",
    "maitresse",
    "classe",
    "cantine",
    "récréation",
    "sortie scolaire",
    "réunion parents",
    "bulletin",
    "carnet",
    "cartable",
    "fournitures",
    "primaire",
    "collège",
    "lycée",
  ],
  sante: [
    "médecin",
    "medecin",
    "docteur",
    "dentiste",
    "vaccin",
    "vaccination",
    "ordonnance",
    "pharmacie",
    "médicament",
    "medicament",
    "fièvre",
    "malade",
    "allergie",
    "rendez-vous médical",
    "pédiatre",
    "pediatre",
    "hôpital",
    "hopital",
    "urgences",
  ],
  administratif: [
    "papier",
    "document",
    "caf",
    "impôt",
    "impot",
    "assurance",
    "mutuelle",
    "inscription",
    "formulaire",
    "certificat",
    "attestation",
    "carte vitale",
    "passeport",
    "carte identité",
    "mairie",
    "préfecture",
  ],
  quotidien: [
    "courses",
    "supermarché",
    "repas",
    "dîner",
    "diner",
    "déjeuner",
    "dejeuner",
    "cuisine",
    "ménage",
    "menage",
    "linge",
    "lessive",
    "aspirateur",
    "rangement",
    "poubelle",
    "vaisselle",
    "pain",
    "lait",
  ],
  social: [
    "anniversaire",
    "fête",
    "fete",
    "invitation",
    "cadeau",
    "ami",
    "copain",
    "copine",
    "goûter",
    "gouter",
    "pyjama party",
    "soirée",
    "barbecue",
  ],
  activites: [
    "sport",
    "football",
    "foot",
    "tennis",
    "piscine",
    "natation",
    "danse",
    "musique",
    "piano",
    "guitare",
    "judo",
    "karaté",
    "karate",
    "stage",
    "vacances",
    "centre aéré",
    "colonie",
    "cours de piano",
    "cours de tennis",
    "cours de danse",
    "cours de musique",
    "cours de sport",
    "cours de natation",
    "cours de judo",
    "cours de guitare",
    "entraînement",
    "entrainement",
    "match",
    "compétition",
  ],
  logistique: [
    "transport",
    "voiture",
    "bus",
    "métro",
    "metro",
    "trajet",
    "déposer",
    "deposer",
    "covoiturage",
    "planning",
    "organisation",
    "coordonner",
  ],
}

const CATEGORY_NAMES: Record<string, string> = {
  ecole: "École",
  sante: "Santé",
  administratif: "Administratif",
  quotidien: "Quotidien",
  social: "Social",
  activites: "Activités",
  logistique: "Logistique",
}

/**
 * Suggest category using LLM
 */
export async function suggestCategory(text: string): Promise<CategorySuggestion[]> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: CATEGORY_SUGGESTION_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return []
  }

  const parsed = JSON.parse(content)
  const suggestions = z.array(CategorySuggestionSchema).safeParse(parsed.suggested_categories)

  return suggestions.success ? suggestions.data : []
}

/**
 * Fast category suggestion using keyword matching (no LLM call)
 */
export function suggestCategoryFast(text: string): CategorySuggestion[] {
  const normalizedText = text.toLowerCase()
  const scores: Record<string, { score: number; keywords: string[] }> = {}

  // Sort keywords by length (longer first) to match phrases before individual words
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)
    const foundKeywords = sortedKeywords.filter((k) => normalizedText.includes(k))
    if (foundKeywords.length > 0) {
      // Give higher weight to longer (more specific) matches
      const specificity = foundKeywords.reduce((acc, k) => acc + k.length, 0) / 10
      scores[category] = {
        score: Math.min(foundKeywords.length * 0.2 + 0.4 + specificity * 0.1, 0.95),
        keywords: foundKeywords,
      }
    }
  }

  // Special handling for conflicting keywords
  // "récupérer" + "école" = logistique (transport context), not ecole
  if (scores["logistique"] && scores["ecole"]) {
    const hasTransportVerb = ["récupérer", "recuperer", "chercher", "déposer", "deposer", "emmener", "amener"]
      .some((v) => normalizedText.includes(v))
    if (hasTransportVerb) {
      scores["logistique"]!.score += 0.3
    }
  }

  // "cours de X" patterns -> activites takes priority
  if (normalizedText.includes("cours de ") && scores["activites"]) {
    scores["activites"]!.score += 0.4
  }

  const suggestions: CategorySuggestion[] = Object.entries(scores)
    .sort((a, b) => b[1].score - a[1].score)
    .map(([code, data]) => ({
      code,
      name: CATEGORY_NAMES[code] ?? code,
      confidence: data.score,
      reasons: [`Mots-clés détectés: ${data.keywords.join(", ")}`],
    }))

  // Default to quotidien if nothing matches
  if (suggestions.length === 0) {
    suggestions.push({
      code: "quotidien",
      name: "Quotidien",
      confidence: 0.3,
      reasons: ["Catégorie par défaut"],
    })
  }

  return suggestions
}

// =============================================================================
// AMBIGUITY DETECTION
// =============================================================================

/**
 * Detect ambiguities in vocal command using LLM
 */
export async function detectAmbiguities(text: string): Promise<Ambiguity[]> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: AMBIGUITY_DETECTION_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return []
  }

  const parsed = JSON.parse(content)
  const ambiguities = z.array(AmbiguitySchema).safeParse(parsed.ambiguities)

  return ambiguities.success ? ambiguities.data : []
}

/**
 * Fast ambiguity detection using patterns (no LLM call)
 */
export function detectAmbiguitiesFast(text: string, childNames: string[] = []): Ambiguity[] {
  const ambiguities: Ambiguity[] = []
  const normalizedText = text.toLowerCase()

  // Check for multiple children mentioned
  const mentionedChildren = childNames.filter((name) =>
    normalizedText.includes(name.toLowerCase())
  )
  if (mentionedChildren.length > 1) {
    ambiguities.push({
      type: "child",
      description: `Plusieurs enfants mentionnés: ${mentionedChildren.join(", ")}`,
      suggestions: [
        `Pour ${mentionedChildren[0]} uniquement ?`,
        `Pour ${mentionedChildren[1]} uniquement ?`,
        "Pour les deux ?",
      ],
      original_text: text,
    })
  }

  // Check for ambiguous date expressions
  const ambiguousDatePatterns = [
    { pattern: /la semaine (prochaine|suivante)/i, desc: "Semaine prochaine peut être ambigu" },
    { pattern: /ce week-?end/i, desc: "Ce week-end: samedi ou dimanche ?" },
    { pattern: /bientôt|prochainement/i, desc: "Expression temporelle vague" },
    { pattern: /dans quelques jours/i, desc: "Nombre de jours non spécifié" },
  ]

  for (const { pattern, desc } of ambiguousDatePatterns) {
    if (pattern.test(text)) {
      ambiguities.push({
        type: "date",
        description: desc,
        suggestions: [
          "Pouvez-vous préciser la date exacte ?",
          "Quel jour exactement ?",
        ],
        original_text: text,
      })
      break // Only report first date ambiguity
    }
  }

  // Check for ambiguous pronouns
  if (/\b(il|elle|lui|le|la)\b/.test(normalizedText) && mentionedChildren.length === 0) {
    ambiguities.push({
      type: "child",
      description: "Pronom utilisé sans mention explicite de l'enfant",
      suggestions: ["Quel enfant est concerné ?"],
      original_text: text,
    })
  }

  return ambiguities
}

// =============================================================================
// FULL ANALYSIS
// =============================================================================

/**
 * Perform complete vocal command analysis using LLM
 */
export async function analyzeVocalCommand(text: string): Promise<VocalCommandAnalysis> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: FULL_ANALYSIS_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS * 2,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    // Return default analysis
    return getDefaultAnalysis(text)
  }

  const parsed = JSON.parse(content)
  const result = VocalCommandAnalysisSchema.safeParse(parsed)

  return result.success ? result.data : getDefaultAnalysis(text)
}

/**
 * Fast analysis using pattern matching (no LLM call)
 * Useful for real-time feedback before full LLM analysis
 */
export function analyzeVocalCommandFast(
  text: string,
  childNames: string[] = []
): Partial<VocalCommandAnalysis> {
  const urgency = detectUrgencyFast(text)
  const categories = suggestCategoryFast(text)
  const ambiguities = detectAmbiguitiesFast(text, childNames)

  // Simple action extraction: first sentence or up to first comma
  const primaryAction = text.split(/[,.]/).map(s => s.trim()).filter(Boolean)[0] ?? text

  return {
    primary_action: primaryAction,
    secondary_actions: [],
    urgency,
    suggested_categories: categories,
    ambiguities,
    multi_task: text.includes(" et ") || text.includes(" puis "),
    overall_confidence: urgency.score * 0.5 + (categories[0]?.confidence ?? 0.5) * 0.5,
  }
}

/**
 * Get default analysis when LLM fails
 */
function getDefaultAnalysis(text: string): VocalCommandAnalysis {
  return {
    primary_action: text,
    secondary_actions: [],
    entities: [],
    urgency: {
      level: "normal",
      score: 0.5,
      reasons: [],
      deadline_pressure: false,
      keywords_found: [],
    },
    suggested_categories: [
      {
        code: "quotidien",
        name: "Quotidien",
        confidence: 0.3,
        reasons: ["Catégorie par défaut"],
      },
    ],
    ambiguities: [],
    context_hints: [],
    multi_task: false,
    overall_confidence: 0.3,
  }
}

// =============================================================================
// HYBRID ANALYSIS (Fast + LLM)
// =============================================================================

/**
 * Perform hybrid analysis: fast patterns first, then LLM refinement
 * Returns fast results immediately, then updates with LLM results
 */
export async function analyzeVocalCommandHybrid(
  text: string,
  householdId: string,
  onFastResult?: (result: Partial<VocalCommandAnalysis>) => void
): Promise<VocalCommandAnalysis> {
  // Get household children for ambiguity detection
  const children = await query<{ first_name: string }>(`
    SELECT first_name FROM children WHERE household_id = $1 AND is_active = true
  `, [householdId])
  const childNames = children.map((c) => c.first_name)

  // Fast analysis first
  const fastResult = analyzeVocalCommandFast(text, childNames)
  if (onFastResult) {
    onFastResult(fastResult)
  }

  // Full LLM analysis
  const fullResult = await analyzeVocalCommand(text)

  // Merge results, preferring LLM but keeping fast ambiguity detection
  return {
    ...fullResult,
    ambiguities: [
      ...fullResult.ambiguities,
      ...fastResult.ambiguities?.filter(
        (fa) => !fullResult.ambiguities.some((a) => a.type === fa.type)
      ) ?? [],
    ],
  }
}

// =============================================================================
// CONTEXT ENHANCEMENT
// =============================================================================

/**
 * Enhance analysis with household context
 */
export async function enhanceWithContext(
  analysis: VocalCommandAnalysis,
  householdId: string
): Promise<VocalCommandAnalysis> {
  // Get recent tasks for context
  const recentTasks = await query<{ title: string; category_code: string }>(`
    SELECT title, category_code
    FROM tasks
    WHERE household_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `, [householdId])

  // Count category frequency
  const categoryFrequency: Record<string, number> = {}
  for (const task of recentTasks) {
    categoryFrequency[task.category_code] = (categoryFrequency[task.category_code] ?? 0) + 1
  }

  // Boost category confidence based on recent usage
  const enhancedCategories = analysis.suggested_categories.map((cat) => {
    const boost = (categoryFrequency[cat.code] ?? 0) * 0.05
    return {
      ...cat,
      confidence: Math.min(cat.confidence + boost, 0.99),
      reasons: boost > 0
        ? [...cat.reasons, `Catégorie fréquente dans ce foyer`]
        : cat.reasons,
    }
  })

  // Check for similar recent tasks
  const similarTasks = recentTasks.filter((t) =>
    analysis.primary_action.toLowerCase().includes(t.title.toLowerCase().substring(0, 10))
  )

  const contextHints = [...analysis.context_hints]
  if (similarTasks.length > 0) {
    contextHints.push(`Tâche similaire récente: "${similarTasks[0]?.title}"`)
  }

  return {
    ...analysis,
    suggested_categories: enhancedCategories,
    context_hints: contextHints,
  }
}
