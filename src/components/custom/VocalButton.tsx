"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import { pulseAnimation, recordingRing, waveformBar, durations } from "@/lib/animations"
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

function Waveform() {
  const bars = 5
  return (
    <div className="flex items-center justify-center gap-1 h-6">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-white rounded-full"
          variants={waveformBar}
          initial="initial"
          animate="animate"
          custom={i}
          style={{ height: "100%" }}
        />
      ))}
    </div>
  )
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
  const isError = state === "error"
  const isSuccess = state === "confirming"

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
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Button container with animated rings */}
      <div className="relative">
        {/* Pulsing ring for recording state */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/30"
              variants={recordingRing}
              initial="initial"
              animate="recording"
              exit={{ opacity: 0, scale: 1 }}
              style={{ margin: -8 }}
            />
          )}
        </AnimatePresence>

        {/* Success ring */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              className="absolute inset-0 rounded-full bg-green-500/30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.3, 1.5] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{ margin: -8 }}
            />
          )}
        </AnimatePresence>

        {/* Error shake animation */}
        <motion.div
          animate={isError ? {
            x: [0, -8, 8, -8, 8, 0],
            transition: { duration: 0.4 }
          } : {}}
        >
          <motion.div
            variants={pulseAnimation}
            initial="initial"
            animate={isRecording ? "pulse" : "initial"}
          >
            <Button
              size="lg"
              onClick={handleClick}
              disabled={isProcessing || state === "confirming"}
              aria-label={isRecording ? "Arreter l'enregistrement" : stateLabels[state]}
              aria-busy={isProcessing}
              aria-pressed={isRecording}
              className={cn(
                "rounded-full w-16 h-16 p-0 transition-colors relative overflow-hidden",
                isRecording && "bg-red-500 hover:bg-red-600",
                isProcessing && "bg-gray-400",
                isError && "bg-red-600 hover:bg-red-700",
                isSuccess && "bg-green-500 hover:bg-green-600"
              )}
            >
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: durations.fast }}
                  >
                    <LoadingSpinner className="w-6 h-6" />
                  </motion.div>
                ) : isRecording ? (
                  <motion.div
                    key="waveform"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: durations.fast }}
                  >
                    <Waveform />
                  </motion.div>
                ) : isSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <motion.path
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    </svg>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mic"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: durations.fast }}
                  >
                    <MicrophoneIcon className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Status text with animation */}
      <div className="text-center min-h-[40px]" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: durations.fast }}
          >
            <p className={cn(
              "text-sm",
              isError && "text-red-500 font-medium",
              isSuccess && "text-green-600 font-medium",
              !isError && !isSuccess && "text-muted-foreground"
            )}>
              {isRecording
                ? `${formatDuration(duration)} / 0:30`
                : stateLabels[state]}
            </p>
            {isRecording && (
              <motion.p
                className="text-xs text-muted-foreground mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Appuyez pour arrêter
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar with smooth animation */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            className="w-full max-w-[200px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ duration: durations.normal }}
            role="progressbar"
            aria-valuenow={Math.round((duration / 30) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de l'enregistrement"
          >
            <motion.div
              className="h-full bg-red-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min((duration / 30) * 100, 100)}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
