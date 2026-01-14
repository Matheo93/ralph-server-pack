"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import type { VocalState } from "@/hooks/useVocalRecording"

interface VocalButtonProps {
  state: VocalState
  duration: number
  onStart: () => void
  onStop: () => void
  className?: string
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cn("animate-spin", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

const stateLabels: Record<VocalState, string> = {
  idle: "Appuyez pour parler",
  recording: "Enregistrement...",
  uploading: "Envoi...",
  transcribing: "Transcription...",
  analyzing: "Analyse...",
  confirming: "Confirmez",
  error: "Erreur",
}

export function VocalButton({
  state,
  duration,
  onStart,
  onStop,
  className,
}: VocalButtonProps) {
  const isProcessing = ["uploading", "transcribing", "analyzing"].includes(state)
  const isRecording = state === "recording"

  const handleClick = () => {
    if (state === "idle") {
      onStart()
    } else if (isRecording) {
      onStop()
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Button
        size="lg"
        onClick={handleClick}
        disabled={isProcessing || state === "confirming"}
        className={cn(
          "rounded-full w-16 h-16 p-0 transition-all",
          isRecording && "bg-red-500 hover:bg-red-600 animate-pulse",
          isProcessing && "bg-gray-400"
        )}
      >
        {isProcessing ? (
          <LoadingSpinner className="w-6 h-6" />
        ) : isRecording ? (
          <StopIcon className="w-6 h-6" />
        ) : (
          <MicrophoneIcon className="w-6 h-6" />
        )}
      </Button>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isRecording
            ? `${formatDuration(duration)} / 0:30`
            : stateLabels[state]}
        </p>
        {isRecording && (
          <p className="text-xs text-muted-foreground mt-1">
            Appuyez pour arrêter
          </p>
        )}
      </div>

      {isRecording && (
        <div className="w-full max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-100"
            style={{ width: `${Math.min((duration / 30) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
