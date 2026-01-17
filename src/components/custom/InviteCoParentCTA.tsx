"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, Heart, Users, ArrowRight, X } from "lucide-react"
import { useEffect, useCallback } from "react"
import { usePopupCoordinator } from "@/lib/providers/PopupCoordinator"

interface InviteCoParentCTAProps {
  className?: string
}

export function InviteCoParentCTA({ className }: InviteCoParentCTAProps) {
  // Use popup coordinator for visibility - ALWAYS use coordinator, no fallback
  const popupCoordinator = usePopupCoordinator()
  const isVisible = popupCoordinator.isPopupAllowed("invite-coparent")

  useEffect(() => {
    // Request to show after a delay (lowest priority)
    const timer = setTimeout(() => {
      popupCoordinator.requestPopup("invite-coparent")
    }, 25000) // 25 seconds delay - lowest priority

    return () => clearTimeout(timer)
  }, [popupCoordinator])

  const handleDismiss = useCallback(() => {
    popupCoordinator.dismissPopup("invite-coparent")
  }, [popupCoordinator])

  if (!isVisible) return null

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 border-teal-200/50 ${className}`}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/50 transition-colors text-muted-foreground hover:text-foreground z-10"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-sky-200/30 to-teal-200/30 blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-200/30 to-teal-200/30 blur-xl translate-y-1/2 -translate-x-1/2" />

      <CardContent className="relative p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
            <Users className="w-7 h-7 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              Invitez votre co-parent
              <Heart className="w-4 h-4 text-rose-400" />
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Partagez la charge mentale ensemble ! Invitez votre conjoint(e) pour répartir les tâches et visualiser l&apos;équilibre du foyer.
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Tâches partagées
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Équilibre visible
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                100% gratuit
              </div>
            </div>

            {/* CTA */}
            <Link href="/settings/invite">
              <Button className="gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
                <UserPlus className="w-4 h-4" />
                Inviter maintenant
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
