"use client"

import Link from "next/link"
import { Crown, Sparkles, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PremiumBadgeProps {
  isPremium: boolean
  isTrialing?: boolean
  daysRemaining?: number | null
  variant?: "compact" | "full" | "sidebar"
  className?: string
}

export function PremiumBadge({
  isPremium,
  isTrialing = false,
  daysRemaining,
  variant = "compact",
  className,
}: PremiumBadgeProps) {
  if (isPremium) {
    if (variant === "sidebar") {
      return (
        <div className={cn("px-3 pb-4", className)}>
          <div className="rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 p-4 border border-amber-400/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700">Premium</p>
                {isTrialing && daysRemaining !== null && daysRemaining !== undefined && (
                  <p className="text-[10px] text-amber-600">
                    Essai : {daysRemaining}j restants
                  </p>
                )}
                {!isTrialing && (
                  <p className="text-[10px] text-amber-600">Accès complet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
          "bg-gradient-to-r from-amber-400/20 to-yellow-500/20",
          "border border-amber-400/40",
          className
        )}
      >
        <Crown className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700">Premium</span>
        {isTrialing && daysRemaining !== null && daysRemaining !== undefined && (
          <span className="text-[10px] text-amber-600">({daysRemaining}j)</span>
        )}
      </div>
    )
  }

  // Free plan - show upgrade CTA
  if (variant === "sidebar") {
    return (
      <div className={cn("px-3 pb-4", className)}>
        <Link href="/pricing" className="block group">
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 p-4 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">Passer Premium</p>
                <p className="text-[10px] text-muted-foreground">
                  Débloquez toutes les fonctionnalités
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    )
  }

  if (variant === "full") {
    return (
      <Link
        href="/pricing"
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-gradient-to-r from-primary/10 to-primary/20",
          "border border-primary/30 hover:border-primary/50",
          "transition-all hover:shadow-md hover:shadow-primary/10",
          "group",
          className
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Passer Premium</span>
        <ArrowRight className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform" />
      </Link>
    )
  }

  return (
    <Link
      href="/pricing"
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
        "text-[10px] font-medium transition-colors",
        className
      )}
    >
      <Sparkles className="w-3 h-3" />
      <span>Gratuit</span>
    </Link>
  )
}
