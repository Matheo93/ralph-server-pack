"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Sparkles, ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UpgradeBannerProps {
  /**
   * Trigger context: what prompted this banner
   * - "limit_reached": User hit a free plan limit (voice commands, children)
   * - "feature_locked": User tried accessing a premium feature
   * - "general": General upgrade prompt
   */
  trigger?: "limit_reached" | "feature_locked" | "general"
  /**
   * Specific feature that was blocked (for personalized message)
   */
  blockedFeature?: string
  /**
   * Whether the banner can be dismissed
   */
  dismissible?: boolean
  /**
   * Variant style
   */
  variant?: "banner" | "inline" | "modal"
  className?: string
}

const MESSAGES = {
  limit_reached: {
    title: "Limite atteinte",
    description: "Passez Premium pour des fonctionnalités illimitées",
    icon: Zap,
  },
  feature_locked: {
    title: "Fonctionnalité Premium",
    description: "Débloquez cette fonctionnalité avec Premium",
    icon: Sparkles,
  },
  general: {
    title: "Passez Premium",
    description: "Profitez de toutes les fonctionnalités sans limite",
    icon: Sparkles,
  },
}

export function UpgradeBanner({
  trigger = "general",
  blockedFeature,
  dismissible = true,
  variant = "banner",
  className,
}: UpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const message = MESSAGES[trigger]
  const Icon = message.icon

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "relative rounded-xl p-4 overflow-hidden",
          "bg-gradient-to-r from-primary/5 via-primary/10 to-accent/10",
          "border border-primary/20",
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{message.title}</p>
            <p className="text-xs text-muted-foreground">
              {blockedFeature || message.description}
            </p>
          </div>
          <Button asChild size="sm" className="flex-shrink-0">
            <Link href="/pricing" className="gap-1.5">
              <span>Voir les offres</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  // Banner variant (top of page)
  return (
    <div
      className={cn(
        "relative w-full py-2.5 px-4",
        "bg-gradient-to-r from-primary via-primary/90 to-accent",
        "text-primary-foreground",
        className
      )}
    >
      <div className="container flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {blockedFeature || message.description}
          </span>
        </div>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="h-7 text-xs font-semibold"
        >
          <Link href="/pricing" className="gap-1">
            <span>Essai gratuit 14 jours</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>
      {dismissible && (
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
