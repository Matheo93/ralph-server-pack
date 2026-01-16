"use server"

import OpenAI from "openai"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { query, queryOne } from "@/lib/aws/database"
import {
  ClassificationResponseSchema,
  type MappedTask,
  type ClassifyTasksResult,
} from "@/lib/schemas/classifyTasks.schema"

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
  })
}

const CLASSIFICATION_PROMPT = `Tu es un assistant de gestion familiale expert.
A partir du texte fourni (notes vocales transcrites ou texte libre), tu dois:

1. EXTRAIRE toutes les taches mentionnees (il peut y en avoir plusieurs)
2. CLASSER chaque tache selon:
   - title: L'action a faire (verbe + complement), claire et actionable
   - description: Details supplementaires si mentionnes, sinon null
   - child_name: Prenom de l'enfant concerne, ou null
   - category: Une parmi: "ecole", "sante", "administratif", "quotidien", "social", "activites", "logistique"
   - priority: "critical" (aujourd'hui/demain), "high" (cette semaine), "normal" (bientot), "low" (plus tard)
   - deadline_text: La date mentionnee telle quelle ("demain", "lundi prochain", "15 janvier"), ou null
   - assigned_to: "me" (je/moi), "partner" (mon mari/ma femme/conjoint), "both" (tous les deux/ensemble), "anyone" (quelqu'un), ou null

Regles:
- Une phrase peut contenir PLUSIEURS taches ("acheter du pain ET prendre rdv medecin" = 2 taches)
- Categories:
  * "ecole": cantine, fournitures, sorties scolaires, reunions, devoirs
  * "sante": medecin, dentiste, vaccins, ordonnances, pharmacie
  * "administratif": papiers, CAF, impots, assurance, inscriptions
  * "quotidien": courses, menage, cuisine, linge, rangement
  * "social": anniversaires, invitations, cadeaux
  * "activites": sport, musique, loisirs extra-scolaires
  * "logistique": transport, accompagnement, organisation
- Si une tache semble urgente (mots: "urgent", "vite", "tout de suite"), mets priority=critical
- Si "on" ou "nous" est mentionne, assigned_to="both"

Reponds UNIQUEMENT avec un JSON valide de ce format:
{
  "tasks": [
    {
      "title": "...",
      "description": null,
      "child_name": null,
      "category": "quotidien",
      "priority": "normal",
      "deadline_text": null,
      "assigned_to": null
    }
  ],
  "summary": "Resume optionnel du contexte"
}`

/**
 * Parse French date text to ISO date
 */
function parseFrenchDate(dateText: string | null): string | null {
  if (!dateText) return null

  const now = new Date()
  const text = dateText.toLowerCase().trim()

  // Today
  if (text === "aujourd'hui" || text === "ce jour") {
    return now.toISOString()
  }

  // Tomorrow
  if (text === "demain") {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString()
  }

  // Day after tomorrow
  if (text === "apres-demain" || text === "apres demain") {
    const afterTomorrow = new Date(now)
    afterTomorrow.setDate(afterTomorrow.getDate() + 2)
    return afterTomorrow.toISOString()
  }

  // This week
  if (text === "cette semaine") {
    const endOfWeek = new Date(now)
    endOfWeek.setDate(endOfWeek.getDate() + (7 - now.getDay()))
    return endOfWeek.toISOString()
  }

  // Next week
  if (text.includes("semaine prochaine")) {
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek.toISOString()
  }

  // Day names
  const frenchDays: Record<string, number> = {
    dimanche: 0, lundi: 1, mardi: 2, mercredi: 3,
    jeudi: 4, vendredi: 5, samedi: 6,
  }

  for (const [day, index] of Object.entries(frenchDays)) {
    if (text.includes(day)) {
      const target = new Date(now)
      const current = now.getDay()
      let diff = index - current
      if (diff <= 0 || text.includes("prochain")) {
        diff += 7
      }
      target.setDate(target.getDate() + diff)
      return target.toISOString()
    }
  }

  // French months for "le X month" format
  const frenchMonths: Record<string, number> = {
    janvier: 0, fevrier: 1, mars: 2, avril: 3,
    mai: 4, juin: 5, juillet: 6, aout: 7,
    septembre: 8, octobre: 9, novembre: 10, decembre: 11,
  }

  const dateMatch = text.match(/(?:le\s+)?(\d{1,2})(?:er)?\s+([a-z]+)/)
  if (dateMatch && dateMatch[1] && dateMatch[2]) {
    const day = parseInt(dateMatch[1], 10)
    const monthName = dateMatch[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const month = frenchMonths[monthName]

    if (month !== undefined) {
      let year = now.getFullYear()
      const target = new Date(year, month, day)
      if (target < now) {
        year++
        target.setFullYear(year)
      }
      return target.toISOString()
    }
  }

  // Try ISO format
  const parsed = new Date(dateText)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  // Default: 3 days from now
  const defaultDate = new Date(now)
  defaultDate.setDate(defaultDate.getDate() + 3)
  return defaultDate.toISOString()
}

/**
 * Match child name to household children
 */
async function matchChild(
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

/**
 * Get category ID from code
 */
async function getCategoryId(code: string): Promise<string | null> {
  const category = await queryOne<{ id: string }>(`
    SELECT id FROM task_categories WHERE code = $1
  `, [code])
  return category?.id ?? null
}

/**
 * Classify text input into multiple tasks using AI
 */
export async function classifyTasks(text: string): Promise<ClassifyTasksResult> {
  try {
    // Get user and household
    const user = await getUser()
    if (!user) {
      return { success: false, tasks: [], error: "Non authentifie" }
    }

    const membership = await getHousehold()
    if (!membership) {
      return { success: false, tasks: [], error: "Pas de foyer" }
    }

    const household = membership.households as { id: string }
    const householdId = household.id

    // Call OpenAI
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return { success: false, tasks: [], error: "Pas de reponse de l'IA" }
    }

    // Parse and validate response
    const parsed = JSON.parse(content)
    const validated = ClassificationResponseSchema.parse(parsed)

    // Map tasks with resolved IDs
    const mappedTasks: MappedTask[] = await Promise.all(
      validated.tasks.map(async (task) => {
        const child = await matchChild(task.child_name, householdId)
        const categoryId = await getCategoryId(task.category)
        const deadline = parseFrenchDate(task.deadline_text)

        return {
          title: task.title,
          description: task.description,
          child_id: child?.id ?? null,
          child_name: child?.first_name ?? task.child_name,
          category_code: task.category,
          category_id: categoryId,
          priority: task.priority,
          deadline,
          deadline_text: task.deadline_text,
          assigned_to: task.assigned_to,
          confidence: 0.85, // Base confidence for AI classification
        }
      })
    )

    return {
      success: true,
      tasks: mappedTasks,
      rawText: text,
    }
  } catch (err) {
    console.error("Classification error:", err)
    return {
      success: false,
      tasks: [],
      error: err instanceof Error ? err.message : "Erreur de classification",
    }
  }
}

/**
 * Create multiple tasks from classified results
 */
export async function createTasksFromClassification(
  tasks: MappedTask[]
): Promise<{ success: boolean; taskIds: string[]; errors: string[] }> {
  const user = await getUser()
  if (!user) {
    return { success: false, taskIds: [], errors: ["Non authentifie"] }
  }

  const membership = await getHousehold()
  if (!membership) {
    return { success: false, taskIds: [], errors: ["Pas de foyer"] }
  }

  const household = membership.households as { id: string }
  const taskIds: string[] = []
  const errors: string[] = []

  for (const task of tasks) {
    try {
      const result = await queryOne<{ id: string }>(`
        INSERT INTO tasks (
          household_id,
          created_by,
          assigned_to,
          title,
          description,
          category_id,
          child_id,
          priority,
          deadline,
          source,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'magic_notepad', 'pending')
        RETURNING id
      `, [
        household.id,
        user.id,
        user.id, // Default assigned to creator
        task.title,
        task.description,
        task.category_id,
        task.child_id,
        task.priority,
        task.deadline,
      ])

      if (result?.id) {
        taskIds.push(result.id)
      }
    } catch (err) {
      errors.push(`Erreur pour "${task.title}": ${err instanceof Error ? err.message : "Erreur"}`)
    }
  }

  return {
    success: taskIds.length > 0,
    taskIds,
    errors,
  }
}
