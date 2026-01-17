'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { KidsTask } from '@/lib/actions/kids-tasks'
import { submitTaskProof } from '@/lib/actions/kids-tasks'

interface TaskCompletionModalProps {
  task: KidsTask
  childId: string
  onClose: () => void
}

type Step = 'confirm' | 'camera' | 'preview' | 'sending' | 'success'

export function TaskCompletionModal({ task, childId, onClose }: TaskCompletionModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('confirm')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStep('camera')
    } catch (err) {
      console.error('Erreur caméra:', err)
      setError('Impossible d\'accéder à la caméra. Vérifie les permissions.')
    }
  }

  // Prendre la photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Définir la taille du canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dessiner l'image
    ctx.drawImage(video, 0, 0)

    // Convertir en data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setPhotoUrl(dataUrl)

    // Arrêter le stream
    stopCamera()

    setStep('preview')
  }

  // Arrêter la caméra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // Reprendre la photo
  const retakePhoto = () => {
    setPhotoUrl(null)
    startCamera()
  }

  // Envoyer la preuve
  const sendProof = () => {
    if (!photoUrl) return

    setStep('sending')
    startTransition(async () => {
      try {
        // TODO: Upload vers S3 et récupérer l'URL
        // Pour l'instant, on simule avec le data URL
        const result = await submitTaskProof(task.id, photoUrl)

        if (result.success) {
          setStep('success')
          // Rafraîchir la page après un délai
          setTimeout(() => {
            router.refresh()
            onClose()
          }, 2000)
        } else {
          setError(result.error ?? 'Erreur lors de l\'envoi')
          setStep('preview')
        }
      } catch (err) {
        setError('Erreur lors de l\'envoi')
        setStep('preview')
      }
    })
  }

  // Fermer le modal (et arrêter la caméra si active)
  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Étape: Confirmation */}
        {step === 'confirm' && (
          <div className="p-6 text-center">
            <div className="text-5xl mb-4">{task.category_icon ?? '📋'}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {task.title}
            </h2>
            <p className="text-gray-500 mb-6">
              Tu as fini cette mission ? Prends une photo pour prouver !
            </p>
            <div className="bg-pink-50 rounded-2xl p-4 mb-6">
              <span className="text-pink-600 font-bold text-lg">
                +{task.xp_value} XP
              </span>
            </div>

            {error && (
              <div className="bg-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={startCamera}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
              >
                📷 Prendre photo
              </button>
            </div>
          </div>
        )}

        {/* Étape: Caméra */}
        {step === 'camera' && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay instructions */}
            <div className="absolute top-4 left-0 right-0 text-center">
              <span className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                Cadre bien ta preuve photo 📸
              </span>
            </div>

            {/* Bouton capture */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button
                onClick={takePhoto}
                className="w-20 h-20 bg-white rounded-full border-4 border-pink-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 bg-pink-500 rounded-full" />
              </button>
            </div>

            {/* Bouton fermer */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}

        {/* Étape: Preview */}
        {step === 'preview' && photoUrl && (
          <div>
            <img
              src={photoUrl}
              alt="Photo preuve"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">
                Photo parfaite ? 📸
              </h3>

              {error && (
                <div className="bg-red-100 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  disabled={isPending}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  🔄 Refaire
                </button>
                <button
                  onClick={sendProof}
                  disabled={isPending}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  ✓ Envoyer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Étape: Envoi */}
        {step === 'sending' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800">
              Envoi en cours...
            </h3>
            <p className="text-gray-500 mt-2">
              Ta photo est envoyée à tes parents
            </p>
          </div>
        )}

        {/* Étape: Succès */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              C&apos;est envoyé !
            </h3>
            <p className="text-gray-500">
              Tes parents vont valider ta mission
            </p>
            <div className="bg-green-50 rounded-2xl p-4 mt-4">
              <span className="text-green-600 font-medium">
                +{task.xp_value} XP en attente
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
