import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { ChildTimeline, type TimelineEvent } from "@/components/custom/ChildTimeline"
import { ChildMilestones } from "@/components/custom/ChildMilestones"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Clock, Sparkles } from "lucide-react"
import {
  getMilestonesForChild,
  getCelebrationMilestones,
} from "@/lib/data/child-milestones"
import {
  getVaccinationsDue,
  getVaccinationDueDate,
} from "@/lib/data/vaccination-calendar"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ChildTimelinePage({ params }: PageProps) {
  const { id } = await params

  const userId = await getUserId()
  if (!userId) {
    redirect("/login")
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
    LIMIT 1
  `, [userId])

  if (!membership) {
    redirect("/onboarding")
  }

  // Get child details and verify ownership
  const child = await queryOne<{
    id: string
    first_name: string
    birthdate: string
    household_id: string
  }>(`
    SELECT id, first_name, birthdate, household_id
    FROM children
    WHERE id = $1 AND is_active = true
  `, [id])

  if (!child || child.household_id !== membership.household_id) {
    notFound()
  }

  // Get tasks for this child
  const tasks = await query<{
    id: string
    title: string
    status: string
    deadline: string | null
    completed_at: string | null
    category_name: string | null
    category_color: string | null
    assigned_name: string | null
    load_weight: number
    created_at: string
    priority: string | null
    recurrence_rule: Record<string, unknown> | null
  }>(`
    SELECT
      t.id,
      t.title,
      t.status,
      t.deadline,
      t.completed_at,
      tc.name_fr as category_name,
      tc.color as category_color,
      u.email as assigned_name,
      t.load_weight,
      t.created_at,
      t.priority,
      t.recurrence_rule
    FROM tasks t
    LEFT JOIN task_categories tc ON tc.id = t.category_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.child_id = $1 AND t.household_id = $2
    ORDER BY COALESCE(t.completed_at, t.deadline, t.created_at) DESC
    LIMIT 200
  `, [child.id, membership.household_id])

  // Transform tasks for timeline
  const timelineTasks = tasks.map((task) => {
    const date = task.completed_at
      ? new Date(task.completed_at)
      : task.deadline
        ? new Date(task.deadline)
        : new Date(task.created_at)

    let status: "done" | "pending" | "upcoming"
    if (task.status === "done") {
      status = "done"
    } else if (task.deadline && new Date(task.deadline) > new Date()) {
      status = "upcoming"
    } else {
      status = "pending"
    }

    return {
      id: task.id,
      title: task.title,
      status,
      date,
      categoryName: task.category_name ?? undefined,
      categoryColor: task.category_color ?? undefined,
      assignedTo: task.assigned_name?.split("@")[0],
      loadWeight: task.load_weight,
      isHighPriority: task.priority === "high" || task.priority === "critical",
      isRecurring: task.recurrence_rule !== null,
    }
  })

  // Generate timeline events from milestones, vaccinations, and celebrations
  const birthdate = new Date(child.birthdate)
  const milestones = getMilestonesForChild(birthdate, 12, 3)
  const vaccinations = getVaccinationsDue(birthdate)
  const celebrations = getCelebrationMilestones(birthdate, 12)

  const timelineEvents: TimelineEvent[] = [
    // Add milestones
    ...milestones
      .filter((m) => m.status === "current" || m.status === "upcoming")
      .map((m) => ({
        id: `milestone-${m.id}`,
        type: "milestone" as const,
        title: m.title,
        description: m.description,
        date: m.dueDate,
      })),
    // Add due/upcoming vaccinations
    ...vaccinations
      .filter((v) => v.status === "due" || v.status === "upcoming")
      .map((v) => ({
        id: `vaccine-${v.id}`,
        type: "vaccination" as const,
        title: v.nameShort,
        description: v.ageDescription,
        date: getVaccinationDueDate(birthdate, v),
      })),
    // Add celebrations
    ...celebrations.map((c) => ({
      id: `celebration-${c.id}`,
      type: c.celebrationType === "school" ? ("school" as const) : ("celebration" as const),
      title: c.title,
      description: c.description,
      date: c.dueDate,
    })),
  ]

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/children">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Timeline de {child.first_name}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Historique des tâches, jalons de développement et événements à venir
        </p>
      </div>

      {/* Main content with tabs */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Jalons & Santé
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <ChildTimeline
            childId={child.id}
            childName={child.first_name}
            tasks={timelineTasks}
            events={timelineEvents}
          />
        </TabsContent>

        <TabsContent value="milestones">
          <ChildMilestones
            childId={child.id}
            childName={child.first_name}
            birthdate={child.birthdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
