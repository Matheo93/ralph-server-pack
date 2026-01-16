"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Crown, Lock, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PremiumGateProps {
  /**
   * Whether the user has access (isPremium or within free limits)
   */
  hasAccess: boolean
  /**
   * Feature name for display
   */
  featureName: string
  /**
   * Description of what the feature does
   */
  featureDescription?: string
  /**
   * Current usage (e.g., "2 enfants")
   */
  currentUsage?: string
  /**
   * Limit for free plan (e.g., "2 max")
   */
  freeLimit?: string
  /**
   * What premium offers (e.g., "Illimité")
   */
  premiumBenefit?: string
  /**
   * Whether to show as modal (true) or inline block (false)
   */
  variant?: "modal" | "inline" | "redirect"
  /**
   * Children to render if hasAccess is true
   */
  children: React.ReactNode
}

export function PremiumGate({
  hasAccess,
  featureName,
  featureDescription,
  currentUsage,
  freeLimit,
  premiumBenefit = "Illimité",
  variant = "modal",
  children,
}: PremiumGateProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!hasAccess) {
      if (variant === "redirect") {
        router.push(`/pricing?feature=${encodeURIComponent(featureName)}`)
      } else if (variant === "modal") {
        setShowModal(true)
      }
    }
  }, [hasAccess, variant, featureName, router])

  if (hasAccess) {
    return <>{children}</>
  }

  if (variant === "redirect") {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (variant === "inline") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10 p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">Fonctionnalité Premium</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          {featureDescription || `${featureName} nécessite un abonnement Premium.`}
        </p>

        {(currentUsage || freeLimit) && (
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Gratuit</p>
              <p className="font-semibold">{freeLimit}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-primary">Premium</p>
              <p className="font-semibold text-primary">{premiumBenefit}</p>
            </div>
          </div>
        )}

        <Button asChild size="lg" className="gap-2">
          <Link href="/pricing">
            <Sparkles className="w-4 h-4" />
            Passer Premium
          </Link>
        </Button>
      </div>
    )
  }

  // Modal variant
  return (
    <>
      {children}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              {featureName}
            </DialogTitle>
            <DialogDescription className="text-center">
              {featureDescription || "Cette fonctionnalité nécessite un abonnement Premium."}
            </DialogDescription>
          </DialogHeader>

          {(currentUsage || freeLimit) && (
            <div className="flex items-center justify-center gap-6 py-4 border-y">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Gratuit</p>
                <p className="text-lg font-semibold">{freeLimit}</p>
                {currentUsage && (
                  <p className="text-xs text-muted-foreground">({currentUsage})</p>
                )}
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-xs text-primary uppercase tracking-wide">Premium</p>
                <p className="text-lg font-semibold text-primary">{premiumBenefit}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.back()}>
              Retour
            </Button>
            <Button asChild className="gap-2">
              <Link href="/pricing">
                <Sparkles className="w-4 h-4" />
                Voir les offres Premium
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Server-side helper to check premium access
 */
export async function checkPremiumAccess(
  householdId: string,
  feature: "unlimited_children" | "unlimited_voice" | "auto_tasks" | "pdf_export" | "streak_joker"
): Promise<boolean> {
  // Import dynamically to avoid circular deps
  const { canUseFeature } = await import("@/lib/services/subscription")
  return canUseFeature(householdId, feature)
}
