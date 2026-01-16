"use client"

/**
 * TransitionLink - Smooth page transitions when navigating
 * Provides fade-out effect before navigation to login/signup
 */

import { useRouter } from "next/navigation"
import { useState, useCallback, type ReactNode, type MouseEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface TransitionLinkProps {
  href: string
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

// Shared state for page transitions
let isNavigating = false
let setOverlayVisible: ((visible: boolean) => void) | null = null

export function TransitionLink({ href, children, className, onClick }: TransitionLinkProps) {
  const router = useRouter()

  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    if (onClick) {
      onClick(e)
    }

    if (isNavigating) return
    isNavigating = true

    // Trigger overlay
    if (setOverlayVisible) {
      setOverlayVisible(true)
    }

    // Navigate after fade out
    setTimeout(() => {
      router.push(href)
      // Reset after navigation
      setTimeout(() => {
        isNavigating = false
        if (setOverlayVisible) {
          setOverlayVisible(false)
        }
      }, 100)
    }, 400)
  }, [href, router, onClick])

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}

// Transition overlay component - place this in layout
export function PageTransitionOverlay() {
  const [visible, setVisible] = useState(false)

  // Register the setter
  setOverlayVisible = setVisible

  return (
    <AnimatePresence>
      {visible && (
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
  )
}
