"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type SpeechState = "idle" | "listening" | "processing" | "error"

interface UseSpeechToTextOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

interface UseSpeechToTextResult {
  state: SpeechState
  transcript: string
  interimTranscript: string
  error: string | null
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

// Web Speech API types
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEventMap {
  audioend: Event
  audiostart: Event
  end: Event
  error: SpeechRecognitionErrorEventType
  nomatch: SpeechRecognitionEventType
  result: SpeechRecognitionEventType
  soundend: Event
  soundstart: Event
  speechend: Event
  speechstart: Event
  start: Event
}

interface SpeechRecognitionEventType extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEventType extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onaudioend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  onaudiostart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  onend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEventType) => void) | null
  onnomatch: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEventType) => void) | null
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEventType) => void) | null
  onsoundend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  onsoundstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  onspeechend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  onspeechstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null
  abort(): void
  start(): void
  stop(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInterface
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

/**
 * Hook for Web Speech API speech-to-text
 * Uses native browser speech recognition
 */
export function useSpeechToText(
  options: UseSpeechToTextOptions = {}
): UseSpeechToTextResult {
  const {
    language = "fr-FR",
    continuous = true,
    interimResults = true,
    onResult,
    onError,
  } = options

  const [state, setState] = useState<SpeechState>("idle")
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  // Default to true so button is shown, will be updated after mount
  const [isSupported, setIsSupported] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stateRef = useRef<SpeechState>("idle")

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Check browser support after mount
  useEffect(() => {
    setIsMounted(true)
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined
    setIsSupported(!!SpeechRecognitionAPI)
  }, [])

  // Initialize recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      return null
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setState("listening")
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      let finalTranscript = ""
      let interim = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result) {
          const text = result[0]?.transcript ?? ""
          if (result.isFinal) {
            finalTranscript += text
          } else {
            interim += text
          }
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => {
          const newTranscript = prev + (prev ? " " : "") + finalTranscript
          onResult?.(newTranscript, true)
          return newTranscript
        })
        setInterimTranscript("")
      } else {
        setInterimTranscript(interim)
        onResult?.(interim, false)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
      // Ignore "aborted" errors (normal when stopping)
      if (event.error === "aborted") {
        return
      }

      const errorMessages: Record<string, string> = {
        "not-allowed": "Microphone non autorise. Veuillez autoriser l'acces au micro.",
        "no-speech": "Aucune parole detectee. Essayez de parler plus fort.",
        "audio-capture": "Impossible d'acceder au microphone.",
        network: "Erreur reseau. Verifiez votre connexion.",
      }

      const errorMessage =
        errorMessages[event.error] ?? `Erreur de reconnaissance: ${event.error}`

      setError(errorMessage)
      setState("error")
      onError?.(errorMessage)
    }

    recognition.onend = () => {
      // Auto-restart if still in listening state (for continuous mode)
      if (stateRef.current === "listening" && continuous) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start()
          } catch {
            // Ignore if already started
          }
        }, 100)
      } else {
        setState("idle")
      }
    }

    return recognition
  }, [language, continuous, interimResults, onResult, onError])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("La reconnaissance vocale n'est pas supportee par ce navigateur.")
      setState("error")
      return
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
    }

    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    const recognition = initRecognition()
    if (!recognition) {
      setError("Impossible d'initialiser la reconnaissance vocale.")
      setState("error")
      return
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setError("Erreur au demarrage de la reconnaissance vocale.")
      setState("error")
    }
  }, [isSupported, initRecognition])

  const stopListening = useCallback(() => {
    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
      recognitionRef.current = null
    }

    setState("idle")
    setInterimTranscript("")
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
      }
    }
  }, [])

  return {
    state,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
