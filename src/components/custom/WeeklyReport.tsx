"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import type { WeeklyReportData } from "@/lib/services/balance-alerts"

// =============================================================================
// CATEGORY LABELS
// =============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  administratif: "Administratif",
  sante: "Santé",
  ecole: "École",
  quotidien: "Quotidien",
  social: "Social",
  activites: "Activités",
  logistique: "Logistique",
}

const CATEGORY_ICONS: Record<string, string> = {
  administratif: "📋",
  sante: "🏥",
  ecole: "🎒",
  quotidien: "🏠",
  social: "👥",
  activites: "⚽",
  logistique: "🚗",
}

// =============================================================================
// WEEKLY REPORT CARD
// =============================================================================

interface WeeklyReportCardProps {
  report: WeeklyReportData
  className?: string
}

/**
 * Full weekly report card showing comprehensive household stats
 */
export function WeeklyReportCard({ report, className }: WeeklyReportCardProps) {
  const {
    weekStart,
    weekEnd,
    totalTasks,
    completedTasks,
    totalLoadPoints,
    members,
    isBalanced,
    alertLevel,
    comparisonToLastWeek,
    topCategories,
  } = report

  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  // Format date range
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>📊</span>
            Rapport hebdomadaire
          </CardTitle>
          <Badge variant="outline">
            {formatDate(weekStart)} - {formatDate(weekEnd)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Tâches"
            value={`${completedTasks}/${totalTasks}`}
            subtext={`${completionRate}% complétées`}
            trend={comparisonToLastWeek.loadPointsDiff > 0 ? "up" : "down"}
          />
          <StatCard
            label="Points de charge"
            value={totalLoadPoints.toString()}
            subtext={
              comparisonToLastWeek.loadPointsDiff >= 0
                ? `+${comparisonToLastWeek.loadPointsDiff} vs sem. dernière`
                : `${comparisonToLastWeek.loadPointsDiff} vs sem. dernière`
            }
            trend={comparisonToLastWeek.loadPointsDiff > 0 ? "up" : "down"}
          />
          <StatCard
            label="Équilibre"
            value={isBalanced ? "✅" : alertLevel === "critical" ? "🚨" : "⚠️"}
            subtext={
              isBalanced
                ? "Bien équilibré"
                : alertLevel === "critical"
                  ? "Déséquilibré"
                  : "Attention"
            }
            trend={comparisonToLastWeek.balanceImproved ? "up" : "down"}
          />
        </div>

        {/* Member breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Répartition par parent</h4>
          {members.map((member) => (
            <div key={member.userId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{member.userName}</span>
                <span className="text-muted-foreground">
                  {member.tasksCompleted} tâches · {member.loadPoints} pts ({member.percentage}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    member.percentage > 60 && "bg-red-500",
                    member.percentage > 55 && member.percentage <= 60 && "bg-orange-500",
                    member.percentage <= 55 && "bg-primary"
                  )}
                  style={{ width: `${Math.min(member.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top categories */}
        {topCategories.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Catégories les plus actives</h4>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((cat) => (
                <Badge
                  key={cat.category}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <span>{CATEGORY_ICONS[cat.category] ?? "📌"}</span>
                  <span>{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                  <span className="text-muted-foreground">({cat.loadPoints} pts)</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Balance insight */}
        {!isBalanced && (
          <div
            className={cn(
              "p-3 rounded-lg",
              alertLevel === "critical"
                ? "bg-red-50 dark:bg-red-950/30"
                : "bg-orange-50 dark:bg-orange-950/30"
            )}
          >
            <p
              className={cn(
                "text-sm",
                alertLevel === "critical"
                  ? "text-red-700 dark:text-red-300"
                  : "text-orange-700 dark:text-orange-300"
              )}
            >
              {alertLevel === "critical"
                ? "La charge mentale est très déséquilibrée cette semaine. Pensez à redistribuer les tâches."
                : "La charge commence à être déséquilibrée. Surveillez la répartition."}
            </p>
            {comparisonToLastWeek.balanceImproved && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ L'équilibre s'améliore par rapport à la semaine dernière
              </p>
            )}
          </div>
        )}

        {isBalanced && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
            <p className="text-sm text-green-700 dark:text-green-300">
              Excellente répartition cette semaine ! Continuez ainsi.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// COMPACT WEEKLY SUMMARY
// =============================================================================

interface WeeklySummaryCompactProps {
  report: WeeklyReportData
  onViewFull?: () => void
  className?: string
}

/**
 * Compact weekly summary for dashboard display
 */
export function WeeklySummaryCompact({
  report,
  onViewFull,
  className,
}: WeeklySummaryCompactProps) {
  const { totalTasks, completedTasks, totalLoadPoints, isBalanced, alertLevel } = report

  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={onViewFull}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-medium text-sm">Résumé semaine</p>
            <p className="text-xs text-muted-foreground">
              {completedTasks}/{totalTasks} tâches ({completionRate}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{totalLoadPoints} pts</Badge>
          <span>
            {isBalanced
              ? "✅"
              : alertLevel === "critical"
                ? "🚨"
                : "⚠️"}
          </span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// STAT CARD HELPER
// =============================================================================

interface StatCardProps {
  label: string
  value: string
  subtext: string
  trend?: "up" | "down" | "neutral"
}

function StatCard({ label, value, subtext, trend }: StatCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p
        className={cn(
          "text-xs",
          trend === "up" && "text-green-600",
          trend === "down" && "text-red-600",
          trend === "neutral" && "text-muted-foreground"
        )}
      >
        {subtext}
      </p>
    </div>
  )
}

// =============================================================================
// EMAIL PREVIEW
// =============================================================================

interface WeeklyReportEmailPreviewProps {
  report: WeeklyReportData
  householdName: string
  className?: string
}

/**
 * Preview of how the weekly report email will look
 */
export function WeeklyReportEmailPreview({
  report,
  householdName,
  className,
}: WeeklyReportEmailPreviewProps) {
  const { weekStart, weekEnd, totalTasks, completedTasks, members, isBalanced, topCategories } =
    report

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  return (
    <div className={cn("p-6 bg-white rounded-lg border shadow-sm", className)}>
      {/* Header */}
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Rapport hebdomadaire - {householdName}
        </h2>
        <p className="text-sm text-gray-600">
          Semaine du {formatDate(weekStart)} au {formatDate(weekEnd)}
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Résumé</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Tâches complétées :</span>{" "}
            <strong>
              {completedTasks}/{totalTasks}
            </strong>{" "}
            ({completionRate}%)
          </div>
          <div>
            <span className="text-gray-600">Équilibre :</span>{" "}
            <strong className={isBalanced ? "text-green-600" : "text-red-600"}>
              {isBalanced ? "Bien équilibré" : "Déséquilibré"}
            </strong>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Répartition</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="pb-2">Parent</th>
              <th className="pb-2 text-right">Tâches</th>
              <th className="pb-2 text-right">Points</th>
              <th className="pb-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <td className="py-1">{member.userName}</td>
                <td className="py-1 text-right">{member.tasksCompleted}</td>
                <td className="py-1 text-right">{member.loadPoints}</td>
                <td
                  className={cn(
                    "py-1 text-right font-medium",
                    member.percentage > 60 && "text-red-600",
                    member.percentage > 55 && member.percentage <= 60 && "text-orange-600"
                  )}
                >
                  {member.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Categories */}
      {topCategories.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Catégories principales</h3>
          <p className="text-sm text-gray-600">
            {topCategories
              .map((c) => `${CATEGORY_LABELS[c.category] ?? c.category} (${c.loadPoints} pts)`)
              .join(" · ")}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
        <p>Ce rapport est généré automatiquement par FamilyLoad</p>
      </div>
    </div>
  )
}
