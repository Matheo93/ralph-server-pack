"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { useSpeechToText } from "@/hooks/useSpeechToText"
import { useRouter } from "next/navigation"
import { classifyTasks, createTasksFromClassification } from "@/lib/actions/classifyTasks"
import type { MappedTask } from "@/lib/schemas/classifyTasks.schema"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { TaskPriorityBadge } from "./TaskPriorityBadge"

interface UnifiedFABProps {
  className?: string
}

type FABMode = "closed" | "menu" | "notepad"
type NotepadState = "idle" | "listening" | "typing" | "classifying" | "reviewing" | "creating" | "success" | "error"

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
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

function ListIcon({ className }: { className?: string }) {
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
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  )
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("animate-spin", className)}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export function UnifiedFAB({ className }: UnifiedFABProps) {
  const [mode, setMode] = useState<FABMode>("closed")
  const [notepadState, setNotepadState] = useState<NotepadState>("idle")
  const [textInput, setTextInput] = useState("")
  const [classifiedTasks, setClassifiedTasks] = useState<MappedTask[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const haptic = useHapticFeedback()
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Speech recognition
  const {
    state: speechState,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({
    language: "fr-FR",
    continuous: true,
    interimResults: true,
    onError: (err) => {
      setError(err)
    },
  })

  // Sync transcript with text input
  useEffect(() => {
    if (transcript) {
      setTextInput(transcript)
    }
  }, [transcript])

  const actions = [
    {
      id: "new-task",
      label: "Nouvelle tâche",
      href: "/tasks/new",
      icon: PlusIcon,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      id: "magic-notepad",
      label: "Carnet Magique",
      onClick: () => {
        setMode("notepad")
        setNotepadState("idle")
        setTextInput("")
        setClassifiedTasks([])
        setSelectedTasks(new Set())
        setError(null)
        resetTranscript()
        haptic.mediumTap()
      },
      icon: SparklesIcon,
      color: "bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-pink-600",
    },
    {
      id: "week-view",
      label: "Vue semaine",
      href: "/tasks/week",
      icon: CalendarIcon,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      id: "all-tasks",
      label: "Toutes les tâches",
      href: "/tasks",
      icon: ListIcon,
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ]

  const toggleMenu = () => {
    if (mode === "closed") {
      setMode("menu")
    } else {
      closeAll()
    }
    haptic.lightTap()
  }

  const closeAll = useCallback(() => {
    stopListening()
    setMode("closed")
    setNotepadState("idle")
    setTextInput("")
    setClassifiedTasks([])
    setError(null)
    resetTranscript()
  }, [stopListening, resetTranscript])

  // Voice functions for notepad
  const handleStartVoice = useCallback(() => {
    resetTranscript()
    setTextInput("")
    startListening()
    setNotepadState("listening")
    haptic.mediumTap()
  }, [startListening, resetTranscript, haptic])

  const handleStopVoice = useCallback(() => {
    stopListening()
    setNotepadState("typing")
    haptic.lightTap()
  }, [stopListening, haptic])

  // Classify the text
  const handleClassify = useCallback(async () => {
    const text = textInput.trim()
    if (!text) {
      setError("Ecrivez ou dictez quelque chose d'abord")
      return
    }

    setNotepadState("classifying")
    setError(null)
    setIsPending(true)
    haptic.mediumTap()

    try {
      const result = await classifyTasks(text)

      if (result.success && result.tasks.length > 0) {
        setClassifiedTasks(result.tasks)
        setSelectedTasks(new Set(result.tasks.map((_, i) => i)))
        setNotepadState("reviewing")
        haptic.success()
      } else {
        setError(result.error ?? "Aucune tâche détectée")
        setNotepadState("error")
        haptic.error()
      }
    } catch {
      setError("Erreur lors de la classification")
      setNotepadState("error")
      haptic.error()
    } finally {
      setIsPending(false)
    }
  }, [textInput, haptic])

  // Toggle task selection
  const toggleTaskSelection = useCallback((index: number) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
    haptic.lightTap()
  }, [haptic])

  // Create selected tasks
  const handleCreateTasks = useCallback(async () => {
    const tasksToCreate = classifiedTasks.filter((_, i) => selectedTasks.has(i))
    if (tasksToCreate.length === 0) {
      setError("Sélectionnez au moins une tâche")
      return
    }

    setNotepadState("creating")
    setError(null)
    setIsPending(true)
    haptic.mediumTap()

    try {
      const result = await createTasksFromClassification(tasksToCreate)

      if (result.success) {
        setNotepadState("success")
        haptic.success()
        router.refresh()
        // Auto-close after success
        setTimeout(() => {
          closeAll()
        }, 1500)
      } else {
        setError(result.errors.join(", ") || "Erreur lors de la creation")
        setNotepadState("error")
        haptic.error()
      }
    } catch {
      setError("Erreur lors de la creation")
      setNotepadState("error")
      haptic.error()
    } finally {
      setIsPending(false)
    }
  }, [classifiedTasks, selectedTasks, closeAll, haptic, router])

  // Reset to typing state
  const handleBack = useCallback(() => {
    setNotepadState("typing")
    setClassifiedTasks([])
    setSelectedTasks(new Set())
    setError(null)
  }, [])

  // Combined text (transcript + interim)
  const displayText = speechState === "listening"
    ? textInput + (interimTranscript ? ` ${interimTranscript}` : "")
    : textInput

  const isListening = speechState === "listening"
  const isProcessing = notepadState === "classifying" || notepadState === "creating"

  return (
    <div className={cn("fixed bottom-20 right-6 z-50 lg:bottom-6", className)}>
      {/* Backdrop when menu is open */}
      <AnimatePresence>
        {mode !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 -z-10"
            onClick={closeAll}
          />
        )}
      </AnimatePresence>

      {/* Menu Actions */}
      <AnimatePresence>
        {mode === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 mb-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { delay: index * 0.05 },
                }}
                exit={{
                  opacity: 0,
                  y: 20,
                  scale: 0.8,
                  transition: { delay: (actions.length - index - 1) * 0.05 },
                }}
              >
                {action.href ? (
                  <Link href={action.href} onClick={closeAll}>
                    <Button
                      size="lg"
                      className={cn(
                        "rounded-full shadow-lg h-11 px-4 flex items-center gap-2",
                        "text-white font-medium",
                        action.color
                      )}
                    >
                      <action.icon className="w-4 h-4" />
                      <span className="text-sm">{action.label}</span>
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    onClick={action.onClick}
                    className={cn(
                      "rounded-full shadow-lg h-11 px-4 flex items-center gap-2",
                      "text-white font-medium",
                      action.color
                    )}
                  >
                    <action.icon className="w-4 h-4" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notepad Widget */}
      <AnimatePresence>
        {mode === "notepad" && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-16 right-0 w-[350px] max-h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-500 to-teal-500 text-white">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                <span className="font-semibold text-sm">Carnet Magique</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={closeAll}
                className="h-7 w-7 p-0 hover:bg-white/20 text-white"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Input State */}
              {(notepadState === "idle" || notepadState === "listening" || notepadState === "typing") && (
                <div className="flex-1 flex flex-col p-4 gap-3">
                  {/* Text area */}
                  <div className="relative flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={displayText}
                      onChange={(e) => {
                        setTextInput(e.target.value)
                        if (notepadState === "idle") setNotepadState("typing")
                      }}
                      placeholder="Dictez ou écrivez vos notes..."
                      className={cn(
                        "min-h-[150px] resize-none text-sm",
                        "border-gray-200 dark:border-gray-700",
                        "focus:ring-sky-500 focus:border-sky-500",
                        isListening && "bg-sky-50 dark:bg-sky-900/20"
                      )}
                      disabled={isListening}
                    />

                    {/* Listening indicator */}
                    {isListening && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-sky-600">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                        </span>
                        <span className="text-xs">Écoute...</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Mic button */}
                    <Button
                      size="sm"
                      variant={isListening ? "destructive" : "outline"}
                      onClick={isListening ? handleStopVoice : handleStartVoice}
                      disabled={!isSpeechSupported}
                      className="flex items-center gap-1.5"
                      title={!isSpeechSupported ? "La reconnaissance vocale n'est pas supportée sur ce navigateur (utilisez Chrome)" : undefined}
                    >
                      {isListening ? (
                        <>
                          <StopIcon className="w-4 h-4" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <MicrophoneIcon className="w-4 h-4" />
                          <span>Dicter</span>
                        </>
                      )}
                    </Button>

                    {/* Classify button */}
                    <Button
                      size="sm"
                      onClick={handleClassify}
                      disabled={!textInput.trim() || isListening || isProcessing}
                      className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-pink-600 text-white"
                    >
                      {isPending ? (
                        <>
                          <LoadingSpinner className="w-4 h-4 mr-1.5" />
                          <span>Analyse...</span>
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-4 h-4 mr-1.5" />
                          <span>Classer</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-xs text-red-500 text-center">{error}</p>
                  )}
                </div>
              )}

              {/* Classifying State */}
              {notepadState === "classifying" && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <SparklesIcon className="w-12 h-12 text-sky-500" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">Classification en cours...</p>
                </div>
              )}

              {/* Review State */}
              {notepadState === "reviewing" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Task count */}
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-muted-foreground">
                      {classifiedTasks.length} tâche{classifiedTasks.length > 1 ? "s" : ""} détectée{classifiedTasks.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Task list */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {classifiedTasks.map((task, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: index * 0.1 } }}
                        className={cn(
                          "p-3 rounded-lg border transition-colors cursor-pointer",
                          selectedTasks.has(index)
                            ? "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-900/30"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        )}
                        onClick={() => toggleTaskSelection(index)}
                      >
                        <div className="flex items-start gap-2">
                          {/* Checkbox */}
                          <div
                            className={cn(
                              "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                              selectedTasks.has(index)
                                ? "border-sky-500 bg-sky-500"
                                : "border-gray-300 dark:border-gray-600"
                            )}
                          >
                            {selectedTasks.has(index) && (
                              <CheckIcon className="w-3 h-3 text-white" />
                            )}
                          </div>

                          {/* Task details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <TaskCategoryIcon code={task.category_code} />
                              <p className="text-sm font-medium truncate flex-1">{task.title}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <TaskPriorityBadge priority={task.priority} className="text-xs py-0 px-1.5" />
                              {task.child_name && (
                                <Badge variant="outline" className="text-xs py-0 px-1.5">
                                  {task.child_name}
                                </Badge>
                              )}
                              {task.deadline_text && (
                                <Badge variant="secondary" className="text-xs py-0 px-1.5">
                                  {task.deadline_text}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      Retour
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateTasks}
                      disabled={selectedTasks.size === 0 || isPending}
                      className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-pink-600 text-white"
                    >
                      {isPending ? (
                        <>
                          <LoadingSpinner className="w-4 h-4 mr-1.5" />
                          <span>Creation...</span>
                        </>
                      ) : (
                        <>
                          <CheckIcon className="w-4 h-4 mr-1.5" />
                          <span>Creer ({selectedTasks.size})</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-xs text-red-500 text-center pb-2">{error}</p>
                  )}
                </div>
              )}

              {/* Creating State */}
              {notepadState === "creating" && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                  <LoadingSpinner className="w-12 h-12 text-sky-500" />
                  <p className="text-sm text-muted-foreground">Création des tâches...</p>
                </div>
              )}

              {/* Success State */}
              {notepadState === "success" && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                  >
                    <CheckIcon className="w-8 h-8 text-green-600" />
                  </motion.div>
                  <p className="text-sm font-medium text-green-600">Tâches créées avec succès !</p>
                </div>
              )}

              {/* Error State */}
              {notepadState === "error" && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XIcon className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-sm text-red-600 text-center">{error ?? "Une erreur est survenue"}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setError(null)
                      setNotepadState("typing")
                    }}
                  >
                    Réessayer
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        {/* Glow effect when closed */}
        {mode === "closed" && (
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
        )}

        <Button
          size="lg"
          data-tour="fab-button"
          className={cn(
            "relative rounded-full shadow-lg w-14 h-14 p-0 transition-all duration-200",
            mode !== "closed"
              ? "rotate-45 bg-gray-600 hover:bg-gray-700"
              : "bg-primary hover:bg-primary/90"
          )}
          onClick={toggleMenu}
          aria-label={mode !== "closed" ? "Fermer le menu" : "Ouvrir le menu d'actions"}
          aria-expanded={mode !== "closed"}
        >
          <PlusIcon className="w-6 h-6" />
        </Button>
      </motion.div>
    </div>
  )
}
