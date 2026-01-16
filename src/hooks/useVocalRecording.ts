"use client"

import { useState, useRef, useCallback } from "react"

export type VocalState = "idle" | "recording" | "uploading" | "transcribing" | "analyzing" | "confirming" | "error"

interface VocalTask {
  title: string
  description: string | null
  child_id: string | null
  child_name: string | null
  category_code: string
  category_id: string | null
  priority: "critical" | "high" | "normal" | "low"
  deadline: string | null
  vocal_transcript: string
  confidence_score: number
}

interface UseVocalRecordingResult {
  state: VocalState
  error: string | null
  transcript: string | null
  task: VocalTask | null
  audioUrl: string | null
  duration: number
  startRecording: () => Promise<void>
  stopRecording: () => void
  confirmTask: () => Promise<{ success: boolean; taskId?: string }>
  cancelTask: () => void
  reset: () => void
}

const MAX_DURATION_MS = 30000 // 30 seconds

export function useVocalRecording(): UseVocalRecordingResult {
  const [state, setState] = useState<VocalState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [task, setTask] = useState<VocalTask | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const s3KeyRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    setState("idle")
    setError(null)
    setTranscript(null)
    setTask(null)
    setAudioUrl(null)
    setDuration(0)
    chunksRef.current = []
    s3KeyRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    reset()

    try {
      // Check browser support first
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'enregistrement audio")
      }

      // Request microphone permission - this will trigger the browser permission popup
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (permErr) {
        const error = permErr as Error
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          throw new Error("Microphone non autorisé. Veuillez autoriser l'accès au micro dans les paramètres du navigateur.")
        } else if (error.name === "NotFoundError") {
          throw new Error("Aucun microphone détecté sur cet appareil.")
        } else {
          throw new Error("Impossible d'accéder au microphone: " + error.message)
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      startTimeRef.current = Date.now()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())

        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })

        // Upload to S3
        setState("uploading")
        try {
          const uploadResponse = await fetch("/api/vocal/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: `vocal-${Date.now()}.webm`,
              contentType: "audio/webm",
            }),
          })

          if (!uploadResponse.ok) {
            throw new Error("Erreur lors de l'upload")
          }

          const { uploadUrl, key, publicUrl } = await uploadResponse.json()
          s3KeyRef.current = key
          setAudioUrl(publicUrl)

          // Upload the file to S3
          await fetch(uploadUrl, {
            method: "PUT",
            body: audioBlob,
            headers: {
              "Content-Type": "audio/webm",
            },
          })

          // Transcribe
          setState("transcribing")
          const transcribeResponse = await fetch("/api/vocal/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ s3Key: key }),
          })

          if (!transcribeResponse.ok) {
            throw new Error("Erreur lors de la transcription")
          }

          const { text } = await transcribeResponse.json()
          setTranscript(text)

          // Analyze
          setState("analyzing")
          const analyzeResponse = await fetch("/api/vocal/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: text }),
          })

          if (!analyzeResponse.ok) {
            throw new Error("Erreur lors de l'analyse")
          }

          const { task: analyzedTask } = await analyzeResponse.json()
          setTask(analyzedTask)
          setState("confirming")
        } catch (err) {
          setError(err instanceof Error ? err.message : "Une erreur est survenue")
          setState("error")
        }
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setState("recording")

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        setDuration(Math.floor(elapsed / 1000))

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION_MS) {
          mediaRecorder.stop()
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'accès au micro")
      setState("error")
    }
  }, [reset])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const confirmTask = useCallback(async (): Promise<{ success: boolean; taskId?: string }> => {
    if (!task || !transcript) {
      return { success: false }
    }

    try {
      const response = await fetch("/api/vocal/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          child_id: task.child_id,
          category_code: task.category_code,
          priority: task.priority,
          deadline: task.deadline,
          vocal_transcript: transcript,
          vocal_audio_url: audioUrl,
          confidence_score: task.confidence_score,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création de la tâche")
      }

      const { taskId } = await response.json()
      reset()
      return { success: true, taskId }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
      setState("error")
      return { success: false }
    }
  }, [task, transcript, audioUrl, reset])

  const cancelTask = useCallback(() => {
    reset()
  }, [reset])

  return {
    state,
    error,
    transcript,
    task,
    audioUrl,
    duration,
    startRecording,
    stopRecording,
    confirmTask,
    cancelTask,
    reset,
  }
}
