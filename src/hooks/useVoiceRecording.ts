/**
 * Voice Recording Hook
 *
 * Manages audio recording from microphone with state management.
 * Provides start/stop controls and audio blob for processing.
 */

"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type RecordingState = "idle" | "requesting" | "recording" | "processing" | "error"

export interface UseVoiceRecordingOptions {
  /** Maximum recording duration in seconds (default: 30) */
  maxDuration?: number
  /** Audio mime type (default: audio/webm) */
  mimeType?: string
  /** Callback when recording completes */
  onRecordingComplete?: (audioBlob: Blob) => void
  /** Callback on error */
  onError?: (error: Error) => void
}

export interface UseVoiceRecordingResult {
  /** Current recording state */
  state: RecordingState
  /** Whether currently recording */
  isRecording: boolean
  /** Whether processing audio */
  isProcessing: boolean
  /** Recording duration in seconds */
  duration: number
  /** Error message if any */
  error: string | null
  /** Start recording */
  startRecording: () => Promise<void>
  /** Stop recording and return audio blob */
  stopRecording: () => Promise<Blob | null>
  /** Cancel recording without returning audio */
  cancelRecording: () => void
  /** Reset state */
  reset: () => void
  /** Audio blob from last recording */
  audioBlob: Blob | null
}

export function useVoiceRecording(
  options: UseVoiceRecordingOptions = {}
): UseVoiceRecordingResult {
  const {
    maxDuration = 30,
    mimeType = "audio/webm",
    onRecordingComplete,
    onError,
  } = options

  const [state, setState] = useState<RecordingState>("idle")
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setAudioBlob(null)
      setState("requesting")

      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'enregistrement audio")
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error("Votre navigateur ne supporte pas MediaRecorder")
      }

      // Determine supported mime type
      let actualMimeType = mimeType
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const fallbackTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg",
        ]
        actualMimeType = fallbackTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""
        if (!actualMimeType) {
          throw new Error("Aucun format audio supporté")
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: actualMimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = () => {
        const err = new Error("Erreur d'enregistrement")
        setError(err.message)
        setState("error")
        onError?.(err)
        cleanup()
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      startTimeRef.current = Date.now()
      setState("recording")
      setDuration(0)

      // Duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording()
        }
      }, 100)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Erreur inconnue")
      setError(error.message)
      setState("error")
      onError?.(error)
      cleanup()
    }
  }, [mimeType, maxDuration, onError, cleanup])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null)
        return
      }

      setState("processing")

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        setAudioBlob(blob)
        setState("idle")
        onRecordingComplete?.(blob)
        cleanup()
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }, [onRecordingComplete, cleanup])

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = null
      mediaRecorder.stop()
    }

    cleanup()
    setState("idle")
    setDuration(0)
    setAudioBlob(null)
  }, [cleanup])

  const reset = useCallback(() => {
    cleanup()
    setState("idle")
    setDuration(0)
    setError(null)
    setAudioBlob(null)
  }, [cleanup])

  return {
    state,
    isRecording: state === "recording",
    isProcessing: state === "processing",
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    audioBlob,
  }
}
