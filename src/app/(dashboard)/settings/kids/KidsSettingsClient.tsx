'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Gift,
  Clock,
  Banknote,
  Star,
  CheckCircle2,
  XCircle,
  Truck,
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import {
  approveTaskProof,
  rejectTaskProof,
} from '@/lib/actions/kids-tasks'
import {
  approveRedemption,
  rejectRedemption,
  deliverRedemption,
  createReward,
  updateReward,
  deleteReward,
} from '@/lib/actions/kids-rewards'
import type { TaskProof, Reward } from '@/types/database'
import type { RewardWithRedemptions, RedemptionWithDetails } from '@/lib/actions/kids-rewards'

interface KidsSettingsClientProps {
  pendingProofs: Array<TaskProof & { task_title: string; child_name: string; child_avatar: string | null }>
  pendingRedemptions: RedemptionWithDetails[]
  rewards: RewardWithRedemptions[]
}

type TabType = 'proofs' | 'redemptions' | 'rewards'

const rewardTypeIcons = {
  screen_time: Clock,
  money: Banknote,
  privilege: Star,
  custom: Gift,
} as const

const rewardTypeLabels = {
  screen_time: 'Temps d\'écran',
  money: 'Argent',
  privilege: 'Privilège',
  custom: 'Autre',
} as const

function getRewardTypeIcon(type: string) {
  return rewardTypeIcons[type as keyof typeof rewardTypeIcons] ?? Gift
}

function getRewardTypeLabel(type: string) {
  return rewardTypeLabels[type as keyof typeof rewardTypeLabels] ?? type
}

export function KidsSettingsClient({
  pendingProofs: initialProofs,
  pendingRedemptions: initialRedemptions,
  rewards: initialRewards,
}: KidsSettingsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabType>('proofs')
  const [pendingProofs, setPendingProofs] = useState(initialProofs)
  const [pendingRedemptions, setPendingRedemptions] = useState(initialRedemptions)
  const [rewards, setRewards] = useState(initialRewards)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal states
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<{ type: 'proof' | 'redemption'; id: string } | null>(null)

  const showMessage = (msg: string, type: 'error' | 'success') => {
    if (type === 'error') {
      setError(msg)
      setTimeout(() => setError(null), 3000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // ==========================
  // PROOFS HANDLERS
  // ==========================
  const handleApproveProof = (proofId: string) => {
    startTransition(async () => {
      const result = await approveTaskProof(proofId, 'parent')
      if (result.success) {
        setPendingProofs(prev => prev.filter(p => p.id !== proofId))
        showMessage('Tâche validée ! XP accordés.', 'success')
        router.refresh()
      } else {
        showMessage(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const handleRejectProof = (proofId: string) => {
    if (!rejectReason.trim()) {
      showMessage('Veuillez indiquer une raison', 'error')
      return
    }

    startTransition(async () => {
      const result = await rejectTaskProof(proofId, 'parent', rejectReason)
      if (result.success) {
        setPendingProofs(prev => prev.filter(p => p.id !== proofId))
        setShowRejectModal(null)
        setRejectReason('')
        showMessage('Tâche refusée', 'success')
        router.refresh()
      } else {
        showMessage(result.error ?? 'Erreur', 'error')
      }
    })
  }

  // ==========================
  // REDEMPTIONS HANDLERS
  // ==========================
  const handleApproveRedemption = (redemptionId: string) => {
    startTransition(async () => {
      const result = await approveRedemption(redemptionId)
      if (result.success) {
        setPendingRedemptions(prev =>
          prev.map(r => r.id === redemptionId ? { ...r, status: 'approved' as const } : r)
        )
        showMessage('Récompense approuvée !', 'success')
        router.refresh()
      } else {
        showMessage(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const handleDeliverRedemption = (redemptionId: string) => {
    startTransition(async () => {
      const result = await deliverRedemption(redemptionId)
      if (result.success) {
        setPendingRedemptions(prev => prev.filter(r => r.id !== redemptionId))
        showMessage('Récompense livrée !', 'success')
        router.refresh()
      } else {
        showMessage(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const handleRejectRedemption = (redemptionId: string) => {
    if (!rejectReason.trim()) {
      showMessage('Veuillez indiquer une raison', 'error')
      return
    }

    startTransition(async () => {
      const result = await rejectRedemption(redemptionId, rejectReason)
      if (result.success) {
        setPendingRedemptions(prev => prev.filter(r => r.id !== redemptionId))
        setShowRejectModal(null)
        setRejectReason('')
        showMessage('Récompense refusée, XP remboursés', 'success')
        router.refresh()
      } else {
        showMessage(result.error ?? 'Erreur', 'error')
      }
    })
  }

  // ==========================
  // REWARDS HANDLERS
  // ==========================
  const handleDeleteReward = (rewardId: string) => {
    if (!confirm('Supprimer cette récompense ?')) return

    startTransition(async () => {
      const result = await deleteReward(rewardId)
      if (result.success) {
        setRewards(prev => prev.filter(r => r.id !== rewardId))
        showMessage('Récompense supprimée', 'success')
      } else {
        showMessage(result.error ?? 'Erreur', 'error')
      }
    })
  }

  const totalPending = pendingProofs.length + pendingRedemptions.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Espace Enfants</h1>
        <p className="text-gray-500 mt-1">
          Validez les tâches et gérez les récompenses
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('proofs')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'proofs'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tâches à valider
          {pendingProofs.length > 0 && (
            <span className="ml-2 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingProofs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('redemptions')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'redemptions'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Récompenses demandées
          {pendingRedemptions.length > 0 && (
            <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingRedemptions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'rewards'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Gérer la boutique
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* PROOFS TAB */}
        {activeTab === 'proofs' && (
          <div className="space-y-4">
            {pendingProofs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune tâche en attente de validation</p>
              </div>
            ) : (
              pendingProofs.map((proof) => (
                <div
                  key={proof.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    {/* Photo preview */}
                    <button
                      onClick={() => proof.photo_url && setShowPhotoModal(proof.photo_url)}
                      className="relative w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {proof.photo_url ? (
                        <Image
                          src={proof.photo_url}
                          alt="Preuve"
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {proof.child_avatar ? (
                          <Image
                            src={proof.child_avatar}
                            alt={proof.child_name}
                            width={24}
                            height={24}
                            className="rounded-full"
                            unoptimized
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-xs font-medium text-pink-600">
                            {proof.child_name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-700">
                          {proof.child_name}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {proof.task_title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(proof.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-pink-600 font-medium mt-1">
                        +{proof.xp_awarded ?? 0} XP
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveProof(proof.id)}
                        disabled={isPending}
                        className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
                        title="Valider"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowRejectModal({ type: 'proof', id: proof.id })}
                        disabled={isPending}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                        title="Refuser"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* REDEMPTIONS TAB */}
        {activeTab === 'redemptions' && (
          <div className="space-y-4">
            {pendingRedemptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune récompense en attente</p>
              </div>
            ) : (
              pendingRedemptions.map((redemption) => {
                const Icon = getRewardTypeIcon(
                  (redemption.reward_snapshot as { reward_type?: string })?.reward_type ?? 'custom'
                )
                const isApproved = redemption.status === 'approved'

                return (
                  <div
                    key={redemption.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">{redemption.reward_icon}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {redemption.child_avatar ? (
                            <Image
                              src={redemption.child_avatar}
                              alt={redemption.child_name}
                              width={24}
                              height={24}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-xs font-medium text-pink-600">
                              {redemption.child_name.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-gray-700">
                            {redemption.child_name}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {redemption.reward_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(redemption.requested_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm text-orange-600 font-medium">
                          {redemption.xp_spent} XP dépensés
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!isApproved && (
                          <>
                            <button
                              onClick={() => handleApproveRedemption(redemption.id)}
                              disabled={isPending}
                              className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
                              title="Approuver"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setShowRejectModal({ type: 'redemption', id: redemption.id })}
                              disabled={isPending}
                              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                              title="Refuser"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeliverRedemption(redemption.id)}
                          disabled={isPending}
                          className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors disabled:opacity-50"
                          title="Marquer comme livré"
                        >
                          <Truck className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setEditingReward(null)
                setShowRewardModal(true)
              }}
              className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-pink-300 hover:text-pink-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une récompense
            </button>

            {rewards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune récompense configurée</p>
                <p className="text-sm">Créez des récompenses pour motiver vos enfants !</p>
              </div>
            ) : (
              rewards.map((reward) => {
                const Icon = getRewardTypeIcon(reward.reward_type)

                return (
                  <div
                    key={reward.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">{reward.icon}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Icon className="w-4 h-4" />
                            {getRewardTypeLabel(reward.reward_type)}
                          </span>
                          <span className="text-pink-600 font-medium">
                            {reward.xp_cost} XP
                          </span>
                        </div>
                        {reward.max_redemptions_per_week && (
                          <p className="text-xs text-gray-400 mt-1">
                            Max {reward.max_redemptions_per_week}/semaine
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingReward(reward)
                            setShowRewardModal(true)
                          }}
                          className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReward(reward.id)}
                          disabled={isPending}
                          className="p-2 rounded-lg bg-gray-100 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(null)}
        >
          <div className="relative max-w-full max-h-[80vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={showPhotoModal}
              alt="Preuve"
              fill
              className="object-contain rounded-xl"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Raison du refus
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Expliquez pourquoi..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectReason('')
                }}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (showRejectModal.type === 'proof') {
                    handleRejectProof(showRejectModal.id)
                  } else {
                    handleRejectRedemption(showRejectModal.id)
                  }
                }}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Envoi...' : 'Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reward Modal */}
      {showRewardModal && (
        <RewardModal
          reward={editingReward}
          onClose={() => {
            setShowRewardModal(false)
            setEditingReward(null)
          }}
          onSave={(reward) => {
            if (editingReward) {
              setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, ...reward } : r))
            } else {
              setRewards(prev => [{ ...reward, redemptions_this_week: 0 }, ...prev])
            }
            setShowRewardModal(false)
            setEditingReward(null)
          }}
        />
      )}
    </div>
  )
}

// ==========================
// REWARD MODAL COMPONENT
// ==========================

interface RewardModalProps {
  reward: Reward | null
  onClose: () => void
  onSave: (reward: Reward) => void
}

function RewardModal({ reward, onClose, onSave }: RewardModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(reward?.name ?? '')
  const [description, setDescription] = useState(reward?.description ?? '')
  const [xpCost, setXpCost] = useState(reward?.xp_cost ?? 50)
  const [rewardType, setRewardType] = useState<'screen_time' | 'money' | 'privilege' | 'custom'>(
    (reward?.reward_type as 'screen_time' | 'money' | 'privilege' | 'custom') ?? 'privilege'
  )
  const [icon, setIcon] = useState(reward?.icon ?? '🎁')
  const [screenTimeMinutes, setScreenTimeMinutes] = useState(reward?.screen_time_minutes ?? 30)
  const [moneyAmount, setMoneyAmount] = useState(Number(reward?.money_amount) || 5)
  const [maxPerWeek, setMaxPerWeek] = useState(reward?.max_redemptions_per_week ?? undefined)

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Le nom est requis')
      return
    }

    startTransition(async () => {
      try {
        if (reward) {
          // Update
          const result = await updateReward({
            id: reward.id,
            name,
            description: description || undefined,
            xpCost,
            rewardType,
            icon,
            screenTimeMinutes: rewardType === 'screen_time' ? screenTimeMinutes : undefined,
            moneyAmount: rewardType === 'money' ? moneyAmount : undefined,
            maxRedemptionsPerWeek: maxPerWeek,
          })

          if (result.success && result.data) {
            onSave(result.data)
          } else {
            setError(result.error ?? 'Erreur')
          }
        } else {
          // Create
          const result = await createReward({
            name,
            description: description || undefined,
            xpCost,
            rewardType,
            icon,
            screenTimeMinutes: rewardType === 'screen_time' ? screenTimeMinutes : undefined,
            moneyAmount: rewardType === 'money' ? moneyAmount : undefined,
            maxRedemptionsPerWeek: maxPerWeek,
          })

          if (result.success && result.data) {
            onSave(result.data)
          } else {
            setError(result.error ?? 'Erreur')
          }
        }
      } catch {
        setError('Erreur lors de la sauvegarde')
      }
    })
  }

  const icons = ['🎁', '🎮', '📱', '🎬', '🍕', '🍦', '⭐', '🎯', '🎨', '🎪', '🎭', '💰']

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          {reward ? 'Modifier la récompense' : 'Nouvelle récompense'}
        </h3>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icône
            </label>
            <div className="flex flex-wrap gap-2">
              {icons.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all ${
                    icon === i
                      ? 'bg-pink-100 ring-2 ring-pink-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: 30 min de jeux vidéo"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails optionnels..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(rewardTypeLabels) as Array<keyof typeof rewardTypeLabels>).map((type) => {
                const Icon = rewardTypeIcons[type]
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRewardType(type)}
                    className={`py-3 px-4 rounded-xl flex items-center gap-2 transition-all ${
                      rewardType === type
                        ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{rewardTypeLabels[type]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type-specific fields */}
          {rewardType === 'screen_time' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (minutes)
              </label>
              <input
                type="number"
                value={screenTimeMinutes}
                onChange={(e) => setScreenTimeMinutes(Number(e.target.value))}
                min={5}
                max={480}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          )}

          {rewardType === 'money' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (€)
              </label>
              <input
                type="number"
                value={moneyAmount}
                onChange={(e) => setMoneyAmount(Number(e.target.value))}
                min={0.01}
                max={100}
                step={0.01}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          )}

          {/* XP Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coût en XP
            </label>
            <input
              type="number"
              value={xpCost}
              onChange={(e) => setXpCost(Number(e.target.value))}
              min={1}
              max={10000}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Max per week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite par semaine (optionnel)
            </label>
            <input
              type="number"
              value={maxPerWeek ?? ''}
              onChange={(e) => setMaxPerWeek(e.target.value ? Number(e.target.value) : undefined)}
              min={1}
              max={100}
              placeholder="Illimité"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Enregistrement...' : reward ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}
