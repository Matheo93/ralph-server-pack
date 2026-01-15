/**
 * Subscription Service
 *
 * Manages subscription status, trial periods, and premium features.
 */

import { query, queryOne } from "@/lib/aws/database"

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionPlan = "free" | "premium"
export type SubscriptionStatusType = "active" | "trial" | "past_due" | "cancelled" | "none"

export interface HouseholdSubscription {
  householdId: string
  plan: SubscriptionPlan
  status: SubscriptionStatusType
  subscriptionEndsAt: Date | null
  trialEndsAt: Date | null
  isActive: boolean
  isPremium: boolean
  canUsePremiumFeatures: boolean
  daysRemaining: number | null
}

export interface PremiumFeature {
  id: string
  name: string
  description: string
  requiresPremium: boolean
}

// ============================================================================
// PREMIUM FEATURES
// ============================================================================

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: "unlimited_children",
    name: "Enfants illimités",
    description: "Ajoutez autant d'enfants que vous le souhaitez",
    requiresPremium: true,
  },
  {
    id: "auto_tasks",
    name: "Tâches automatiques",
    description: "Génération automatique de tâches selon l'âge",
    requiresPremium: true,
  },
  {
    id: "unlimited_voice",
    name: "Commandes vocales illimitées",
    description: "Créez des tâches par la voix sans limite",
    requiresPremium: true,
  },
  {
    id: "full_history",
    name: "Historique complet",
    description: "Accédez à tout l'historique de votre foyer",
    requiresPremium: true,
  },
  {
    id: "streak_joker",
    name: "Joker streak",
    description: "Sauvez votre streak une fois par mois",
    requiresPremium: true,
  },
  {
    id: "pdf_export",
    name: "Export PDF",
    description: "Exportez vos données en PDF",
    requiresPremium: true,
  },
  {
    id: "priority_support",
    name: "Support prioritaire",
    description: "Réponse rapide du support",
    requiresPremium: true,
  },
]

// Free plan limits
export const FREE_PLAN_LIMITS = {
  maxChildren: 2,
  maxVoiceCommandsPerDay: 5,
  historyDays: 7,
  canUseAutoTasks: false,
  canUseStreakJoker: false,
  canExportPdf: false,
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Get subscription status for a household
 */
export async function getHouseholdSubscription(
  householdId: string
): Promise<HouseholdSubscription> {
  const household = await queryOne<{
    subscription_status: string | null
    subscription_ends_at: string | null
  }>(`
    SELECT subscription_status, subscription_ends_at
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household) {
    return {
      householdId,
      plan: "free",
      status: "none",
      subscriptionEndsAt: null,
      trialEndsAt: null,
      isActive: true,
      isPremium: false,
      canUsePremiumFeatures: false,
      daysRemaining: null,
    }
  }

  const status = mapStatusString(household.subscription_status)
  const subscriptionEndsAt = household.subscription_ends_at
    ? new Date(household.subscription_ends_at)
    : null

  const now = new Date()
  const isActive = status === "active" || status === "trial"
  const isPremium = isActive && subscriptionEndsAt && subscriptionEndsAt > now

  let daysRemaining: number | null = null
  if (subscriptionEndsAt) {
    daysRemaining = Math.ceil(
      (subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysRemaining < 0) daysRemaining = 0
  }

  return {
    householdId,
    plan: isPremium ? "premium" : "free",
    status,
    subscriptionEndsAt,
    trialEndsAt: status === "trial" ? subscriptionEndsAt : null,
    isActive,
    isPremium: isPremium ?? false,
    canUsePremiumFeatures: isPremium ?? false,
    daysRemaining,
  }
}

/**
 * Check if household can use a specific premium feature
 */
export async function canUseFeature(
  householdId: string,
  featureId: string
): Promise<boolean> {
  const feature = PREMIUM_FEATURES.find((f) => f.id === featureId)
  if (!feature) return false
  if (!feature.requiresPremium) return true

  const subscription = await getHouseholdSubscription(householdId)
  return subscription.canUsePremiumFeatures
}

/**
 * Check if household can add more children
 */
export async function canAddChild(householdId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxCount: number
}> {
  const subscription = await getHouseholdSubscription(householdId)

  const countResult = await queryOne<{ count: string }>(`
    SELECT COUNT(*) as count
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [householdId])

  const currentCount = parseInt(countResult?.count ?? "0", 10)

  if (subscription.isPremium) {
    return {
      allowed: true,
      currentCount,
      maxCount: Infinity,
    }
  }

  return {
    allowed: currentCount < FREE_PLAN_LIMITS.maxChildren,
    currentCount,
    maxCount: FREE_PLAN_LIMITS.maxChildren,
  }
}

/**
 * Check voice command usage for the day
 */
export async function checkVoiceCommandLimit(
  householdId: string,
  userId: string
): Promise<{
  allowed: boolean
  usedToday: number
  limit: number
}> {
  const subscription = await getHouseholdSubscription(householdId)

  // Count today's voice commands
  const countResult = await queryOne<{ count: string }>(`
    SELECT COUNT(*) as count
    FROM vocal_commands
    WHERE user_id = $1
      AND created_at >= CURRENT_DATE
  `, [userId])

  const usedToday = parseInt(countResult?.count ?? "0", 10)

  if (subscription.isPremium) {
    return {
      allowed: true,
      usedToday,
      limit: Infinity,
    }
  }

  return {
    allowed: usedToday < FREE_PLAN_LIMITS.maxVoiceCommandsPerDay,
    usedToday,
    limit: FREE_PLAN_LIMITS.maxVoiceCommandsPerDay,
  }
}

/**
 * Check if household has streak joker available
 */
export async function hasStreakJokerAvailable(
  householdId: string
): Promise<{
  available: boolean
  usedThisMonth: boolean
  requiresPremium: boolean
}> {
  const subscription = await getHouseholdSubscription(householdId)

  if (!subscription.isPremium) {
    return {
      available: false,
      usedThisMonth: false,
      requiresPremium: true,
    }
  }

  // Check if joker was used this month
  const jokerUsed = await queryOne<{ used: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM streak_jokers
      WHERE household_id = $1
        AND used_at >= DATE_TRUNC('month', CURRENT_DATE)
    ) as used
  `, [householdId])

  return {
    available: !jokerUsed?.used,
    usedThisMonth: jokerUsed?.used ?? false,
    requiresPremium: false,
  }
}

/**
 * Use streak joker for household
 */
export async function useStreakJoker(householdId: string): Promise<{
  success: boolean
  error?: string
}> {
  const jokerStatus = await hasStreakJokerAvailable(householdId)

  if (jokerStatus.requiresPremium) {
    return {
      success: false,
      error: "Le joker streak nécessite un abonnement Premium",
    }
  }

  if (!jokerStatus.available) {
    return {
      success: false,
      error: "Vous avez déjà utilisé votre joker ce mois-ci",
    }
  }

  await query(`
    INSERT INTO streak_jokers (household_id, used_at)
    VALUES ($1, NOW())
  `, [householdId])

  return { success: true }
}

/**
 * Get trial expiration warning if applicable
 */
export async function getTrialWarning(
  householdId: string
): Promise<{
  showWarning: boolean
  daysRemaining: number | null
  message: string | null
}> {
  const subscription = await getHouseholdSubscription(householdId)

  if (subscription.status !== "trial" || !subscription.daysRemaining) {
    return {
      showWarning: false,
      daysRemaining: null,
      message: null,
    }
  }

  if (subscription.daysRemaining <= 3) {
    return {
      showWarning: true,
      daysRemaining: subscription.daysRemaining,
      message:
        subscription.daysRemaining === 1
          ? "Votre essai gratuit se termine demain"
          : `Votre essai gratuit se termine dans ${subscription.daysRemaining} jours`,
    }
  }

  return {
    showWarning: false,
    daysRemaining: subscription.daysRemaining,
    message: null,
  }
}

/**
 * Grant trial extension (for customer support use)
 */
export async function grantTrialExtension(
  householdId: string,
  days: number
): Promise<{ success: boolean; newEndDate: Date | null }> {
  const subscription = await getHouseholdSubscription(householdId)

  if (!subscription.subscriptionEndsAt) {
    return { success: false, newEndDate: null }
  }

  const newEndDate = new Date(subscription.subscriptionEndsAt)
  newEndDate.setDate(newEndDate.getDate() + days)

  await query(`
    UPDATE households
    SET subscription_ends_at = $1, updated_at = NOW()
    WHERE id = $2
  `, [newEndDate.toISOString(), householdId])

  return { success: true, newEndDate }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapStatusString(status: string | null): SubscriptionStatusType {
  switch (status) {
    case "active":
      return "active"
    case "trial":
    case "trialing":
      return "trial"
    case "past_due":
      return "past_due"
    case "cancelled":
    case "canceled":
      return "cancelled"
    default:
      return "none"
  }
}
