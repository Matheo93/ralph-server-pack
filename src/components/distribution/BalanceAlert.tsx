/**
 * Balance Alert Component
 *
 * Displays alerts when task distribution is imbalanced.
 */

"use client"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, Scale, ArrowRight } from "lucide-react"
import { BalanceAlert as BalanceAlertType, ReassignmentSuggestion } from "@/lib/distribution/calculator"

interface BalanceAlertProps {
  alert: BalanceAlertType
  onApplySuggestion?: (suggestion: ReassignmentSuggestion) => void
  onApplyAll?: () => void
  className?: string
}

export function BalanceAlert({
  alert,
  onApplySuggestion,
  onApplyAll,
  className,
}: BalanceAlertProps) {
  const isBalanced = alert.status === "balanced"
  const hasIssues = alert.status === "critical" || alert.status === "warning"

  return (
    <Card className={cn("", className)} data-testid="balance-alert">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Équilibre de la charge
          </CardTitle>
          <StatusBadge status={alert.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance score */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Score d'équilibre</span>
          <span className="font-bold text-lg">{alert.balanceScore}%</span>
        </div>

        {/* Main message */}
        <Alert variant={isBalanced ? "default" : "destructive"}>
          {isBalanced ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>
            {isBalanced ? "Répartition équilibrée" : "Déséquilibre détecté"}
          </AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>

        {/* Issues */}
        {alert.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Problèmes identifiés</h4>
            <ul className="space-y-1">
              {alert.issues.map((issue, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <AlertTriangle className="h-3 w-3 mt-1 text-orange-500 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {alert.suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Suggestions de rééquilibrage</h4>
              {onApplyAll && alert.suggestions.length > 1 && (
                <Button variant="outline" size="sm" onClick={onApplyAll}>
                  Appliquer tout
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {alert.suggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={index}
                  suggestion={suggestion}
                  onApply={onApplySuggestion}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Status badge component
interface StatusBadgeProps {
  status: BalanceAlertType["status"]
}

function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "balanced":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
          Équilibré
        </Badge>
      )
    case "warning":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
          Attention
        </Badge>
      )
    case "critical":
      return (
        <Badge variant="destructive">
          Critique
        </Badge>
      )
  }
}

// Suggestion item component
interface SuggestionItemProps {
  suggestion: ReassignmentSuggestion
  onApply?: (suggestion: ReassignmentSuggestion) => void
}

function SuggestionItem({ suggestion, onApply }: SuggestionItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
      data-testid={`suggestion-${suggestion.taskId}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{suggestion.taskTitle}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="truncate">{suggestion.fromUserName}</span>
          <ArrowRight className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{suggestion.toUserName}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
      </div>
      {onApply && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApply(suggestion)}
          className="flex-shrink-0"
        >
          Appliquer
        </Button>
      )}
    </div>
  )
}

// Compact inline alert variant
interface InlineBalanceAlertProps {
  alert: BalanceAlertType
  onClick?: () => void
  className?: string
}

export function InlineBalanceAlert({
  alert,
  onClick,
  className,
}: InlineBalanceAlertProps) {
  if (alert.status === "balanced") {
    return null
  }

  return (
    <Alert
      variant={alert.status === "critical" ? "destructive" : "default"}
      className={cn("cursor-pointer", className)}
      onClick={onClick}
      data-testid="inline-balance-alert"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-sm">
        {alert.status === "critical" ? "Déséquilibre critique" : "Attention"}
      </AlertTitle>
      <AlertDescription className="text-xs">
        {alert.message}
        {alert.suggestions.length > 0 && (
          <span className="ml-1 underline">
            ({alert.suggestions.length} suggestion{alert.suggestions.length > 1 ? "s" : ""})
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}
