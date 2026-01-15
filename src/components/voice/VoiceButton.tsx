/**
 * Voice Button Component
 *
 * Simple microphone button that opens a voice recording modal/popover.
 * Used as a quick-access trigger for voice task creation.
 */

"use client"

import { useState, useCallback } from "react"
import { Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { VoiceRecorder } from "./VoiceRecorder"

interface VoiceButtonProps {
  /** Callback when task is created successfully */
  onTaskCreated?: (task: {
    id: string
    title: string
    category: string
    priority: number
    dueDate: string | null
    childId: string | null
  }) => void
  /** Callback on error */
  onError?: (error: string) => void
  /** Language for transcription */
  language?: "fr" | "en"
  /** Whether to auto-assign the task */
  autoAssign?: boolean
  /** Optional child ID to assign task to */
  childId?: string
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon"
  /** Additional CSS classes */
  className?: string
  /** Whether to use inline mode (no modal) */
  inline?: boolean
}

export function VoiceButton({
  onTaskCreated,
  onError,
  language = "fr",
  autoAssign = true,
  childId,
  variant = "default",
  size = "default",
  className,
  inline = false,
}: VoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleTaskCreated = useCallback(
    (task: {
      id: string
      title: string
      category: string
      priority: number
      dueDate: string | null
      childId: string | null
    }) => {
      onTaskCreated?.(task)
      // Close modal after a delay to show success state
      setTimeout(() => {
        setIsOpen(false)
      }, 2000)
    },
    [onTaskCreated]
  )

  if (inline) {
    return (
      <VoiceRecorder
        onTaskCreated={onTaskCreated}
        onError={onError}
        language={language}
        autoAssign={autoAssign}
        childId={childId}
        compact
        className={className}
      />
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={cn("gap-2", className)}
        data-testid="voice-button"
      >
        <Mic className="h-4 w-4" />
        {size !== "icon" && <span>Créer par la voix</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche vocale</DialogTitle>
            <DialogDescription>
              Décrivez votre tâche naturellement. Par exemple : &ldquo;Acheter des couches pour
              Emma demain&rdquo;
            </DialogDescription>
          </DialogHeader>

          <VoiceRecorder
            onTaskCreated={handleTaskCreated}
            onError={onError}
            language={language}
            autoAssign={autoAssign}
            childId={childId}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
