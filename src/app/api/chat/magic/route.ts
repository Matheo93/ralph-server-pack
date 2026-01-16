import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { canUseMagicChat } from "@/lib/services/subscription"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"

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
  const result = await query<{ id: string; name: string; birth_date: string }>(`
    SELECT id, name, birth_date
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  return result.map((c) => ({
    id: c.id,
    name: c.name,
    age: Math.floor((Date.now() - new Date(c.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
  }))
}

async function getRecentTasks(householdId: string): Promise<Task[]> {
  const result = await query<Task>(`
    SELECT
      t.id,
      t.title,
      t.status,
      c.name as child_name,
      t.due_date,
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
      COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) as overdue
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

async function generateResponse(
  message: string,
  context: {
    children: Child[]
    tasks: Task[]
    stats: HouseholdStats
  }
): Promise<string> {
  const lowerMessage = message.toLowerCase()

  // Pattern matching for common queries
  if (lowerMessage.includes("retard") || lowerMessage.includes("overdue")) {
    const overdueTasks = context.tasks.filter(
      (t) => t.status === "pending" && t.due_date && new Date(t.due_date) < new Date()
    )
    if (overdueTasks.length === 0) {
      return "Bonne nouvelle ! Aucune tâche n'est en retard. Continuez comme ça !"
    }
    return `Il y a ${overdueTasks.length} tâche(s) en retard:\n${overdueTasks
      .map((t) => `- ${t.title} (${t.child_name || "Famille"})`)
      .join("\n")}`
  }

  if (lowerMessage.includes("résume") || lowerMessage.includes("semaine") || lowerMessage.includes("stats")) {
    return `Résumé de votre foyer (30 derniers jours):
- Total des tâches: ${context.stats.totalTasks}
- Complétées: ${context.stats.completedTasks}
- En attente: ${context.stats.pendingTasks}
- En retard: ${context.stats.overdueTasks}

Taux de complétion: ${context.stats.totalTasks > 0 ? Math.round((context.stats.completedTasks / context.stats.totalTasks) * 100) : 0}%`
  }

  if (lowerMessage.includes("charge mentale") || lowerMessage.includes("répartition")) {
    return `Pour voir la répartition détaillée de la charge mentale, rendez-vous dans l'onglet "Charge mentale" du menu.

Vous y trouverez:
- La répartition des tâches entre les parents
- L'évolution sur le temps
- Des recommandations pour un meilleur équilibre`
  }

  if (lowerMessage.includes("ajoute") || lowerMessage.includes("créer") || lowerMessage.includes("nouvelle tâche")) {
    // Extract child name if mentioned
    const childMatch = context.children.find((c) =>
      lowerMessage.includes(c.name.toLowerCase())
    )

    if (childMatch) {
      return `Pour ajouter une tâche pour ${childMatch.name}, utilisez le bouton "+" en bas à droite ou la commande vocale.

Vous pouvez aussi aller directement sur la page Tâches et cliquer sur "Nouvelle tâche".`
    }

    return `Pour créer une nouvelle tâche:
1. Cliquez sur le bouton "+" en bas à droite
2. Ou utilisez la commande vocale
3. Ou allez dans Tâches > Nouvelle tâche

Vos enfants: ${context.children.map((c) => c.name).join(", ") || "Aucun enfant ajouté"}`
  }

  if (lowerMessage.includes("enfant") || lowerMessage.includes("children")) {
    if (context.children.length === 0) {
      return "Vous n'avez pas encore ajouté d'enfants. Allez dans 'Enfants' pour en ajouter un !"
    }
    return `Vos enfants:\n${context.children
      .map((c) => `- ${c.name} (${c.age} ans)`)
      .join("\n")}`
  }

  if (lowerMessage.includes("aide") || lowerMessage.includes("help") || lowerMessage.includes("quoi faire")) {
    return `Je peux vous aider avec:
- "Quelles tâches sont en retard ?" - Voir les tâches urgentes
- "Résume ma semaine" - Statistiques de votre foyer
- "Qui a le plus de charge mentale ?" - Répartition des tâches
- "Ajoute une tâche pour [enfant]" - Créer une nouvelle tâche

Comment puis-je vous aider ?`
  }

  // Default response
  return `Je comprends votre demande "${message}".

Je suis votre assistant FamilyLoad ! Je peux vous aider à:
- Voir les tâches en retard
- Résumer l'activité de votre foyer
- Analyser la charge mentale
- Guider pour créer des tâches

Que souhaitez-vous faire ?`
}
