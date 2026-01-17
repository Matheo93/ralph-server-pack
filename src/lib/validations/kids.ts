import { z } from 'zod'

// ============================================================
// KIDS INTERFACE VALIDATIONS
// ============================================================

// PIN validation (4 chiffres)
export const pinSchema = z
  .string()
  .length(4, 'Le PIN doit contenir exactement 4 chiffres')
  .regex(/^\d{4}$/, 'Le PIN doit contenir uniquement des chiffres')

// Create child account
export const createChildAccountSchema = z.object({
  childId: z.string().uuid('ID enfant invalide'),
  pin: pinSchema,
  confirmPin: pinSchema,
}).refine((data) => data.pin === data.confirmPin, {
  message: 'Les PIN ne correspondent pas',
  path: ['confirmPin'],
})

// Verify PIN
export const verifyPinSchema = z.object({
  childId: z.string().uuid('ID enfant invalide'),
  pin: pinSchema,
})

// Update PIN
export const updatePinSchema = z.object({
  childId: z.string().uuid('ID enfant invalide'),
  currentPin: pinSchema,
  newPin: pinSchema,
  confirmNewPin: pinSchema,
}).refine((data) => data.newPin === data.confirmNewPin, {
  message: 'Les nouveaux PIN ne correspondent pas',
  path: ['confirmNewPin'],
}).refine((data) => data.currentPin !== data.newPin, {
  message: 'Le nouveau PIN doit être différent de l\'ancien',
  path: ['newPin'],
})

// Reset PIN (by parent)
export const resetPinSchema = z.object({
  childId: z.string().uuid('ID enfant invalide'),
  newPin: pinSchema,
  confirmNewPin: pinSchema,
}).refine((data) => data.newPin === data.confirmNewPin, {
  message: 'Les PIN ne correspondent pas',
  path: ['confirmNewPin'],
})

// Task proof submission
export const submitTaskProofSchema = z.object({
  taskId: z.string().uuid('ID tâche invalide'),
  childId: z.string().uuid('ID enfant invalide'),
  photoUrl: z.string().url('URL de photo invalide'),
})

// Validate task proof (by parent)
export const validateTaskProofSchema = z.object({
  proofId: z.string().uuid('ID preuve invalide'),
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500, 'Raison trop longue').optional(),
}).refine(
  (data) => data.status !== 'rejected' || (data.rejectionReason && data.rejectionReason.length > 0),
  {
    message: 'Une raison est requise pour un refus',
    path: ['rejectionReason'],
  }
)

// Base reward schema (without refinements for partial usage)
const rewardBaseSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  xpCost: z
    .number()
    .int('Le coût doit être un nombre entier')
    .min(1, 'Le coût minimum est de 1 XP')
    .max(10000, 'Le coût maximum est de 10000 XP'),
  rewardType: z.enum(['screen_time', 'money', 'privilege', 'custom']),
  icon: z.string().max(50).optional().default('🎁'),
  screenTimeMinutes: z
    .number()
    .int()
    .min(5, 'Minimum 5 minutes')
    .max(480, 'Maximum 8 heures')
    .optional(),
  moneyAmount: z
    .number()
    .min(0.01, 'Montant minimum de 0.01€')
    .max(100, 'Montant maximum de 100€')
    .optional(),
  maxRedemptionsPerWeek: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
})

// Create reward with refinements
export const createRewardSchema = rewardBaseSchema.refine(
  (data) => {
    if (data.rewardType === 'screen_time') {
      return data.screenTimeMinutes !== undefined && data.screenTimeMinutes > 0
    }
    return true
  },
  {
    message: 'La durée de temps d\'écran est requise',
    path: ['screenTimeMinutes'],
  }
).refine(
  (data) => {
    if (data.rewardType === 'money') {
      return data.moneyAmount !== undefined && data.moneyAmount > 0
    }
    return true
  },
  {
    message: 'Le montant est requis',
    path: ['moneyAmount'],
  }
)

// Update reward (using base schema without refinements)
export const updateRewardSchema = rewardBaseSchema.partial().extend({
  id: z.string().uuid('ID récompense invalide'),
})

// Redeem reward
export const redeemRewardSchema = z.object({
  rewardId: z.string().uuid('ID récompense invalide'),
  childId: z.string().uuid('ID enfant invalide'),
})

// Validate reward redemption
export const validateRedemptionSchema = z.object({
  redemptionId: z.string().uuid('ID échange invalide'),
  status: z.enum(['approved', 'rejected', 'delivered']),
  rejectionReason: z.string().max(500, 'Raison trop longue').optional(),
}).refine(
  (data) => data.status !== 'rejected' || (data.rejectionReason && data.rejectionReason.length > 0),
  {
    message: 'Une raison est requise pour un refus',
    path: ['rejectionReason'],
  }
)

// Mark badge as seen
export const markBadgeSeenSchema = z.object({
  childId: z.string().uuid('ID enfant invalide'),
  badgeId: z.string().uuid('ID badge invalide'),
})

// Types inférés
export type CreateChildAccountInput = z.infer<typeof createChildAccountSchema>
export type VerifyPinInput = z.infer<typeof verifyPinSchema>
export type UpdatePinInput = z.infer<typeof updatePinSchema>
export type ResetPinInput = z.infer<typeof resetPinSchema>
export type SubmitTaskProofInput = z.infer<typeof submitTaskProofSchema>
export type ValidateTaskProofInput = z.infer<typeof validateTaskProofSchema>
export type CreateRewardInput = z.infer<typeof createRewardSchema>
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>
export type ValidateRedemptionInput = z.infer<typeof validateRedemptionSchema>
export type MarkBadgeSeenInput = z.infer<typeof markBadgeSeenSchema>

// ============================================================
// XP CALCULATION HELPERS
// ============================================================

// XP attribué par tâche basé sur la charge (load_weight)
export function calculateTaskXp(loadWeight: number): number {
  // Base: 5 XP * load_weight (1-5)
  // Charge 1 = 5 XP, Charge 5 = 25 XP
  return Math.max(5, loadWeight * 5)
}

// Bonus XP pour streak
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays < 3) return 0
  if (streakDays < 7) return 5
  if (streakDays < 14) return 10
  if (streakDays < 30) return 20
  return 30
}

// Vérifie si c'est un "early bird" (avant 9h)
export function isEarlyBird(date: Date = new Date()): boolean {
  return date.getHours() < 9
}

// Vérifie si c'est un "night owl" (après 20h)
export function isNightOwl(date: Date = new Date()): boolean {
  return date.getHours() >= 20
}

// Vérifie si c'est le weekend
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}
