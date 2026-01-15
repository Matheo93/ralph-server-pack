"use client"

import { useState } from "react"
import { X, AlertTriangle, Info, AlertCircle, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import type { Alert, AlertSeverity } from "@/types/alert"
import { SEVERITY_COLORS } from "@/types/alert"

interface AlertBannerProps {
  alert: Alert
  onDismiss?: (alertId: string) => void
  className?: string
  showSuggestion?: boolean
}

const SEVERITY_ICONS: Record<AlertSeverity, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

export function AlertBanner({
  alert,
  onDismiss,
  className,
  showSuggestion = true,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  const colors = SEVERITY_COLORS[alert.severity]
  const Icon = SEVERITY_ICONS[alert.severity]

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.(alert.id)
  }

  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-lg border p-4",
        colors.bg,
        colors.border,
        className
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0 opacity-70 hover:opacity-100"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </Button>
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn("mt-0.5", colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 pr-6">
          {/* Title */}
          <h3 className={cn("font-semibold text-sm", colors.text)}>
            {alert.title}
          </h3>

          {/* Message */}
          <p className={cn("mt-1 text-sm", colors.text, "opacity-90")}>
            {alert.message}
          </p>

          {/* Suggestion - non-judgmental advice */}
          {showSuggestion && alert.suggestion && (
            <div className="mt-3 flex items-start gap-2">
              <Lightbulb className={cn("h-4 w-4 mt-0.5", colors.icon)} />
              <p className={cn("text-sm italic", colors.text, "opacity-80")}>
                {alert.suggestion}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact version for dashboard
interface AlertBannerCompactProps {
  alert: Alert
  onClick?: () => void
  className?: string
}

export function AlertBannerCompact({
  alert,
  onClick,
  className,
}: AlertBannerCompactProps) {
  const colors = SEVERITY_COLORS[alert.severity]
  const Icon = SEVERITY_ICONS[alert.severity]

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-colors hover:opacity-90",
        colors.bg,
        colors.border,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={colors.icon}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-medium text-sm truncate", colors.text)}>
            {alert.title}
          </h4>
          <p className={cn("text-xs truncate mt-0.5", colors.text, "opacity-80")}>
            {alert.message}
          </p>
        </div>
      </div>
    </button>
  )
}
