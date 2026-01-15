"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils/index"
import { AlertBanner, AlertBannerCompact } from "./AlertBanner"
import type { Alert, AlertSummary } from "@/types/alert"

interface ChargeAlertsProps {
  alerts: Alert[]
  summary?: AlertSummary
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  maxVisible?: number
}

export function ChargeAlerts({
  alerts,
  summary,
  className,
  collapsible = true,
  defaultCollapsed = false,
  maxVisible = 3,
}: ChargeAlertsProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const handleDismiss = useCallback((alertId: string) => {
    setDismissedIds((prev) => new Set([...prev, alertId]))
  }, [])

  // Filter out dismissed alerts
  const activeAlerts = alerts.filter((a) => !dismissedIds.has(a.id))

  // Determine visible alerts
  const visibleAlerts = showAll
    ? activeAlerts
    : activeAlerts.slice(0, maxVisible)

  const hasMoreAlerts = activeAlerts.length > maxVisible

  if (activeAlerts.length === 0) {
    return null
  }

  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Alertes</CardTitle>
            {/* Alert counts */}
            <div className="flex gap-1">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="bg-amber-500 text-white text-xs">
                  {warningCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Collapse toggle */}
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-3 pt-0">
          {visibleAlerts.map((alert) => (
            <AlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={handleDismiss}
              showSuggestion={true}
            />
          ))}

          {/* Show more/less button */}
          {hasMoreAlerts && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? "Voir moins"
                : `Voir ${activeAlerts.length - maxVisible} autre${activeAlerts.length - maxVisible > 1 ? "s" : ""}`}
            </Button>
          )}

          {/* Dismiss all button */}
          {activeAlerts.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                activeAlerts.forEach((a) => handleDismiss(a.id))
              }}
            >
              <BellOff className="h-4 w-4 mr-2" />
              Masquer toutes les alertes
            </Button>
          )}
        </CardContent>
      )}

      {/* Collapsed summary */}
      {isCollapsed && activeAlerts.length > 0 && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {activeAlerts.length} alerte{activeAlerts.length > 1 ? "s" : ""} active{activeAlerts.length > 1 ? "s" : ""}
          </p>
        </CardContent>
      )}
    </Card>
  )
}

// Mini version for sidebar or header
interface ChargeAlertsMiniProps {
  alerts: Alert[]
  onViewAll?: () => void
  className?: string
}

export function ChargeAlertsMini({
  alerts,
  onViewAll,
  className,
}: ChargeAlertsMiniProps) {
  if (alerts.length === 0) {
    return null
  }

  // Show only the most critical alert
  const mostCriticalAlert = alerts[0]

  if (!mostCriticalAlert) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      <AlertBannerCompact alert={mostCriticalAlert} onClick={onViewAll} />
      {alerts.length > 1 && (
        <Button
          variant="link"
          size="sm"
          className="w-full text-xs"
          onClick={onViewAll}
        >
          +{alerts.length - 1} autre{alerts.length - 1 > 1 ? "s" : ""} alerte{alerts.length - 1 > 1 ? "s" : ""}
        </Button>
      )}
    </div>
  )
}
