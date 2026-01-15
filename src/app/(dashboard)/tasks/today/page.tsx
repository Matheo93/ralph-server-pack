import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getTodayTasks, getOverdueTasks } from "@/lib/actions/tasks"
import { TaskList } from "@/components/custom/TaskList"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function TodayTasksPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const [todayTasks, overdueTasks] = await Promise.all([
    getTodayTasks(),
    getOverdueTasks(),
  ])

  const pendingCount = todayTasks.filter((t) => t.status === "pending").length
  const criticalCount = todayTasks.filter((t) => t.is_critical).length

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Aujourd&apos;hui</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks">
            <Button variant="outline" size="sm" className="sm:h-10 sm:px-4 sm:py-2">
              Toutes les tâches
            </Button>
          </Link>
          <Link href="/tasks/new">
            <Button size="sm" className="sm:h-10 sm:px-4 sm:py-2">
              Nouvelle tâche
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              À faire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overdueTasks.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {overdueTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-red-600">
            En retard ({overdueTasks.length})
          </h2>
          <TaskList tasks={overdueTasks} emptyMessage="Aucune tâche en retard" />
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">
          Tâches du jour ({todayTasks.length})
        </h2>
        <TaskList
          tasks={todayTasks}
          emptyMessage="Aucune tâche pour aujourd'hui. Bravo !"
        />
      </div>
    </div>
  )
}
