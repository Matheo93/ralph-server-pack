"use client"

import { useVocalRecording } from "@/hooks/useVocalRecording"
import { VocalButton } from "./VocalButton"
import { VocalConfirmation } from "./VocalConfirmation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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

  if (state === "error") {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={reset}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
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
