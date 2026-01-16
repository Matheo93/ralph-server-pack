"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, Heart, Users, ArrowRight, X } from "lucide-react"
import { useState, useEffect } from "react"

interface InviteCoParentCTAProps {
  className?: string
}

const DISMISSED_KEY = "familyload_invite_cta_dismissed"

export function InviteCoParentCTA({ className }: InviteCoParentCTAProps) {
  const [isDismissed, setIsDismissed] = useState(true) // Start hidden to avoid flash

  useEffect(() => {
    // Check localStorage on client
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    setIsDismissed(dismissed === "true")
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true")
    setIsDismissed(true)
  }

  if (isDismissed) return null

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 border-pink-200/50 ${className}`}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/50 transition-colors text-muted-foreground hover:text-foreground z-10"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/30 blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-xl translate-y-1/2 -translate-x-1/2" />

      <CardContent className="relative p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
            <Users className="w-7 h-7 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              Invitez votre co-parent
              <Heart className="w-4 h-4 text-pink-500" />
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Partagez la charge mentale ensemble ! Invitez votre conjoint(e) pour repartir les taches et visualiser l&apos;equilibre du foyer.
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Taches partagees
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 px-2 py-1 rounded-full">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Equilibre visible
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
              <Button className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
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
