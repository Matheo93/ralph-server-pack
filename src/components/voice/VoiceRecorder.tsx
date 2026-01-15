/**
 * Voice Recorder Component
 *
 * Full-featured voice recorder with visual feedback and task creation.
 * Shows waveform animation, duration, and processing state.
 */

"use client"

import { useCallback, useState } from "react"
import { Mic, MicOff, Loader2, Check, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVoiceRecording, RecordingState } from "@/hooks/useVoiceRecording"
import { Button } from "@/components/ui/button"

interface VoiceRecorderProps {
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
  /** Additional CSS classes */
  className?: string
  /** Compact mode for inline use */
  compact?: boolean
}

type ProcessingState = "idle" | "transcribing" | "analyzing" | "creating" | "success" | "error"

export function VoiceRecorder({
  onTaskCreated,
  onError,
  language = "fr",
  autoAssign = true,
  childId,
  className,
  compact = false,
}: VoiceRecorderProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>("idle")
  const [transcribedText, setTranscribedText] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob) => {
      setProcessingState("transcribing")
      setErrorMessage(null)

      try {
        // Create FormData with audio
        const formData = new FormData()
        formData.append("audio", audioBlob)
        formData.append("language", language)

        // Call the complete pipeline
        setProcessingState("creating")
        const response = await fetch("/api/voice/create-task", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error ?? "Erreur de création de tâche")
        }

        const data = await response.json()
        setTranscribedText(data.extraction?.originalText ?? null)
        setProcessingState("success")

        onTaskCreated?.({
          id: data.task.id,
          title: data.task.title,
          category: data.task.category,
          priority: data.task.priority,
          dueDate: data.task.dueDate,
          childId: data.task.childId,
        })

        // Reset after success
        setTimeout(() => {
          setProcessingState("idle")
          setTranscribedText(null)
        }, 2000)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue"
        setErrorMessage(message)
        setProcessingState("error")
        onError?.(message)
      }
    },
    [language, autoAssign, childId, onTaskCreated, onError]
  )

  const handleError = useCallback(
    (error: Error) => {
      setErrorMessage(error.message)
      setProcessingState("error")
      onError?.(error.message)
    },
    [onError]
  )

  const { state, isRecording, duration, startRecording, stopRecording, cancelRecording, reset } =
    useVoiceRecording({
      maxDuration: 30,
      onRecordingComplete: handleRecordingComplete,
      onError: handleError,
    })

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
    } else {
      setProcessingState("idle")
      setErrorMessage(null)
      setTranscribedText(null)
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const handleCancel = useCallback(() => {
    cancelRecording()
    setProcessingState("idle")
    setErrorMessage(null)
    setTranscribedText(null)
  }, [cancelRecording])

  const handleReset = useCallback(() => {
    reset()
    setProcessingState("idle")
    setErrorMessage(null)
    setTranscribedText(null)
  }, [reset])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusText = (): string => {
    if (processingState === "transcribing") return "Transcription..."
    if (processingState === "analyzing") return "Analyse..."
    if (processingState === "creating") return "Création..."
    if (processingState === "success") return "Tâche créée !"
    if (processingState === "error") return errorMessage ?? "Erreur"
    if (state === "requesting") return "Autorisation..."
    if (state === "recording") return formatDuration(duration)
    if (state === "processing") return "Traitement..."
    return "Appuyez pour parler"
  }

  const isProcessing =
    state === "processing" ||
    processingState === "transcribing" ||
    processingState === "analyzing" ||
    processingState === "creating"

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={handleToggleRecording}
          disabled={isProcessing}
          className={cn(
            "relative",
            isRecording && "animate-pulse"
          )}
          data-testid="voice-recorder-button-compact"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : processingState === "success" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : processingState === "error" ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        {isRecording && (
          <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-6 rounded-xl border bg-card",
        className
      )}
      data-testid="voice-recorder"
    >
      {/* Main button */}
      <button
        onClick={handleToggleRecording}
        disabled={isProcessing}
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center transition-all",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          isRecording
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
        data-testid="voice-recorder-button"
      >
        {/* Pulse animation when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-25" />
            <span className="absolute inset-0 rounded-full bg-destructive animate-pulse opacity-50" />
          </>
        )}

        {/* Icon */}
        {isProcessing ? (
          <Loader2 className="h-10 w-10 animate-spin" />
        ) : processingState === "success" ? (
          <Check className="h-10 w-10" />
        ) : processingState === "error" ? (
          <AlertCircle className="h-10 w-10" />
        ) : isRecording ? (
          <MicOff className="h-10 w-10" />
        ) : (
          <Mic className="h-10 w-10" />
        )}
      </button>

      {/* Status text */}
      <p
        className={cn(
          "text-sm font-medium",
          processingState === "success" && "text-green-600",
          processingState === "error" && "text-destructive"
        )}
        data-testid="voice-recorder-status"
      >
        {getStatusText()}
      </p>

      {/* Transcribed text preview */}
      {transcribedText && processingState === "success" && (
        <p
          className="text-xs text-muted-foreground text-center max-w-xs"
          data-testid="voice-recorder-transcription"
        >
          &ldquo;{transcribedText}&rdquo;
        </p>
      )}

      {/* Cancel button when recording */}
      {isRecording && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-muted-foreground"
          data-testid="voice-recorder-cancel"
        >
          <X className="h-4 w-4 mr-1" />
          Annuler
        </Button>
      )}

      {/* Retry button on error */}
      {processingState === "error" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          data-testid="voice-recorder-retry"
        >
          Réessayer
        </Button>
      )}

      {/* Progress indicator */}
      {isRecording && (
        <div className="w-full max-w-xs">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive transition-all"
              style={{ width: `${(duration / 30) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Max 30 secondes
          </p>
        </div>
      )}
    </div>
  )
}
