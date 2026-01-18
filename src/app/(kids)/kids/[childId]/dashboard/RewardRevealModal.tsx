"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles, Coins, Trophy, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import Confetti from "react-confetti"

interface RewardRevealModalProps {
  isOpen: boolean
  onClose: () => void
  taskTitle: string
  rewardType: "xp" | "immediate"
  xpAmount: number
  immediateText: string | null
  levelUp: boolean
  newLevel?: number
  newLevelName?: string
}

export function RewardRevealModal({
  isOpen,
  onClose,
  taskTitle,
  rewardType,
  xpAmount,
  immediateText,
  levelUp,
  newLevel,
  newLevelName,
}: RewardRevealModalProps) {
  const [chestOpen, setChestOpen] = useState(false)
  const [showReward, setShowReward] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [xpCounter, setXpCounter] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setChestOpen(false)
      setShowReward(false)
      setShowConfetti(false)
      setXpCounter(0)

      // Séquence d'animation
      const timer1 = setTimeout(() => {
        setChestOpen(true)
        setShowConfetti(true)
      }, 500)

      const timer2 = setTimeout(() => {
        setShowReward(true)
      }, 1500)

      // Animation compteur XP
      if (rewardType === "xp") {
        const timer3 = setTimeout(() => {
          const duration = 1000
          const steps = 20
          const increment = xpAmount / steps
          let current = 0

          const interval = setInterval(() => {
            current += increment
            if (current >= xpAmount) {
              setXpCounter(xpAmount)
              clearInterval(interval)
            } else {
              setXpCounter(Math.floor(current))
            }
          }, duration / steps)

          return () => clearInterval(interval)
        }, 2000)

        return () => clearTimeout(timer3)
      }

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [isOpen, xpAmount, rewardType])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-b from-purple-900/90 to-indigo-900/90 flex items-center justify-center p-4"
        >
          {/* Confetti */}
          {showConfetti && (
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={300}
              gravity={0.3}
            />
          )}

          {/* Background stars */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  delay: Math.random() * 2,
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 3,
                }}
                className="absolute text-yellow-300"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              >
                ✨
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.5 }}
            className="relative z-10 text-center max-w-sm"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Titre tâche */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6"
            >
              <p className="text-white/80 text-sm">Mission accomplie!</p>
              <h2 className="text-white text-xl font-bold">{taskTitle}</h2>
            </motion.div>

            {/* Coffre au trésor */}
            <div className="relative inline-block mb-8">
              {/* Lueur derrière le coffre */}
              <motion.div
                animate={{
                  scale: chestOpen ? [1, 1.5, 1.2] : 1,
                  opacity: chestOpen ? [0, 0.8, 0.5] : 0,
                }}
                transition={{ duration: 1 }}
                className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl"
              />

              {/* Coffre */}
              <motion.div
                animate={{
                  rotateX: chestOpen ? -30 : 0,
                }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="relative"
              >
                {/* Couvercle */}
                <motion.div
                  animate={{
                    rotateX: chestOpen ? -120 : 0,
                    y: chestOpen ? -20 : 0,
                  }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  style={{ transformOrigin: "top" }}
                  className="relative z-20"
                >
                  <div className="text-8xl">
                    {chestOpen ? "" : "📦"}
                  </div>
                </motion.div>

                {/* Coffre ouvert avec lumière */}
                {chestOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-8xl"
                  >
                    🎁
                  </motion.div>
                )}
              </motion.div>

              {/* Rayons de lumière */}
              {chestOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                      className="absolute w-1 h-32 bg-gradient-to-t from-yellow-400 to-transparent"
                      style={{
                        transform: `rotate(${i * 45}deg)`,
                        transformOrigin: "bottom",
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {/* Contenu de la récompense */}
            <AnimatePresence>
              {showReward && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="space-y-4"
                >
                  {rewardType === "xp" ? (
                    /* Récompense XP */
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-6 shadow-2xl">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <Coins className="w-10 h-10 text-yellow-900" />
                        <span className="text-5xl font-black text-yellow-900">
                          +{xpCounter}
                        </span>
                        <span className="text-2xl font-bold text-yellow-900">XP</span>
                      </div>
                      <p className="text-yellow-900/80">
                        Bravo, tu progresses!
                      </p>
                    </div>
                  ) : (
                    /* Récompense immédiate */
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-6 shadow-2xl">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles className="w-8 h-8 text-white" />
                        <span className="text-2xl font-bold text-white">
                          Ta récompense!
                        </span>
                      </div>
                      <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                        <p className="text-xl font-bold text-white">
                          {immediateText || "🎉 Félicitations!"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Level Up */}
                  {levelUp && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-2xl"
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Trophy className="w-8 h-8 text-yellow-300" />
                        <span className="text-2xl font-bold text-white">
                          LEVEL UP!
                        </span>
                        <Trophy className="w-8 h-8 text-yellow-300" />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                        <span className="text-3xl font-black text-white">
                          Niveau {newLevel}
                        </span>
                        <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                      </div>
                      {newLevelName && (
                        <p className="text-white/80 mt-1">{newLevelName}</p>
                      )}
                    </motion.div>
                  )}

                  {/* Bouton fermer */}
                  <Button
                    onClick={onClose}
                    className="w-full h-14 text-lg bg-white text-purple-700 hover:bg-gray-100 rounded-2xl font-bold"
                  >
                    Super! 🎉
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
