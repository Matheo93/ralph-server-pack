import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/auth/actions"
import { getHousehold } from "@/lib/actions/household"
import { getRecurringTasks } from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function RecurringTasksPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const household = await getHousehold()

  if (!household) {
    redirect("/onboarding")
  }

  const recurringTasks = await getRecurringTasks()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Taches recurrentes</h1>
          <p className="text-muted-foreground">
            {recurringTasks.length} tache{recurringTasks.length > 1 ? "s" : ""} programmee
            {recurringTasks.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks">
            <Button variant="outline">Toutes les taches</Button>
          </Link>
          <Link href="/tasks/new">
            <Button>Nouvelle tache</Button>
          </Link>
        </div>
      </div>

      {recurringTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Vous n&apos;avez pas encore de taches recurrentes.
              </p>
              <Link href="/tasks/new">
                <Button>Creer une tache recurrente</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recurringTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  {task.is_critical && (
                    <Badge variant="destructive" className="text-xs">
                      Critique
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Recurrence info */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <span className="text-sm text-muted-foreground">
                    {getRecurrenceLabel(task.recurrence_rule)}
                  </span>
                </div>

                {/* Child info */}
                {task.child_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👦</span>
                    <span className="text-sm">{task.child_name}</span>
                  </div>
                )}

                {/* Category */}
                {task.category_name && (
                  <Badge variant="secondary" className="text-xs">
                    {task.category_name}
                  </Badge>
                )}

                {/* Stats placeholder */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Poids: {task.load_weight}</span>
                    <span>
                      Priorite:{" "}
                      {task.priority === "critical"
                        ? "Critique"
                        : task.priority === "high"
                          ? "Haute"
                          : task.priority === "normal"
                            ? "Normale"
                            : "Basse"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/tasks/${task.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Modifier
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  byDayOfWeek?: number[]
  byDayOfMonth?: number[]
}

function getRecurrenceLabel(rule: RecurrenceRule | null): string {
  if (!rule) return "Non recurrent"

  const { frequency, interval, byDayOfWeek, byDayOfMonth } = rule
  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

  if (interval === 1) {
    switch (frequency) {
      case "daily":
        return "Tous les jours"
      case "weekly":
        if (byDayOfWeek && byDayOfWeek.length > 0) {
          const days = byDayOfWeek.map((d) => dayNames[d]).join(", ")
          return `Chaque ${days}`
        }
        return "Toutes les semaines"
      case "monthly":
        if (byDayOfMonth && byDayOfMonth.length > 0) {
          return `Le ${byDayOfMonth.join(", ")} de chaque mois`
        }
        return "Tous les mois"
      case "yearly":
        return "Tous les ans"
    }
  }

  switch (frequency) {
    case "daily":
      return `Tous les ${interval} jours`
    case "weekly":
      return `Toutes les ${interval} semaines`
    case "monthly":
      return `Tous les ${interval} mois`
    case "yearly":
      return `Tous les ${interval} ans`
  }
}
