"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils/index"

interface FeatureBadgeProps {
  featureId: string
  children: React.ReactNode
  className?: string
  badgeClassName?: string
  variant?: "new" | "improved" | "beta"
  showUntil?: Date
}

const STORAGE_KEY = "familyload_seen_features"

const variantStyles = {
  new: {
    bg: "bg-gradient-to-r from-green-500 to-emerald-500",
    text: "Nouveau",
    pulse: true,
  },
  improved: {
    bg: "bg-gradient-to-r from-blue-500 to-cyan-500",
    text: "Ameliore",
    pulse: false,
  },
  beta: {
    bg: "bg-gradient-to-r from-sky-500 to-teal-500",
    text: "Beta",
    pulse: true,
  },
}

export function FeatureBadge({
  featureId,
  children,
  className,
  badgeClassName,
  variant = "new",
  showUntil,
}: FeatureBadgeProps) {
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    // Check if feature has been seen
    const seenFeatures = localStorage.getItem(STORAGE_KEY)
    const seen = seenFeatures ? JSON.parse(seenFeatures) as string[] : []

    // Check expiry date
    if (showUntil && new Date() > showUntil) {
      return
    }

    // Show badge if not seen
    if (!seen.includes(featureId)) {
      setShowBadge(true)
    }
  }, [featureId, showUntil])

  const markAsSeen = () => {
    const seenFeatures = localStorage.getItem(STORAGE_KEY)
    const seen = seenFeatures ? JSON.parse(seenFeatures) as string[] : []
    if (!seen.includes(featureId)) {
      seen.push(featureId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
    }
    setShowBadge(false)
  }

  const style = variantStyles[variant]

  return (
    <div className={cn("relative inline-flex", className)} onClick={markAsSeen}>
      {children}
      <AnimatePresence>
        {showBadge && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "absolute -top-1 -right-1 z-10",
              "px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full",
              "shadow-md whitespace-nowrap",
              style.bg,
              style.pulse && "animate-pulse",
              badgeClassName
            )}
          >
            {style.text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

// Sparkle indicator for highlighting new features inline
export function NewFeatureSparkle({ className }: { className?: string }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
      className={cn("inline-flex text-yellow-500", className)}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
      </svg>
    </motion.span>
  )
}

// Dot indicator for sidebar/menu items
export function NewFeatureDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  )
}

// Reset seen features (for testing)
export function resetSeenFeatures() {
  localStorage.removeItem(STORAGE_KEY)
}
