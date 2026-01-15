"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Award,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils/index"

// =============================================================================
// TYPES
// =============================================================================

interface StreakData {
  current: number
  best: number
  lastCompleted: Date | null
  isAtRisk: boolean
  daysUntilRisk: number
}

interface BalanceData {
  userId: string
  userName: string
  score: number
  tasksCompleted: number
  trend: "up" | "down" | "stable"
}

interface QuickStats {
  todayPending: number
  todayCompleted: number
  weekPending: number
  weekCompleted: number
  overdue: number
  criticalCount: number
}

interface DashboardWidgetsProps {
  streak?: StreakData
  balance?: BalanceData[]
  stats?: QuickStats
  currentUserId?: string
  className?: string
}

// =============================================================================
// STREAK WIDGET
// =============================================================================

interface StreakWidgetProps {
  streak: StreakData
  className?: string
}

export function StreakWidget({ streak, className }: StreakWidgetProps) {
  const streakColor = useMemo(() => {
    if (streak.isAtRisk) return "text-orange-500"
    if (streak.current >= 30) return "text-purple-500"
    if (streak.current >= 14) return "text-blue-500"
    if (streak.current >= 7) return "text-green-500"
    return "text-muted-foreground"
  }, [streak])

  const progressToNextMilestone = useMemo(() => {
    const milestones = [7, 14, 30, 60, 100]
    const nextMilestone = milestones.find((m) => m > streak.current) ?? 100
    const prevMilestone = milestones
      .filter((m) => m <= streak.current)
      .pop() ?? 0
    const range = nextMilestone - prevMilestone
    const progress = ((streak.current - prevMilestone) / range) * 100
    return { progress, nextMilestone }
  }, [streak.current])

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Flame className={cn("w-4 h-4", streakColor)} />
            Streak
          </span>
          {streak.isAtRisk && (
            <Badge variant="destructive" className="text-xs">
              En danger
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-4xl font-bold", streakColor)}>
              {streak.current}
            </span>
            <span className="text-muted-foreground">jours</span>
          </div>

          {streak.isAtRisk && (
            <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {streak.daysUntilRisk === 0
                ? "Complète une tâche aujourd'hui!"
                : `Plus que ${streak.daysUntilRisk} jour(s)`}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Prochain objectif: {progressToNextMilestone.nextMilestone}j</span>
              <span>{Math.round(progressToNextMilestone.progress)}%</span>
            </div>
            <Progress value={progressToNextMilestone.progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              Record: {streak.best}j
            </span>
            {streak.lastCompleted && (
              <span>
                Dernière: {formatDate(streak.lastCompleted)}
              </span>
            )}
          </div>
        </div>
      </CardContent>

      {/* Decorative flame background */}
      {streak.current >= 7 && (
        <div className="absolute -bottom-4 -right-4 opacity-5">
          <Flame className="w-24 h-24" />
        </div>
      )}
    </Card>
  )
}

// =============================================================================
// BALANCE WIDGET
// =============================================================================

interface BalanceWidgetProps {
  balance: BalanceData[]
  currentUserId?: string
  className?: string
}

export function BalanceWidget({ balance, currentUserId, className }: BalanceWidgetProps) {
  const sortedBalance = useMemo(() => {
    return [...balance].sort((a, b) => b.score - a.score)
  }, [balance])

  const maxScore = useMemo(() => {
    return Math.max(...balance.map((b) => b.score), 1)
  }, [balance])

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-green-500" />
      case "down":
        return <TrendingDown className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Équilibre familial
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedBalance.map((member, index) => {
            const percentage = (member.score / maxScore) * 100
            const isCurrentUser = member.userId === currentUserId

            return (
              <div key={member.userId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={cn(isCurrentUser && "font-medium")}>
                    {member.userName}
                    {isCurrentUser && " (vous)"}
                  </span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(member.trend)}
                    <span className="text-muted-foreground">
                      {member.tasksCompleted} tâches
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={percentage}
                    className={cn(
                      "h-2 flex-1",
                      index === 0 && "bg-primary/20"
                    )}
                  />
                  <span className="text-xs font-medium w-12 text-right">
                    {member.score} pts
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// QUICK STATS WIDGET
// =============================================================================

interface QuickStatsWidgetProps {
  stats: QuickStats
  className?: string
}

export function QuickStatsWidget({ stats, className }: QuickStatsWidgetProps) {
  const todayProgress = useMemo(() => {
    const total = stats.todayPending + stats.todayCompleted
    return total > 0 ? (stats.todayCompleted / total) * 100 : 0
  }, [stats])

  const weekProgress = useMemo(() => {
    const total = stats.weekPending + stats.weekCompleted
    return total > 0 ? (stats.weekCompleted / total) * 100 : 0
  }, [stats])

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          Progression
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Today stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Aujourd&apos;hui
              </span>
              <span className="text-muted-foreground">
                {stats.todayCompleted}/{stats.todayPending + stats.todayCompleted}
              </span>
            </div>
            <Progress value={todayProgress} className="h-2" />
          </div>

          {/* Week stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-500" />
                Cette semaine
              </span>
              <span className="text-muted-foreground">
                {stats.weekCompleted}/{stats.weekPending + stats.weekCompleted}
              </span>
            </div>
            <Progress value={weekProgress} className="h-2" />
          </div>

          {/* Alerts row */}
          <div className="flex gap-2 pt-2 border-t">
            {stats.overdue > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stats.overdue} en retard
              </Badge>
            )}
            {stats.criticalCount > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 border-red-300 text-red-600">
                <Zap className="w-3 h-3" />
                {stats.criticalCount} urgent
              </Badge>
            )}
            {stats.overdue === 0 && stats.criticalCount === 0 && (
              <Badge variant="outline" className="flex items-center gap-1 border-green-300 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Tout va bien
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// COMBINED DASHBOARD WIDGETS
// =============================================================================

export function DashboardWidgets({
  streak,
  balance,
  stats,
  currentUserId,
  className,
}: DashboardWidgetsProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {streak && <StreakWidget streak={streak} />}
      {balance && balance.length > 0 && (
        <BalanceWidget balance={balance} currentUserId={currentUserId} />
      )}
      {stats && <QuickStatsWidget stats={stats} />}
    </div>
  )
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return "aujourd'hui"
  if (days === 1) return "hier"
  if (days < 7) return `il y a ${days}j`

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { StreakData, BalanceData, QuickStats }
