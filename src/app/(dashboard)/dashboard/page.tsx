import Link from "next/link"
import { getChildren } from "@/lib/actions/children"
import { getHousehold } from "@/lib/actions/household"
import { getTodayTasks, getWeekTasks, getOverdueTasks, getUnscheduledTasks, getAllPendingTasksCount } from "@/lib/actions/tasks"
import { getHouseholdBalance, getWeeklyChartData, getChargeHistory } from "@/lib/services/charge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardToday } from "@/components/custom/DashboardToday"
import { DashboardWeek } from "@/components/custom/DashboardWeek"
import { DashboardUnscheduled } from "@/components/custom/DashboardUnscheduled"
import { StreakCounter } from "@/components/custom/StreakCounter"
import { ChargeBalance } from "@/components/custom/ChargeBalance"
import { ChargeWeekChart } from "@/components/custom/ChargeWeekChart"
import { ChargeHistoryCard } from "@/components/custom/ChargeHistoryCard"
import { InviteCoParentCTA } from "@/components/custom/InviteCoParentCTA"

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const [children, membership, todayTasks, weekTasks, overdueTasks, unscheduledTasks, taskCounts, balance, weekChartData, chargeHistory] =
    await Promise.all([
      getChildren(),
      getHousehold(),
      getTodayTasks(),
      getWeekTasks(),
      getOverdueTasks(),
      getUnscheduledTasks(),
      getAllPendingTasksCount(),
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

  const criticalCount = todayTasks.filter((t) => t.is_critical).length
  const hasAnyPendingTasks = taskCounts.total > 0

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
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <CardDescription className="text-foreground/70 font-medium">Total actif</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{taskCounts.total}</span>
              <span className="text-muted-foreground">tâche{taskCounts.total > 1 ? "s" : ""}</span>
            </div>
            {taskCounts.unscheduled > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                dont {taskCounts.unscheduled} sans date
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${overdueTasks.length > 0 ? 'border-l-red-500 bg-gradient-to-br from-red-50 to-transparent' : 'border-l-green-500 bg-gradient-to-br from-green-50 to-transparent'} hover:shadow-md transition-shadow`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${overdueTasks.length > 0 ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${overdueTasks.length > 0 ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardDescription className="text-foreground/70 font-medium">En retard</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {overdueTasks.length}
              </span>
              {overdueTasks.length > 0 ? (
                <Badge variant="destructive" className="animate-pulse">Urgent</Badge>
              ) : (
                <span className="text-green-600 text-sm font-medium">Parfait !</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <CardDescription className="text-foreground/70 font-medium">Critiques</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-600">
                {criticalCount}
              </span>
              <span className="text-muted-foreground text-sm">
                casse{criticalCount > 1 ? "nt" : ""} le streak
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-transparent hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <CardDescription className="text-foreground/70 font-medium">Enfants</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">{children.length}</span>
              {children.length === 0 && (
                <Link href="/children/new">
                  <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    + Ajouter
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Invite co-parent - Only shown if single parent */}
      {balance && balance.members.length < 2 && (
        <InviteCoParentCTA className="mb-8" />
      )}

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
                Voir les détails
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
        {/* Colonne principale - Tâches du jour */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardToday tasks={todayTasks} hasAnyPendingTasks={hasAnyPendingTasks} hasChildren={children.length > 0} />

          {unscheduledTasks.length > 0 && (
            <DashboardUnscheduled tasks={unscheduledTasks} />
          )}

          <DashboardWeek tasks={weekTasks} />
        </div>

        {/* Colonne latérale - Streak et Historique */}
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
        </div>
      </div>

    </div>
  )
}
