"use client"

/**
 * MarketingHeader - Header with smooth transitions to auth pages
 */

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

export function MarketingHeader() {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleAuthNavigation = useCallback((href: string) => {
    setIsTransitioning(true)
    // Small delay to show animation before navigation
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

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <Logo size="sm" animated />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Fonctionnalites
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Tarifs
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Temoignages
            </Link>
          </nav>

          {/* CTA Buttons with smooth transition */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => handleAuthNavigation("/login")}
            >
              Connexion
            </Button>
            <Button onClick={() => handleAuthNavigation("/signup")}>
              Essai gratuit
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}
