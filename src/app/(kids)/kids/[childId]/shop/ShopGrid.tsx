'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { RewardWithRedemptions } from '@/lib/actions/kids-rewards'
import { redeemReward } from '@/lib/actions/kids-rewards'
import { useGameSound } from '@/hooks/useGameSound'

interface ShopGridProps {
  rewards: RewardWithRedemptions[]
  currentXp: number
  childId: string
}

const rewardTypeLabels: Record<string, string> = {
  screen_time: 'Temps d\'écran',
  money: 'Argent',
  privilege: 'Privilège',
  custom: 'Autre',
}

export function ShopGrid({ rewards, currentXp, childId }: ShopGridProps) {
  const router = useRouter()
  const [selectedReward, setSelectedReward] = useState<RewardWithRedemptions | null>(null)
  const [isPending, startTransition] = useTransition()
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [xp, setXp] = useState(currentXp)
  const { play } = useGameSound()

  const handlePurchase = () => {
    if (!selectedReward || isPending) return

    setError(null)
    startTransition(async () => {
      const result = await redeemReward(selectedReward.id)

      if (result.success && result.data) {
        setXp(result.data.remainingXp)
        setPurchaseSuccess(true)

        // Son d'achat
        play('purchase')

        // Confettis !
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#EC4899', '#F97316', '#FBBF24'],
        })

        // Fermer après délai
        setTimeout(() => {
          setPurchaseSuccess(false)
          setSelectedReward(null)
          router.refresh()
        }, 2500)
      } else {
        // Son d'erreur
        play('error')
        setError(result.error ?? 'Erreur lors de l\'échange')
      }
    })
  }

  const handleSelectReward = (reward: RewardWithRedemptions) => {
    play('click')
    setSelectedReward(reward)
  }

  const canAfford = (reward: RewardWithRedemptions): boolean => {
    return xp >= reward.xp_cost
  }

  const isLimitReached = (reward: RewardWithRedemptions): boolean => {
    if (reward.max_redemptions_per_week === null) return false
    return Number(reward.redemptions_this_week) >= reward.max_redemptions_per_week
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {rewards.map((reward, index) => {
          const affordable = canAfford(reward)
          const limitReached = isLimitReached(reward)
          const available = affordable && !limitReached

          return (
            <motion.button
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: available ? 0.95 : 1 }}
              onClick={() => available && handleSelectReward(reward)}
              disabled={!available}
              className={`relative bg-white rounded-2xl p-4 shadow-md text-left transition-all ${
                available
                  ? 'hover:shadow-lg'
                  : 'opacity-60 cursor-not-allowed'
              }`}
            >
              {/* Badge limite atteinte */}
              {limitReached && (
                <div className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                  Limite
                </div>
              )}

              {/* Icône */}
              <div className="text-4xl mb-2">{reward.icon}</div>

              {/* Nom */}
              <h3 className="font-semibold text-gray-800 mb-1 truncate">
                {reward.name}
              </h3>

              {/* Type */}
              <p className="text-xs text-gray-500 mb-2">
                {rewardTypeLabels[reward.reward_type] ?? reward.reward_type}
              </p>

              {/* Détails selon le type */}
              {reward.reward_type === 'screen_time' && reward.screen_time_minutes && (
                <p className="text-sm text-blue-600 mb-2">
                  ⏱️ {reward.screen_time_minutes} min
                </p>
              )}
              {reward.reward_type === 'money' && reward.money_amount && (
                <p className="text-sm text-green-600 mb-2">
                  💰 {Number(reward.money_amount).toFixed(2)}€
                </p>
              )}

              {/* Coût */}
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                affordable
                  ? 'bg-pink-100 text-pink-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {reward.xp_cost} XP
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Modal de confirmation */}
      <AnimatePresence>
        {selectedReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => !isPending && !purchaseSuccess && setSelectedReward(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {purchaseSuccess ? (
                // État succès
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                >
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Bravo !
                  </h3>
                  <p className="text-gray-600">
                    Ta demande a été envoyée à tes parents !
                  </p>
                </motion.div>
              ) : (
                // État confirmation
                <>
                  <div className="text-6xl mb-4">{selectedReward.icon}</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {selectedReward.name}
                  </h3>
                  {selectedReward.description && (
                    <p className="text-gray-500 mb-4">{selectedReward.description}</p>
                  )}

                  <div className="bg-gray-100 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Coût</span>
                      <span className="text-pink-600 font-bold">
                        {selectedReward.xp_cost} XP
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-600">Après achat</span>
                      <span className="text-gray-800 font-bold">
                        {xp - selectedReward.xp_cost} XP
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-100 text-red-600 text-sm p-3 rounded-xl mb-4">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedReward(null)}
                      disabled={isPending}
                      className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handlePurchase}
                      disabled={isPending}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isPending ? 'Envoi...' : 'Échanger !'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
