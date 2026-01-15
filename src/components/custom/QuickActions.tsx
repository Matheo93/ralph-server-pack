"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"

interface QuickActionsProps {
  className?: string
}

export function QuickActions({ className }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Sub-actions */}
      <div
        className={cn(
          "flex flex-col gap-3 mb-3 transition-all duration-200",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {/* New Task */}
        <Link href="/tasks/new">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-12 px-4 bg-blue-500 hover:bg-blue-600 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nouvelle tache</span>
          </Button>
        </Link>

        {/* Vocal */}
        <Button
          size="lg"
          className="rounded-full shadow-lg h-12 px-4 bg-purple-500 hover:bg-purple-600 flex items-center gap-2"
          onClick={() => {
            // Trigger vocal recorder
            const vocalButton = document.querySelector("[data-vocal-trigger]") as HTMLButtonElement
            if (vocalButton) {
              vocalButton.click()
            }
            setIsOpen(false)
          }}
        >
          <MicIcon className="w-5 h-5" />
          <span>Note vocale</span>
        </Button>

        {/* Week View */}
        <Link href="/tasks/week">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-12 px-4 bg-green-500 hover:bg-green-600 flex items-center gap-2"
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Vue semaine</span>
          </Button>
        </Link>
      </div>

      {/* Main FAB button */}
      <Button
        size="lg"
        className={cn(
          "rounded-full shadow-lg w-14 h-14 p-0 transition-transform duration-200",
          isOpen && "rotate-45 bg-red-500 hover:bg-red-600"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <PlusIcon className="w-6 h-6" />
      </Button>
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
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
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
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
