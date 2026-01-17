"use client"

/**
 * HeroCTA - Call-to-action buttons with smooth page transitions
 */

import { useRouter } from "next/navigation"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroCTA() {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleNavigation = useCallback((href: string) => {
    setIsTransitioning(true)
    setTimeout(() => {
      router.push(href)
    }, 300)
  }, [router])

  return (
    <>
      {/* Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-background"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
        <Button
          size="lg"
          className="text-base h-14 px-8 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105 btn-shine btn-glow btn-glow-pulse btn-ripple group"
          onClick={() => handleNavigation("/signup")}
        >
          Commencer gratuitement
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="text-base h-14 px-8 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 magnetic-hover btn-outline-fill btn-hover-lift"
          onClick={() => {
            const featuresEl = document.getElementById("features")
            if (featuresEl) {
              featuresEl.scrollIntoView({ behavior: "smooth" })
            }
          }}
        >
          Découvrir les fonctionnalités
        </Button>
      </div>
    </>
  )
}

/**
 * FinalCTA - Call-to-action section at the bottom of the page
 */
export function FinalCTA() {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleNavigation = useCallback((href: string) => {
    setIsTransitioning(true)
    setTimeout(() => {
      router.push(href)
    }, 300)
  }, [router])

  return (
    <>
      {/* Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-background"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          size="lg"
          className="text-base bg-white text-primary hover:bg-white/90 shadow-lg btn-shine btn-hover-lift btn-ripple group"
          onClick={() => handleNavigation("/signup")}
        >
          Créer mon compte gratuit
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="text-base border-2 border-white/30 bg-transparent text-white hover:bg-white/10 magnetic-hover btn-hover-lift"
          onClick={() => handleNavigation("/login")}
        >
          J&apos;ai déjà un compte
        </Button>
      </div>
    </>
  )
}
