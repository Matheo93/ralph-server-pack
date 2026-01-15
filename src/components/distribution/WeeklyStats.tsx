/**
 * Weekly Stats Component
 *
 * Displays weekly statistics for task distribution.
 */

"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react"
import { WeeklyStats as WeeklyStatsType } from "@/lib/distribution/calculator"

interface WeeklyStatsProps {
  stats: WeeklyStatsType
  previousStats?: WeeklyStatsType
  className?: string
}

export function WeeklyStats({ stats, previousStats, className }: WeeklyStatsProps) {
  const weekLabel = formatWeekLabel(stats.startDate, stats.endDate)

  // Calculate balance score for this week
  const totalWeight = stats.totalWeight
  const parentPercentages = stats.parents.map((p) => ({
    ...p,
    percentage: totalWeight > 0 ? Math.round((p.completedWeight / totalWeight) * 100) : 0,
  }))

  // Calculate simple balance score
  const balanceScore = calculateSimpleBalance(parentPercentages.map((p) => p.percentage))

  return (
    <Card className={cn("", className)} data-testid="weekly-stats">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Statistiques hebdomadaires
          </CardTitle>
          <Badge variant="outline">{weekLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatBox
            label="Total"
            value={stats.totalCount}
            suffix="tâches"
          />
          <StatBox
            label="Points"
            value={stats.totalWeight}
            suffix="points"
            highlight
          />
          <StatBox
            label="Score"
            value={`${balanceScore}%`}
            suffix="équilibre"
          />
        </div>

        {/* Parent breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Répartition par parent</h4>
          {parentPercentages.map((parent) => (
            <ParentStatRow
              key={parent.userId}
              name={parent.userName}
              taskCount={parent.completedCount}
              totalWeight={parent.completedWeight}
              percentage={parent.percentage}
              trend={getTrend(parent, previousStats)}
            />
          ))}
        </div>

        {/* Comparison with previous week */}
        {previousStats && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Comparaison semaine précédente</h4>
            <ComparisonBlock currentStats={stats} previousStats={previousStats} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper components
interface StatBoxProps {
  label: string
  value: number | string
  suffix?: string
  highlight?: boolean
}

function StatBox({ label, value, suffix, highlight }: StatBoxProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg text-center",
        highlight ? "bg-primary/10" : "bg-muted"
      )}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {suffix && (
        <p className="text-xs text-muted-foreground">{suffix}</p>
      )}
    </div>
  )
}

interface ParentStatRowProps {
  name: string
  taskCount: number
  totalWeight: number
  percentage: number
  trend?: "up" | "down" | "stable"
}

function ParentStatRow({
  name,
  taskCount,
  totalWeight,
  percentage,
  trend,
}: ParentStatRowProps) {
  return (
    <div className="space-y-2 p-3 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {trend && <TrendIcon trend={trend} />}
        </div>
        <Badge variant="secondary">{percentage}%</Badge>
      </div>

      {/* Progress bar */}
      <Progress value={percentage} className="h-2" />

      {/* Stats row */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {taskCount} tâches
        </span>
        <span>{totalWeight} points</span>
      </div>
    </div>
  )
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-red-500" />
    case "down":
      return <TrendingDown className="h-4 w-4 text-green-500" />
    case "stable":
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

interface ComparisonBlockProps {
  currentStats: WeeklyStatsType
  previousStats: WeeklyStatsType
}

function ComparisonBlock({ currentStats, previousStats }: ComparisonBlockProps) {
  const taskDiff = currentStats.totalCount - previousStats.totalCount
  const weightDiff = currentStats.totalWeight - previousStats.totalWeight

  return (
    <div className="grid grid-cols-2 gap-3 text-center">
      <ComparisonItem
        label="Tâches"
        diff={taskDiff}
        suffix=""
        positiveIsGood={true}
      />
      <ComparisonItem
        label="Points"
        diff={weightDiff}
        suffix=""
        positiveIsGood={true}
      />
    </div>
  )
}

interface ComparisonItemProps {
  label: string
  diff: number
  suffix: string
  positiveIsGood: boolean
}

function ComparisonItem({ label, diff, suffix, positiveIsGood }: ComparisonItemProps) {
  const isPositive = diff > 0
  const isGood = positiveIsGood ? isPositive : !isPositive
  const displayValue = diff > 0 ? `+${diff}` : `${diff}`

  return (
    <div className="p-2 rounded bg-muted/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          "font-bold",
          diff === 0 && "text-muted-foreground",
          diff !== 0 && isGood && "text-green-600",
          diff !== 0 && !isGood && "text-red-600"
        )}
      >
        {displayValue}{suffix}
      </p>
    </div>
  )
}

// Helpers
function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
}

function calculateSimpleBalance(percentages: number[]): number {
  if (percentages.length === 0) return 100
  if (percentages.length === 1) return 100

  const ideal = 100 / percentages.length
  const deviations = percentages.map((p) => Math.abs(p - ideal))
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length

  return Math.max(0, Math.round(100 - avgDeviation * 2))
}

function getTrend(
  parent: { userId: string; completedWeight: number },
  previousStats?: WeeklyStatsType
): "up" | "down" | "stable" | undefined {
  if (!previousStats) return undefined

  const previousParent = previousStats.parents.find((p) => p.userId === parent.userId)
  if (!previousParent) return undefined

  const diff = parent.completedWeight - previousParent.completedWeight
  const threshold = Math.max(previousParent.completedWeight * 0.1, 1)

  if (diff > threshold) return "up"
  if (diff < -threshold) return "down"
  return "stable"
}

// Compact weekly summary
interface WeeklySummaryProps {
  stats: WeeklyStatsType
  className?: string
}

export function WeeklySummary({ stats, className }: WeeklySummaryProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg",
        className
      )}
      data-testid="weekly-summary"
    >
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{stats.week}</p>
          <p className="text-xs text-muted-foreground">
            {stats.totalCount} tâches • {stats.totalWeight} points
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold">{stats.parents.length}</p>
        <p className="text-xs text-muted-foreground">parents</p>
      </div>
    </div>
  )
}
