import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { canUseMagicChat } from "@/lib/services/subscription"
import { query, queryOne, insert, setCurrentUser } from "@/lib/aws/database"

const requestSchema = z.object({
  message: z.string().min(1).max(500),
  householdId: z.string().uuid(),
})

interface Child {
  id: string
  name: string
  age: number
}

interface Task {
  id: string
  title: string
  status: string
  child_name: string
  due_date: string | null
  assigned_to: string
}

interface HouseholdStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
}

interface ChatContext {
  children: Child[]
  tasks: Task[]
  stats: HouseholdStats
  householdId: string
  userId: string
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides" },
        { status: 400 }
      )
    }

    const { message, householdId } = validation.data

    // Check premium access
    const chatAccess = await canUseMagicChat(householdId)
    if (!chatAccess.allowed) {
      return NextResponse.json(
        { error: "Le Chat Magique nécessite un abonnement Premium" },
        { status: 403 }
      )
    }

    await setCurrentUser(userId)

    // Get context data for the AI
    const [children, tasks, stats] = await Promise.all([
      getChildren(householdId),
      getRecentTasks(householdId),
      getHouseholdStats(householdId),
    ])

    // Generate AI response based on message and context
    const response = await generateResponse(message, {
      children,
      tasks,
      stats,
      householdId,
      userId,
    })

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Magic chat error:", error)
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    )
  }
}

async function getChildren(householdId: string): Promise<Child[]> {
  const result = await query<{ id: string; first_name: string; birthdate: string }>(`
    SELECT id, first_name, birthdate
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  return result.map((c) => ({
    id: c.id,
    name: c.first_name,
    age: Math.floor((Date.now() - new Date(c.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
  }))
}

async function getRecentTasks(householdId: string): Promise<Task[]> {
  const result = await query<Task>(`
    SELECT
      t.id,
      t.title,
      t.status,
      c.first_name as child_name,
      t.deadline as due_date,
      COALESCE(u.email, 'Non assigné') as assigned_to
    FROM tasks t
    LEFT JOIN children c ON c.id = t.child_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.household_id = $1
    ORDER BY t.created_at DESC
    LIMIT 20
  `, [householdId])

  return result
}

async function getHouseholdStats(householdId: string): Promise<HouseholdStats> {
  const result = await queryOne<{
    total: string
    completed: string
    pending: string
    overdue: string
  }>(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'pending' AND deadline < CURRENT_DATE) as overdue
    FROM tasks
    WHERE household_id = $1
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  `, [householdId])

  return {
    totalTasks: parseInt(result?.total ?? "0", 10),
    completedTasks: parseInt(result?.completed ?? "0", 10),
    pendingTasks: parseInt(result?.pending ?? "0", 10),
    overdueTasks: parseInt(result?.overdue ?? "0", 10),
  }
}

/**
 * Parse natural language to extract task creation details
 * Supports many natural French expressions for task creation
 */
function parseTaskCreationRequest(message: string, children: Child[]): {
  isTaskCreation: boolean
  childName?: string
  childId?: string
  taskTitle?: string
  dueDate?: Date
  dueTime?: string
} {
  const lowerMessage = message.toLowerCase()

  // Patterns that clearly indicate NON-task queries (questions, stats)
  const nonTaskPatterns = [
    /^(quelles?|combien|qui|où|comment|pourquoi)\s/i,
    /en retard/i,
    /résumé?e?/i,
    /statistiques?/i,
    /charge mentale/i,
    /répartition/i,
    /mes enfants/i,
    /aide/i,
    /help/i,
  ]

  if (nonTaskPatterns.some(pattern => pattern.test(lowerMessage))) {
    return { isTaskCreation: false }
  }

  // Extended keywords for task creation - much more comprehensive
  const taskKeywords = [
    // Direct task creation
    "ajoute", "ajouter", "créer", "crée", "créé", "nouvelle tâche", "note", "noter",
    // Obligations
    "doit", "doivent", "dois", "devons", "devez", "faut", "il faut", "faudrait", "faudra",
    // Reminders
    "rappelle", "rappeler", "rappel", "n'oublie", "noublie", "oublie pas", "pense à", "penser à",
    // Actions (verbs that imply tasks)
    "acheter", "prendre", "passer", "aller", "faire", "appeler", "téléphoner", "envoyer",
    "récupérer", "chercher", "déposer", "ramener", "emmener", "amener", "apporter",
    "ranger", "nettoyer", "laver", "préparer", "cuisiner", "réparer", "payer", "réserver",
    "inscrire", "planifier", "organiser", "vérifier", "contrôler", "commander",
    // Shopping specific
    "courses", "achats", "liste",
    // Medical/Admin
    "rdv", "rendez-vous", "rendezvous", "médecin", "docteur", "vaccin",
  ]

  // Check if message contains task-related keywords
  const hasTaskKeyword = taskKeywords.some(kw => lowerMessage.includes(kw))

  // Also check for action verb patterns (infinitive or conjugated)
  const actionVerbPatterns = [
    /\b(je|tu|il|elle|on|nous|vous|ils|elles)\s+(dois|doit|devons|devez|doivent|vais|vas|va|allons|allez|vont|peux|peut|pouvons|pouvez|peuvent)\s/i,
    /\bfaut\s+(que\s+)?(je|tu|il|on|nous|vous|ils)?\s*/i,
    /\b(passer|aller|faire)\s+(prendre|chercher|acheter|récupérer)/i,
    /\bpense[rz]?\s+à\s/i,
  ]

  const hasActionPattern = actionVerbPatterns.some(pattern => pattern.test(lowerMessage))

  if (!hasTaskKeyword && !hasActionPattern) {
    return { isTaskCreation: false }
  }

  // Find matching child
  let childName: string | undefined
  let childId: string | undefined
  for (const child of children) {
    if (lowerMessage.includes(child.name.toLowerCase())) {
      childName = child.name
      childId = child.id
      break
    }
  }

  // Extract task title - start with original message
  let taskTitle = message

  // Remove child name
  if (childName) {
    const childRegex = new RegExp(childName, "gi")
    taskTitle = taskTitle.replace(childRegex, "").trim()
  }

  // Remove common prefixes and filler words
  const prefixPatterns = [
    /^(il\s+)?faut\s+(que\s+)?(je|tu|il|on|nous|vous)?\s*/i,
    /^(je|tu|il|elle|on|nous|vous)\s+(dois|doit|devons|devez|vais|vas|va|peux|peut)\s*/i,
    /^(ajoute|ajouter|créer|crée|note|noter|rappelle|rappeler)\s*(une\s+tâche\s*:?\s*)?/i,
    /^(n'oublie\s+pas|noublie\s+pas|pense\s+à|penser\s+à)\s*(de\s+)?/i,
    /^(passer|aller)\s+(prendre|chercher|acheter)\s*/i,
  ]

  for (const pattern of prefixPatterns) {
    taskTitle = taskTitle.replace(pattern, "").trim()
  }

  // Remove possessive pronouns that are now orphaned
  taskTitle = taskTitle
    .replace(/^\s*(ses|son|sa|leur|leurs|mes|mon|ma|nos|notre|des|du|de la|les|le|la|un|une)\s+/gi, "")
    .replace(/\s+(ses|son|sa|leur|leurs)\s+/gi, " ")
    .trim()

  // Parse date/time
  let dueDate: Date | undefined
  let dueTime: string | undefined

  // Handle "demain"
  if (lowerMessage.includes("demain")) {
    dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    taskTitle = taskTitle.replace(/\s*demain\s*/gi, " ").trim()
  }

  // Handle "aujourd'hui"
  if (lowerMessage.includes("aujourd'hui") || lowerMessage.includes("aujourdhui")) {
    dueDate = new Date()
    taskTitle = taskTitle.replace(/\s*(aujourd'hui|aujourdhui)\s*/gi, " ").trim()
  }

  // Handle "après-demain"
  if (lowerMessage.includes("après-demain") || lowerMessage.includes("apres-demain") || lowerMessage.includes("après demain")) {
    dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 2)
    taskTitle = taskTitle.replace(/\s*(après-demain|apres-demain|après demain)\s*/gi, " ").trim()
  }

  // Handle "dans X jours"
  const daysMatch = lowerMessage.match(/dans\s+(\d+)\s+jours?/i)
  if (daysMatch && daysMatch[1]) {
    dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + parseInt(daysMatch[1], 10))
    taskTitle = taskTitle.replace(/\s*dans\s+\d+\s+jours?\s*/gi, " ").trim()
  }

  // Handle time extraction (e.g., "à 19h", "à 14:00", "à 9h30")
  const timeMatch = lowerMessage.match(/à\s*(\d{1,2})[h:]?(\d{0,2})/i)
  if (timeMatch && timeMatch[1]) {
    const hours = parseInt(timeMatch[1], 10)
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
    dueTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

    if (dueDate) {
      dueDate.setHours(hours, minutes, 0, 0)
    }

    taskTitle = taskTitle.replace(/\s*à\s*\d{1,2}[h:]?\d{0,2}\s*/gi, " ").trim()
  }

  // Handle "pour" prefix for date context
  taskTitle = taskTitle.replace(/\s*pour\s*/gi, " ").trim()

  // Clean up extra whitespace and punctuation
  taskTitle = taskTitle
    .replace(/\s+/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim()

  // Capitalize first letter
  if (taskTitle) {
    taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1)
  }

  return {
    isTaskCreation: true,
    childName,
    childId,
    taskTitle: taskTitle || undefined,
    dueDate,
    dueTime,
  }
}

/**
 * Create a task in the database
 */
async function createTask(params: {
  householdId: string
  userId: string
  childId?: string
  title: string
  dueDate?: Date
}): Promise<{ id: string; title: string } | null> {
  try {
    const result = await insert<{ id: string; title: string }>("tasks", {
      household_id: params.householdId,
      title: params.title,
      child_id: params.childId || null,
      assigned_to: params.userId,
      created_by: params.userId,
      status: "pending",
      source: "chat",
      priority: "normal",
      deadline: params.dueDate ? params.dueDate.toISOString().split("T")[0] : null,
    })

    return result
  } catch (error) {
    console.error("Error creating task:", error)
    return null
  }
}

async function generateResponse(
  message: string,
  context: ChatContext
): Promise<string> {
  const lowerMessage = message.toLowerCase()

  // Check for task creation request FIRST
  const taskParsed = parseTaskCreationRequest(message, context.children)

  if (taskParsed.isTaskCreation && taskParsed.taskTitle) {
    // Create the task
    const task = await createTask({
      householdId: context.householdId,
      userId: context.userId,
      childId: taskParsed.childId,
      title: taskParsed.taskTitle,
      dueDate: taskParsed.dueDate,
    })

    if (task) {
      let response = `✅ Tâche créée : "${task.title}"`

      if (taskParsed.childName) {
        response += `\n👤 Pour : ${taskParsed.childName}`
      }

      if (taskParsed.dueDate) {
        const dateStr = taskParsed.dueDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
        response += `\n📅 Échéance : ${dateStr}`

        if (taskParsed.dueTime) {
          response += ` à ${taskParsed.dueTime}`
        }
      }

      response += "\n\nLa tâche a été ajoutée à votre liste !"
      return response
    } else {
      return "❌ Désolé, je n'ai pas pu créer la tâche. Veuillez réessayer ou utiliser le bouton '+' pour l'ajouter manuellement."
    }
  }

  // Pattern matching for common queries
  if (lowerMessage.includes("retard") || lowerMessage.includes("overdue")) {
    const overdueTasks = context.tasks.filter(
      (t) => t.status === "pending" && t.due_date && new Date(t.due_date) < new Date()
    )
    if (overdueTasks.length === 0) {
      return "✅ Bonne nouvelle ! Aucune tâche n'est en retard. Continuez comme ça !"
    }
    return `⚠️ Il y a ${overdueTasks.length} tâche(s) en retard:\n${overdueTasks
      .map((t) => `• ${t.title} (${t.child_name || "Famille"})`)
      .join("\n")}`
  }

  if (lowerMessage.includes("résume") || lowerMessage.includes("semaine") || lowerMessage.includes("stats")) {
    const completionRate = context.stats.totalTasks > 0
      ? Math.round((context.stats.completedTasks / context.stats.totalTasks) * 100)
      : 0

    return `📊 Résumé de votre foyer (30 derniers jours):

• Total des tâches: ${context.stats.totalTasks}
• Complétées: ${context.stats.completedTasks} ✅
• En attente: ${context.stats.pendingTasks} ⏳
• En retard: ${context.stats.overdueTasks} ⚠️

Taux de complétion: ${completionRate}%${completionRate >= 80 ? " 🎉" : completionRate >= 50 ? " 👍" : " 💪"}`
  }

  if (lowerMessage.includes("charge mentale") || lowerMessage.includes("répartition")) {
    return `📈 Pour voir la répartition détaillée de la charge mentale, rendez-vous dans l'onglet "Charge mentale" du menu.

Vous y trouverez:
• La répartition des tâches entre les parents
• L'évolution sur le temps
• Des recommandations pour un meilleur équilibre`
  }

  if (lowerMessage.includes("enfant") || lowerMessage.includes("children") || lowerMessage.includes("mes enfants")) {
    if (context.children.length === 0) {
      return "👶 Vous n'avez pas encore ajouté d'enfants. Allez dans 'Enfants' pour en ajouter un !"
    }
    return `👨‍👩‍👧‍👦 Vos enfants:\n${context.children
      .map((c) => `• ${c.name} (${c.age} ans)`)
      .join("\n")}`
  }

  if (lowerMessage.includes("aide") || lowerMessage.includes("help") || lowerMessage.includes("quoi faire") || lowerMessage.includes("comment")) {
    return `🤖 Je peux vous aider avec:

📝 **Créer des tâches:**
"Johan doit faire ses devoirs demain à 19h"
"Ajoute une tâche ranger la chambre pour Emma"

📊 **Voir les infos:**
"Quelles tâches sont en retard ?"
"Résume ma semaine"
"Qui a le plus de charge mentale ?"
"Liste mes enfants"

Comment puis-je vous aider ?`
  }

  // Default response
  return `🤖 Je suis votre assistant FamilyLoad !

Voici ce que je peux faire:
• **Créer des tâches**: "Johan doit faire ses devoirs demain"
• **Voir les tâches en retard**: "Quelles tâches sont en retard ?"
• **Résumer l'activité**: "Résume ma semaine"
• **Voir la charge mentale**: "Répartition de la charge mentale"

Essayez une de ces commandes ! 💡`
}
