"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

interface QuickActionsProps {
  className?: string
}

export function QuickActions({ className }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const haptic = useHapticFeedback()

  // Show hint animation for first-time users
  useEffect(() => {
    const hasSeenHint = localStorage.getItem("familyload_quickactions_hint")
    if (!hasSeenHint) {
      const timer = setTimeout(() => {
        setShowHint(true)
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowHint(false)
          localStorage.setItem("familyload_quickactions_hint", "true")
        }, 5000)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const toggleOpen = () => {
    setIsOpen(!isOpen)
    haptic.lightTap()
    if (showHint) {
      setShowHint(false)
      localStorage.setItem("familyload_quickactions_hint", "true")
    }
  }

  const actions = [
    {
      id: "new-task",
      label: "Nouvelle tache",
      href: "/tasks/new",
      icon: PlusIcon,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      id: "week-view",
      label: "Vue semaine",
      href: "/tasks/week",
      icon: CalendarIcon,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      id: "all-tasks",
      label: "Toutes les taches",
      href: "/tasks",
      icon: ListIcon,
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ]

  return (
    <div className={cn("fixed bottom-20 left-6 z-40 lg:bottom-6 lg:left-auto lg:right-24", className)}>
      {/* Hint bubble */}
      <AnimatePresence>
        {showHint && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute bottom-16 left-0 lg:bottom-auto lg:top-0 lg:right-16 lg:left-auto"
          >
            <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap">
              Actions rapides
              <div className="absolute -bottom-1 left-4 lg:-right-1 lg:left-auto lg:top-4 lg:bottom-auto w-2 h-2 bg-primary rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-actions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 mb-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { delay: index * 0.05 },
                }}
                exit={{
                  opacity: 0,
                  y: 20,
                  scale: 0.8,
                  transition: { delay: (actions.length - index - 1) * 0.05 },
                }}
              >
                <Link href={action.href} onClick={() => setIsOpen(false)}>
                  <Button
                    size="lg"
                    className={cn(
                      "rounded-full shadow-lg h-11 px-4 flex items-center gap-2",
                      "text-white font-medium",
                      action.color
                    )}
                  >
                    <action.icon className="w-4 h-4" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        {/* Glow effect when closed */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
        )}

        <Button
          size="lg"
          className={cn(
            "relative rounded-full shadow-lg w-12 h-12 p-0 transition-all duration-200",
            isOpen
              ? "rotate-45 bg-gray-600 hover:bg-gray-700"
              : "bg-primary hover:bg-primary/90"
          )}
          onClick={toggleOpen}
          aria-label={isOpen ? "Fermer les actions rapides" : "Ouvrir les actions rapides"}
          aria-expanded={isOpen}
        >
          <PlusIcon className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  )
}
