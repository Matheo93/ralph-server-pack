"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Camera, Clock, Sparkles, Coins, Check, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { submitTaskProof } from "@/lib/actions/kids-tasks"
import type { RoadmapTask } from "./KidsRoadmap"

interface TaskLevelModalProps {
  task: RoadmapTask | null
  isOpen: boolean
  onClose: () => void
  childId: string
  onProofSubmitted: () => void
}

export function TaskLevelModal({
  task,
  isOpen,
  onClose,
  childId,
  onProofSubmitted,
}: TaskLevelModalProps) {
  const [showCamera, setShowCamera] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
    } catch (err) {
      console.error("Camera error:", err)
      setError("Impossible d'accéder à la caméra. Vérifie les permissions!")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return
    
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
      setCapturedPhoto(dataUrl)
      stopCamera()
    }
  }, [stopCamera])

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null)
    startCamera()
  }, [startCamera])

  const submitProof = useCallback(async () => {
    if (!task || !capturedPhoto) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await submitTaskProof(task.id, capturedPhoto)
      if (result.success) {
        onProofSubmitted()
        handleClose()
      } else {
        setError(result.error || "Erreur lors de l'envoi")
      }
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setIsSubmitting(false)
    }
  }, [task, capturedPhoto, onProofSubmitted])

  const handleClose = useCallback(() => {
    stopCamera()
    setCapturedPhoto(null)
    setShowCamera(false)
    setError(null)
    onClose()
  }, [stopCamera, onClose])

  if (!task) return null

  const isWaiting = task.proof_status === "pending"
  const isRejected = task.proof_status === "rejected"

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header coloré */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
              <div className="flex justify-between items-start">
                <div className="text-4xl">{task.category_icon || "📋"}</div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-xl font-bold mt-2">{task.title}</h2>
              {task.deadline && (
                <div className="flex items-center gap-1 text-sm opacity-90 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(task.deadline).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="p-4">
              {/* Description */}
              {task.description && (
                <p className="text-gray-600 text-sm mb-4">{task.description}</p>
              )}

              {/* Récompense */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">🎁 Récompense</p>
                {task.reward_type === "immediate" ? (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    <span className="font-bold text-purple-700">
                      Surprise secrète! 🤫
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Coins className="w-6 h-6 text-yellow-500" />
                    <span className="font-bold text-yellow-700">
                      +{task.reward_xp} XP
                    </span>
                  </div>
                )}
              </div>

              {/* Status en attente */}
              {isWaiting && (
                <div className="bg-blue-100 rounded-2xl p-4 mb-4 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-4xl mb-2"
                  >
                    ⏳
                  </motion.div>
                  <p className="text-blue-700 font-medium">
                    En attente de validation!
                  </p>
                  <p className="text-blue-600 text-sm">
                    Un parent doit vérifier ta photo
                  </p>
                </div>
              )}

              {/* Status rejeté */}
              {isRejected && (
                <div className="bg-red-100 rounded-2xl p-4 mb-4 text-center">
                  <div className="text-4xl mb-2">😅</div>
                  <p className="text-red-700 font-medium">
                    Oups! Réessaie!
                  </p>
                  <p className="text-red-600 text-sm">
                    Ta photo n'a pas été validée
                  </p>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="bg-red-100 rounded-xl p-3 mb-4 text-center text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Zone Caméra */}
              {showCamera && (
                <div className="relative rounded-2xl overflow-hidden mb-4 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition"
                  >
                    <div className="w-12 h-12 bg-red-500 rounded-full" />
                  </button>
                </div>
              )}

              {/* Photo capturée */}
              {capturedPhoto && (
                <div className="relative rounded-2xl overflow-hidden mb-4">
                  <img
                    src={capturedPhoto}
                    alt="Photo capturée"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <button
                    onClick={retakePhoto}
                    className="absolute top-2 right-2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Boutons d'action */}
              {!isWaiting && (
                <div className="space-y-2">
                  {!showCamera && !capturedPhoto && (
                    <Button
                      onClick={startCamera}
                      className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-2xl"
                    >
                      <Camera className="w-6 h-6 mr-2" />
                      J'ai terminé! 📸
                    </Button>
                  )}

                  {capturedPhoto && (
                    <Button
                      onClick={submitProof}
                      disabled={isSubmitting}
                      className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Check className="w-6 h-6 mr-2" />
                          Envoyer la preuve!
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
