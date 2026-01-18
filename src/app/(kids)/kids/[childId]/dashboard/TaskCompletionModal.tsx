'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
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

  // Upload vers S3 et retourne l'URL publique
  const uploadToS3 = async (dataUrl: string): Promise<string> => {
    // Convertir le data URL en blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Déterminer le content type et l'extension
    const contentType = blob.type || 'image/jpeg'
    const extension = contentType.split('/')[1] || 'jpg'
    const filename = `proof.${extension}`

    // Obtenir l'URL présignée S3
    const presignedResponse = await fetch(
      `/api/upload/task-proof?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}&taskId=${task.id}`
    )

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json()
      throw new Error(errorData.error || 'Erreur lors de la génération de l\'URL d\'upload')
    }

    const { uploadUrl, publicUrl } = await presignedResponse.json()

    // Upload vers S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': contentType,
      },
    })

    if (!uploadResponse.ok) {
      throw new Error('Erreur lors de l\'upload vers S3')
    }

    return publicUrl
  }

  // Envoyer la preuve
  const sendProof = () => {
    if (!photoUrl) return

    setStep('sending')
    startTransition(async () => {
      try {
        // Upload vers S3 et récupérer l'URL publique
        const s3Url = await uploadToS3(photoUrl)

        // Soumettre la preuve avec l'URL S3
        const result = await submitTaskProof(task.id, s3Url)

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
        console.error('Erreur upload S3:', err)
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
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

        {/* Étape: Succès avec confettis */}
        {step === 'success' && <SuccessStep xpValue={task.xp_value} />}
      </motion.div>
    </motion.div>
  )
}

// Composant séparé pour l'étape succès avec effet confettis
function SuccessStep({ xpValue }: { xpValue: number }) {
  useEffect(() => {
    // Lance les confettis au montage
    const duration = 2000
    const animationEnd = Date.now() + duration
    const colors = ['#EC4899', '#F97316', '#FBBF24', '#10B981', '#8B5CF6']

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()
      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      // Confettis des deux côtés
      confetti({
        particleCount: Math.floor(particleCount / 2),
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        startVelocity: 30,
        gravity: 0.8,
        ticks: 200,
      })
      confetti({
        particleCount: Math.floor(particleCount / 2),
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        startVelocity: 30,
        gravity: 0.8,
        ticks: 200,
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-8 text-center relative overflow-hidden">
      {/* Étoiles animées en arrière-plan */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 0.5],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.25,
            }}
            className="absolute text-xl"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
          >
            {['⭐', '✨', '🌟', '💫'][i % 4]}
          </motion.span>
        ))}
      </div>

      {/* Icône principale avec rebond */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{
          scale: [0, 1.3, 1],
          rotate: [0, 10, 0],
        }}
        transition={{
          type: 'spring',
          damping: 10,
          stiffness: 200,
        }}
        className="relative z-10"
      >
        <span className="text-7xl block mb-2">🎉</span>
      </motion.div>

      {/* Titre avec effet typing */}
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-black bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 bg-clip-text text-transparent mb-2"
      >
        Super champion ! 🏆
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-gray-600 mb-4"
      >
        Tes parents vont valider ta mission
      </motion.p>

      {/* Badge XP animé */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.7, type: 'spring' }}
        className="inline-block"
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(16, 185, 129, 0.4)',
              '0 0 0 15px rgba(16, 185, 129, 0)',
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
          className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl px-6 py-3 shadow-lg"
        >
          <span className="text-white font-black text-lg flex items-center gap-2">
            <motion.span
              animate={{ rotate: [0, 20, -20, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            >
              💎
            </motion.span>
            +{xpValue} XP en attente
          </span>
        </motion.div>
      </motion.div>

      {/* Petit message encourageant */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-sm text-gray-400 mt-4"
      >
        Continue comme ça ! 💪
      </motion.p>
    </div>
  )
}
