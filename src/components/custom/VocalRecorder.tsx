"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useVocalRecording } from "@/hooks/useVocalRecording"
import { VocalButton } from "./VocalButton"
import { VocalConfirmation } from "./VocalConfirmation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle, Mic, RefreshCw } from "lucide-react"
import { reportError } from "@/lib/error-reporting"
import { fadeInUp, errorShake } from "@/lib/animations"

interface VocalRecorderProps {
  onSuccess?: (taskId: string) => void
  className?: string
}

export function VocalRecorder({ onSuccess, className }: VocalRecorderProps) {
  const router = useRouter()
  const {
    state,
    error,
    transcript,
    task,
    duration,
    startRecording,
    stopRecording,
    confirmTask,
    cancelTask,
    reset,
  } = useVocalRecording()

  const handleConfirm = async () => {
    const result = await confirmTask()
    if (result.success && result.taskId) {
      if (onSuccess) {
        onSuccess(result.taskId)
      }
      router.refresh()
    }
    return result
  }

  // Report errors to error tracking
  useEffect(() => {
    if (state === "error" && error) {
      reportError(new Error(error), {
        componentName: "VocalRecorder",
        action: "recording",
      })
    }
  }, [state, error])

  if (state === "error") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="vocal-error"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Card className={className}>
            <CardContent className="py-8">
              <motion.div
                className="text-center space-y-4"
                variants={errorShake}
                initial="initial"
                animate="error"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-destructive">Erreur d'enregistrement</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <div className="flex justify-center gap-2">
                  <Button onClick={reset} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reessayer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verifiez que votre microphone est bien connecte et autorise.
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (state === "confirming" && task && transcript) {
    return (
      <div className={className}>
        <VocalConfirmation
          task={task}
          transcript={transcript}
          onConfirm={handleConfirm}
          onCancel={cancelTask}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <VocalButton
        state={state}
        duration={duration}
        onStart={startRecording}
        onStop={stopRecording}
      />
    </div>
  )
}
