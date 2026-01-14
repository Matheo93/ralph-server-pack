import Link from "next/link"
import { getChildren } from "@/lib/actions/children"
import { getHousehold } from "@/lib/actions/household"
import { getTodayTasks, getWeekTasks, getOverdueTasks } from "@/lib/actions/tasks"
import { getHouseholdBalance, getWeeklyChartData, getChargeHistory } from "@/lib/services/charge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardToday } from "@/components/custom/DashboardToday"
import { DashboardWeek } from "@/components/custom/DashboardWeek"
import { StreakCounter } from "@/components/custom/StreakCounter"
import { ChargeBalance } from "@/components/custom/ChargeBalance"
import { ChargeWeekChart } from "@/components/custom/ChargeWeekChart"
import { ChargeHistoryCard } from "@/components/custom/ChargeHistoryCard"
import { VocalRecorder } from "@/components/custom/VocalRecorder"
import { QuickActions } from "@/components/custom/QuickActions"

export default async function DashboardPage() {
  const [children, membership, todayTasks, weekTasks, overdueTasks, balance, weekChartData, chargeHistory] =
    await Promise.all([
      getChildren(),
      getHousehold(),
      getTodayTasks(),
      getWeekTasks(),
      getOverdueTasks(),
      getHouseholdBalance(),
      getWeeklyChartData(),
      getChargeHistory(),
    ])

  const household = membership?.households as {
    name: string
    streak_current: number
    streak_best: number
    subscription_status: string
  } | null

  const pendingTodayCount = todayTasks.filter((t) => t.status === "pending").length
  const criticalCount = todayTasks.filter((t) => t.is_critical).length

  return (
    <div className="container mx-auto px-4 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bonjour !</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aujourd&apos;hui</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{pendingTodayCount}</span>
              <span className="text-muted-foreground">à faire</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En retard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-600">
                {overdueTasks.length}
              </span>
              {overdueTasks.length > 0 && (
                <Badge variant="destructive">Urgent</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critiques</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-orange-600">
                {criticalCount}
              </span>
              <span className="text-muted-foreground">
                casse{criticalCount > 1 ? "nt" : ""} le streak
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enfants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{children.length}</span>
              {children.length === 0 && (
                <Link href="/children/new">
                  <Button variant="outline" size="sm">
                    Ajouter
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tâches en retard */}
      {overdueTasks.length > 0 && (
        <Card className="mb-8 border-red-300 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <span>En retard</span>
              <Badge variant="destructive">{overdueTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-white/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.child_name && (
                      <p className="text-sm text-muted-foreground">
                        {task.child_name}
                      </p>
                    )}
                  </div>
                  <Badge variant="destructive">
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Pas de date"}
                  </Badge>
                </div>
              ))}
              {overdueTasks.length > 3 && (
                <Link href="/tasks?status=pending">
                  <Button variant="ghost" className="w-full">
                    Voir {overdueTasks.length - 3} autres...
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charge mentale section - Full width, prominent */}
      {balance && balance.members.length >= 2 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Charge mentale</h2>
            <Link href="/charge">
              <Button variant="ghost" size="sm">
                Voir les d\u00e9tails
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ChargeBalance balance={balance} />
            {weekChartData.length > 0 && (
              <ChargeWeekChart data={weekChartData} className="lg:col-span-2" />
            )}
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale - T\u00e2ches du jour */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardToday tasks={todayTasks} />

          <DashboardWeek tasks={weekTasks} />
        </div>

        {/* Colonne lat\u00e9rale - Streak et Historique */}
        <div className="space-y-6">
          <StreakCounter
            current={household?.streak_current ?? 0}
            best={household?.streak_best ?? 0}
          />

          {chargeHistory.length >= 2 && (
            <ChargeHistoryCard history={chargeHistory} />
          )}

          {/* Charge balance for single parent households */}
          {balance && balance.members.length < 2 && (
            <ChargeBalance balance={balance} />
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/tasks/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  + Nouvelle t\u00e2che
                </Button>
              </Link>
              <Link href="/children" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  G\u00e9rer les enfants
                </Button>
              </Link>
              <Link href="/tasks" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Toutes les t\u00e2ches
                </Button>
              </Link>
              <Link href="/charge" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Analyse charge mentale
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bouton vocal (invisible, triggered by QuickActions) */}
      <div className="hidden">
        <VocalRecorder />
      </div>

      {/* Boutons d'actions rapides flottants */}
      <QuickActions />
    </div>
  )
}
