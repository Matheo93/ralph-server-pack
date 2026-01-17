"use client"

import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, Heart, Users, ArrowRight, X } from "lucide-react"
import { useEffect, useCallback } from "react"
import { usePopupCoordinator } from "@/lib/providers/PopupCoordinator"

interface InviteCoParentCTAProps {
  className?: string
  /** If true, renders as inline card. If false (default), renders as fixed popup */
  inline?: boolean
}

export function InviteCoParentCTA({ className, inline = false }: InviteCoParentCTAProps) {
  // Use popup coordinator for visibility - ALWAYS use coordinator, no fallback
  const popupCoordinator = usePopupCoordinator()
  const isVisible = popupCoordinator.isPopupAllowed("invite-coparent")

  useEffect(() => {
    // Request to show after a delay (lowest priority)
    // Coordinator handles the queue and priority
    const timer = setTimeout(() => {
      popupCoordinator.requestPopup("invite-coparent")
    }, 20000) // 20 seconds delay - lowest priority, shows after push & PWA install

    return () => clearTimeout(timer)
  }, [popupCoordinator])

  const handleDismiss = useCallback(() => {
    popupCoordinator.dismissPopup("invite-coparent")
  }, [popupCoordinator])

  if (!isVisible) return null

  const content = (
    <Card className={`relative overflow-hidden bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 border-teal-200/50 shadow-lg ${inline ? className : ""}`}>
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

      <CardContent className="relative p-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
              Invitez votre co-parent
              <Heart className="w-4 h-4 text-rose-400" />
            </h3>
            <p className="text-muted-foreground text-sm mb-3">
              Partagez la charge mentale et visualisez l&apos;équilibre du foyer.
            </p>

            {/* CTA */}
            <Link href="/settings/invite">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
                <UserPlus className="w-4 h-4" />
                Inviter
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Inline mode: render as a card in the page flow
  if (inline) {
    return content
  }

  // Popup mode: render as a fixed positioned popup (default behavior)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  )
}
