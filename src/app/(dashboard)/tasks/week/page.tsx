import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getTasksForWeek } from "@/lib/actions/week"
import { WeekView } from "@/components/custom/WeekView"
import { Button } from "@/components/ui/button"

interface WeekPageProps {
  searchParams: Promise<{ start?: string }>
}

export default async function WeekTasksPage({ searchParams }: WeekPageProps) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const params = await searchParams
  const { tasks, weekStart, weekEnd } = await getTasksForWeek(params.start)

  const totalCount = tasks.length
  const pendingCount = tasks.filter((t) => t.status === "pending" || t.status === "postponed").length
  const criticalCount = tasks.filter((t) => t.is_critical && t.status !== "done").length

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vue Semaine</h1>
          <p className="text-muted-foreground">
            {pendingCount} tâches à faire cette semaine
            {criticalCount > 0 && (
              <span className="text-red-600"> dont {criticalCount} critiques</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks/today">
            <Button variant="outline">Aujourd&apos;hui</Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline">Liste</Button>
          </Link>
          <Link href="/tasks/new">
            <Button>Nouvelle tâche</Button>
          </Link>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Glissez-déposez les tâches pour les reporter à un autre jour
      </div>

      <WeekView tasks={tasks} weekStart={weekStart} weekEnd={weekEnd} />
    </div>
  )
}
