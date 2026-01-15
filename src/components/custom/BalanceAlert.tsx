"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import type { BalanceAlertStatus, RebalanceSuggestion } from "@/lib/services/balance-alerts"

// =============================================================================
// BALANCE ALERT BANNER
// =============================================================================

interface BalanceAlertBannerProps {
  status: BalanceAlertStatus
  onDismiss?: () => void
  className?: string
}

/**
 * Compact banner for showing balance alerts at the top of pages
 */
export function BalanceAlertBanner({
  status,
  onDismiss,
  className,
}: BalanceAlertBannerProps) {
  if (!status.hasAlert) return null

  const isCritical = status.alertLevel === "critical"

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        isCritical
          ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isCritical ? "⚠️" : "📊"}</span>
        <div>
          <p
            className={cn(
              "text-sm font-medium",
              isCritical
                ? "text-red-700 dark:text-red-300"
                : "text-orange-700 dark:text-orange-300"
            )}
          >
            {isCritical ? "Déséquilibre critique" : "Attention à la charge"}
          </p>
          <p
            className={cn(
              "text-xs",
              isCritical
                ? "text-red-600 dark:text-red-400"
                : "text-orange-600 dark:text-orange-400"
            )}
          >
            {status.message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={isCritical ? "destructive" : "secondary"}>
          {Math.round(status.percentageGap)}% d'écart
        </Badge>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 w-8 p-0"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// REBALANCE SUGGESTIONS CARD
// =============================================================================

interface RebalanceSuggestionsCardProps {
  suggestions: RebalanceSuggestion[]
  onApply?: (suggestion: RebalanceSuggestion) => Promise<void>
  className?: string
}

/**
 * Card showing suggested task reassignments to improve balance
 */
export function RebalanceSuggestionsCard({
  suggestions,
  onApply,
  className,
}: RebalanceSuggestionsCardProps) {
  const [isPending, startTransition] = useTransition()
  const [appliedTasks, setAppliedTasks] = useState<Set<string>>(new Set())

  if (suggestions.length === 0) return null

  const handleApply = (suggestion: RebalanceSuggestion) => {
    if (!onApply) return

    startTransition(async () => {
      await onApply(suggestion)
      setAppliedTasks((prev) => new Set([...prev, suggestion.taskId]))
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>💡</span>
          Suggestions de rééquilibrage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Réassigner ces tâches pourrait améliorer l'équilibre de la charge mentale.
        </p>

        {suggestions.map((suggestion) => {
          const isApplied = appliedTasks.has(suggestion.taskId)

          return (
            <div
              key={suggestion.taskId}
              className={cn(
                "p-3 rounded-lg border bg-muted/30",
                isApplied && "opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{suggestion.taskTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.currentAssigneeName} → {suggestion.suggestedAssigneeName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {suggestion.loadWeight} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.reason}
                    </span>
                  </div>
                </div>

                {onApply && !isApplied && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApply(suggestion)}
                    disabled={isPending}
                  >
                    Réassigner
                  </Button>
                )}

                {isApplied && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ Appliqué
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// BALANCE STATUS INDICATOR
// =============================================================================

interface BalanceStatusIndicatorProps {
  alertLevel: "none" | "warning" | "critical"
  percentageGap?: number
  compact?: boolean
  className?: string
}

/**
 * Small indicator showing current balance status
 */
export function BalanceStatusIndicator({
  alertLevel,
  percentageGap,
  compact = false,
  className,
}: BalanceStatusIndicatorProps) {
  const config = {
    none: {
      icon: "✅",
      label: "Équilibré",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    warning: {
      icon: "⚠️",
      label: "Attention",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
    critical: {
      icon: "🚨",
      label: "Déséquilibré",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
  }

  const { icon, label, color, bg } = config[alertLevel]

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1", color, className)}>
        <span>{icon}</span>
        {percentageGap !== undefined && (
          <span className="text-xs">{Math.round(percentageGap)}%</span>
        )}
      </span>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        bg,
        className
      )}
    >
      <span>{icon}</span>
      <span className={cn("text-sm font-medium", color)}>{label}</span>
      {percentageGap !== undefined && (
        <span className={cn("text-xs", color)}>({Math.round(percentageGap)}%)</span>
      )}
    </div>
  )
}

// =============================================================================
// BALANCE ALERT CARD (FULL)
// =============================================================================

interface BalanceAlertCardProps {
  status: BalanceAlertStatus
  suggestions?: RebalanceSuggestion[]
  onApplySuggestion?: (suggestion: RebalanceSuggestion) => Promise<void>
  onViewDetails?: () => void
  className?: string
}

/**
 * Full card component for balance alerts with suggestions
 */
export function BalanceAlertCard({
  status,
  suggestions = [],
  onApplySuggestion,
  onViewDetails,
  className,
}: BalanceAlertCardProps) {
  const isCritical = status.alertLevel === "critical"
  const isWarning = status.alertLevel === "warning"

  if (!status.hasAlert) {
    return (
      <Card className={cn("border-green-200 dark:border-green-800", className)}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  Charge bien équilibrée
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {status.message}
                </p>
              </div>
            </div>
            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                Voir détails
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        isCritical && "border-red-300 dark:border-red-700",
        isWarning && "border-orange-300 dark:border-orange-700",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{isCritical ? "🚨" : "⚠️"}</span>
            {isCritical ? "Alerte charge mentale" : "Attention à la charge"}
          </CardTitle>
          <BalanceStatusIndicator alertLevel={status.alertLevel} compact />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={cn(
            "p-3 rounded-lg",
            isCritical
              ? "bg-red-50 dark:bg-red-950/30"
              : "bg-orange-50 dark:bg-orange-950/30"
          )}
        >
          <p
            className={cn(
              "text-sm",
              isCritical
                ? "text-red-700 dark:text-red-300"
                : "text-orange-700 dark:text-orange-300"
            )}
          >
            {status.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Écart de {Math.round(status.percentageGap)}% entre les parents
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggestions rapides :</p>
            {suggestions.slice(0, 2).map((suggestion) => (
              <div
                key={suggestion.taskId}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
              >
                <div>
                  <p className="text-sm">{suggestion.taskTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    Réassigner à {suggestion.suggestedAssigneeName}
                  </p>
                </div>
                {onApplySuggestion && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onApplySuggestion(suggestion)}
                  >
                    Appliquer
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {onViewDetails && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onViewDetails}
          >
            Voir les détails et suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
