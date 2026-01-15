/**
 * Joker System
 *
 * Premium streak protection system:
 * - Joker token management
 * - Monthly joker allocation
 * - Streak save mechanism
 * - Joker history tracking
 */

import { z } from "zod"
import { getStartOfDay, getDaysDifference, type StreakStatus } from "./streak-engine"

// =============================================================================
// SCHEMAS
// =============================================================================

export const JokerTypeSchema = z.enum(["standard", "golden", "emergency"])

export const JokerTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: JokerTypeSchema,
  grantedAt: z.date(),
  expiresAt: z.date().nullable(),
  usedAt: z.date().nullable(),
  usedForDate: z.date().nullable(),
  source: z.enum(["monthly_allocation", "achievement", "purchase", "gift", "bonus"]),
  streakSaved: z.number().nullable(), // The streak value that was saved
})

export const JokerInventorySchema = z.object({
  userId: z.string(),
  available: z.array(JokerTokenSchema),
  used: z.array(JokerTokenSchema),
  totalReceived: z.number(),
  totalUsed: z.number(),
  nextAllocationDate: z.date().nullable(),
})

export const JokerConfigSchema = z.object({
  monthlyAllocation: z.number().min(0).default(2),
  maxStorable: z.number().min(0).default(5),
  premiumBonus: z.number().min(0).default(1),
  expirationDays: z.number().min(0).nullable().default(90),
  goldenJokerMinStreak: z.number().min(0).default(30), // Min streak to earn golden joker
  emergencyJokerCooldown: z.number().min(0).default(7), // Days between emergency joker uses
})

export const JokerUsageResultSchema = z.object({
  success: z.boolean(),
  jokerId: z.string().nullable(),
  streakPreserved: z.number(),
  message: z.string(),
  remainingJokers: z.number(),
})

export const JokerAllocationResultSchema = z.object({
  allocated: z.boolean(),
  jokersAdded: z.number(),
  newTotal: z.number(),
  overflowDropped: z.number(),
  message: z.string(),
})

// =============================================================================
// TYPES
// =============================================================================

export type JokerType = z.infer<typeof JokerTypeSchema>
export type JokerToken = z.infer<typeof JokerTokenSchema>
export type JokerInventory = z.infer<typeof JokerInventorySchema>
export type JokerConfig = z.infer<typeof JokerConfigSchema>
export type JokerUsageResult = z.infer<typeof JokerUsageResultSchema>
export type JokerAllocationResult = z.infer<typeof JokerAllocationResultSchema>

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_JOKER_CONFIG: JokerConfig = {
  monthlyAllocation: 2,
  maxStorable: 5,
  premiumBonus: 1,
  expirationDays: 90,
  goldenJokerMinStreak: 30,
  emergencyJokerCooldown: 7,
}

export const JOKER_INFO = {
  standard: {
    name: "Joker Standard",
    emoji: "🃏",
    description: "Protège votre série pendant 1 jour",
    color: "blue" as const,
  },
  golden: {
    name: "Joker Doré",
    emoji: "⭐",
    description: "Protège votre série pendant 2 jours",
    color: "gold" as const,
  },
  emergency: {
    name: "Joker d'Urgence",
    emoji: "🆘",
    description: "Peut être utilisé même après la perte de série",
    color: "red" as const,
  },
} as const

// =============================================================================
// INVENTORY MANAGEMENT
// =============================================================================

/**
 * Create empty joker inventory
 */
export function createJokerInventory(userId: string): JokerInventory {
  return {
    userId,
    available: [],
    used: [],
    totalReceived: 0,
    totalUsed: 0,
    nextAllocationDate: getNextAllocationDate(),
  }
}

/**
 * Get the next monthly allocation date (first of next month)
 */
export function getNextAllocationDate(): Date {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next
}

/**
 * Count available jokers by type
 */
export function countJokersByType(inventory: JokerInventory): Record<JokerType, number> {
  const counts: Record<JokerType, number> = {
    standard: 0,
    golden: 0,
    emergency: 0,
  }

  for (const joker of inventory.available) {
    counts[joker.type]++
  }

  return counts
}

/**
 * Get total available jokers
 */
export function getTotalAvailableJokers(inventory: JokerInventory): number {
  return inventory.available.length
}

/**
 * Create a new joker token
 */
export function createJokerToken(
  userId: string,
  type: JokerType,
  source: JokerToken["source"],
  config: JokerConfig = DEFAULT_JOKER_CONFIG
): JokerToken {
  const now = new Date()
  const expiresAt = config.expirationDays
    ? new Date(now.getTime() + config.expirationDays * 24 * 60 * 60 * 1000)
    : null

  return {
    id: `joker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    grantedAt: now,
    expiresAt,
    usedAt: null,
    usedForDate: null,
    source,
    streakSaved: null,
  }
}

/**
 * Add joker to inventory
 */
export function addJokerToInventory(
  inventory: JokerInventory,
  joker: JokerToken,
  config: JokerConfig = DEFAULT_JOKER_CONFIG
): { inventory: JokerInventory; added: boolean; reason: string } {
  if (inventory.available.length >= config.maxStorable) {
    return {
      inventory,
      added: false,
      reason: `Inventaire plein (${config.maxStorable} max)`,
    }
  }

  return {
    inventory: {
      ...inventory,
      available: [...inventory.available, joker],
      totalReceived: inventory.totalReceived + 1,
    },
    added: true,
    reason: "Joker ajouté",
  }
}

/**
 * Clean up expired jokers
 */
export function cleanupExpiredJokers(inventory: JokerInventory): {
  inventory: JokerInventory
  expiredCount: number
} {
  const now = new Date()
  const stillValid: JokerToken[] = []
  let expiredCount = 0

  for (const joker of inventory.available) {
    if (joker.expiresAt && joker.expiresAt < now) {
      expiredCount++
    } else {
      stillValid.push(joker)
    }
  }

  return {
    inventory: {
      ...inventory,
      available: stillValid,
    },
    expiredCount,
  }
}

// =============================================================================
// MONTHLY ALLOCATION
// =============================================================================

/**
 * Check if user is eligible for monthly allocation
 */
export function isEligibleForAllocation(
  inventory: JokerInventory,
  isPremium: boolean
): boolean {
  if (!inventory.nextAllocationDate) {
    return true
  }

  return new Date() >= inventory.nextAllocationDate
}

/**
 * Perform monthly joker allocation
 */
export function allocateMonthlyJokers(
  inventory: JokerInventory,
  isPremium: boolean,
  config: JokerConfig = DEFAULT_JOKER_CONFIG
): { inventory: JokerInventory; result: JokerAllocationResult } {
  if (!isEligibleForAllocation(inventory, isPremium)) {
    return {
      inventory,
      result: {
        allocated: false,
        jokersAdded: 0,
        newTotal: inventory.available.length,
        overflowDropped: 0,
        message: "Pas encore éligible pour l'allocation mensuelle",
      },
    }
  }

  const baseAllocation = config.monthlyAllocation
  const premiumBonus = isPremium ? config.premiumBonus : 0
  const totalToAdd = baseAllocation + premiumBonus

  const newJokers: JokerToken[] = []
  for (let i = 0; i < totalToAdd; i++) {
    newJokers.push(createJokerToken(inventory.userId, "standard", "monthly_allocation", config))
  }

  // Add to inventory, respecting max limit
  let addedCount = 0
  let overflowCount = 0
  let updatedInventory = inventory

  for (const joker of newJokers) {
    const result = addJokerToInventory(updatedInventory, joker, config)
    if (result.added) {
      updatedInventory = result.inventory
      addedCount++
    } else {
      overflowCount++
    }
  }

  // Update next allocation date
  updatedInventory = {
    ...updatedInventory,
    nextAllocationDate: getNextAllocationDate(),
  }

  return {
    inventory: updatedInventory,
    result: {
      allocated: true,
      jokersAdded: addedCount,
      newTotal: updatedInventory.available.length,
      overflowDropped: overflowCount,
      message:
        overflowCount > 0
          ? `${addedCount} jokers ajoutés, ${overflowCount} perdus (inventaire plein)`
          : `${addedCount} jokers ajoutés !`,
    },
  }
}

// =============================================================================
// JOKER USAGE
// =============================================================================

/**
 * Get the best joker to use for streak protection
 */
export function getBestJokerToUse(
  inventory: JokerInventory,
  streakValue: number
): JokerToken | null {
  if (inventory.available.length === 0) {
    return null
  }

  // Prioritize jokers expiring soon, then standard before golden
  const sorted = [...inventory.available].sort((a, b) => {
    // First priority: expiring soon
    if (a.expiresAt && b.expiresAt) {
      const diff = a.expiresAt.getTime() - b.expiresAt.getTime()
      if (diff !== 0) return diff
    } else if (a.expiresAt && !b.expiresAt) {
      return -1
    } else if (!a.expiresAt && b.expiresAt) {
      return 1
    }

    // Second priority: use standard before golden (save golden for better streaks)
    const typePriority = { standard: 0, golden: 1, emergency: 2 }
    return typePriority[a.type] - typePriority[b.type]
  })

  return sorted[0] ?? null
}

/**
 * Use a joker to protect streak
 */
export function useJoker(
  inventory: JokerInventory,
  streakStatus: StreakStatus,
  jokerId?: string
): { inventory: JokerInventory; result: JokerUsageResult } {
  // Check if joker is needed
  if (streakStatus.isActiveToday) {
    return {
      inventory,
      result: {
        success: false,
        jokerId: null,
        streakPreserved: streakStatus.currentStreak,
        message: "Vous êtes déjà actif aujourd'hui, pas besoin de joker !",
        remainingJokers: inventory.available.length,
      },
    }
  }

  if (streakStatus.currentStreak === 0) {
    return {
      inventory,
      result: {
        success: false,
        jokerId: null,
        streakPreserved: 0,
        message: "Pas de série à protéger.",
        remainingJokers: inventory.available.length,
      },
    }
  }

  // Find the joker to use
  let jokerToUse: JokerToken | null = null

  if (jokerId) {
    jokerToUse = inventory.available.find((j) => j.id === jokerId) ?? null
  } else {
    jokerToUse = getBestJokerToUse(inventory, streakStatus.currentStreak)
  }

  if (!jokerToUse) {
    return {
      inventory,
      result: {
        success: false,
        jokerId: null,
        streakPreserved: streakStatus.currentStreak,
        message: "Aucun joker disponible.",
        remainingJokers: 0,
      },
    }
  }

  // Use the joker
  const now = new Date()
  const usedJoker: JokerToken = {
    ...jokerToUse,
    usedAt: now,
    usedForDate: getStartOfDay(now),
    streakSaved: streakStatus.currentStreak,
  }

  const newAvailable = inventory.available.filter((j) => j.id !== jokerToUse!.id)

  return {
    inventory: {
      ...inventory,
      available: newAvailable,
      used: [...inventory.used, usedJoker],
      totalUsed: inventory.totalUsed + 1,
    },
    result: {
      success: true,
      jokerId: usedJoker.id,
      streakPreserved: streakStatus.currentStreak,
      message: `${JOKER_INFO[jokerToUse.type].emoji} Joker utilisé ! Série de ${streakStatus.currentStreak} jours protégée.`,
      remainingJokers: newAvailable.length,
    },
  }
}

/**
 * Check if joker was used for a specific date
 */
export function wasJokerUsedForDate(inventory: JokerInventory, date: Date): boolean {
  const targetDate = getStartOfDay(date)
  return inventory.used.some(
    (j) => j.usedForDate && getStartOfDay(j.usedForDate).getTime() === targetDate.getTime()
  )
}

/**
 * Get joker usage history
 */
export function getJokerHistory(
  inventory: JokerInventory,
  limit: number = 10
): Array<{
  date: Date
  type: JokerType
  streakSaved: number
  source: JokerToken["source"]
}> {
  return inventory.used
    .filter((j) => j.usedAt !== null)
    .sort((a, b) => b.usedAt!.getTime() - a.usedAt!.getTime())
    .slice(0, limit)
    .map((j) => ({
      date: j.usedAt!,
      type: j.type,
      streakSaved: j.streakSaved ?? 0,
      source: j.source,
    }))
}

// =============================================================================
// EMERGENCY JOKER
// =============================================================================

/**
 * Check if emergency joker can be used (after streak break)
 */
export function canUseEmergencyJoker(
  inventory: JokerInventory,
  lastBreakDate: Date,
  config: JokerConfig = DEFAULT_JOKER_CONFIG
): boolean {
  // Must have emergency joker
  const hasEmergency = inventory.available.some((j) => j.type === "emergency")
  if (!hasEmergency) return false

  // Check cooldown from last emergency use
  const lastEmergencyUse = inventory.used
    .filter((j) => j.type === "emergency" && j.usedAt)
    .sort((a, b) => b.usedAt!.getTime() - a.usedAt!.getTime())[0]

  if (lastEmergencyUse?.usedAt) {
    const daysSinceLastUse = getDaysDifference(lastEmergencyUse.usedAt, new Date())
    if (daysSinceLastUse < config.emergencyJokerCooldown) {
      return false
    }
  }

  // Emergency joker can only be used within 24 hours of break
  const hoursSinceBreak =
    (new Date().getTime() - lastBreakDate.getTime()) / (1000 * 60 * 60)
  return hoursSinceBreak <= 24
}

/**
 * Use emergency joker to restore broken streak
 */
export function useEmergencyJoker(
  inventory: JokerInventory,
  brokenStreak: number,
  lastBreakDate: Date,
  config: JokerConfig = DEFAULT_JOKER_CONFIG
): { inventory: JokerInventory; result: JokerUsageResult } {
  if (!canUseEmergencyJoker(inventory, lastBreakDate, config)) {
    return {
      inventory,
      result: {
        success: false,
        jokerId: null,
        streakPreserved: 0,
        message: "Joker d'urgence non disponible ou cooldown actif.",
        remainingJokers: inventory.available.length,
      },
    }
  }

  const emergencyJoker = inventory.available.find((j) => j.type === "emergency")
  if (!emergencyJoker) {
    return {
      inventory,
      result: {
        success: false,
        jokerId: null,
        streakPreserved: 0,
        message: "Aucun joker d'urgence disponible.",
        remainingJokers: inventory.available.length,
      },
    }
  }

  const now = new Date()
  const usedJoker: JokerToken = {
    ...emergencyJoker,
    usedAt: now,
    usedForDate: lastBreakDate,
    streakSaved: brokenStreak,
  }

  const newAvailable = inventory.available.filter((j) => j.id !== emergencyJoker.id)

  return {
    inventory: {
      ...inventory,
      available: newAvailable,
      used: [...inventory.used, usedJoker],
      totalUsed: inventory.totalUsed + 1,
    },
    result: {
      success: true,
      jokerId: usedJoker.id,
      streakPreserved: brokenStreak,
      message: `🆘 Joker d'urgence utilisé ! Série de ${brokenStreak} jours restaurée.`,
      remainingJokers: newAvailable.length,
    },
  }
}

// =============================================================================
// GOLDEN JOKER REWARDS
// =============================================================================

/**
 * Check if user earned a golden joker from streak milestone
 */
export function checkGoldenJokerReward(
  previousStreak: number,
  currentStreak: number,
  config: JokerConfig = DEFAULT_JOKER_CONFIG
): boolean {
  const threshold = config.goldenJokerMinStreak

  // Award golden joker when crossing 30, 60, 90 day milestones
  const milestones = [30, 60, 90, 180, 365]
  for (const milestone of milestones) {
    if (previousStreak < milestone && currentStreak >= milestone) {
      return true
    }
  }

  return false
}

/**
 * Award golden joker for achievement
 */
export function awardGoldenJoker(
  inventory: JokerInventory,
  reason: string,
  config: JokerConfig = DEFAULT_JOKER_CONFIG
): { inventory: JokerInventory; awarded: boolean; message: string } {
  const goldenJoker = createJokerToken(inventory.userId, "golden", "achievement", config)

  const result = addJokerToInventory(inventory, goldenJoker, config)

  if (result.added) {
    return {
      inventory: result.inventory,
      awarded: true,
      message: `⭐ Joker Doré gagné : ${reason}`,
    }
  }

  return {
    inventory,
    awarded: false,
    message: `Joker Doré non attribué : ${result.reason}`,
  }
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Format joker inventory for display
 */
export function formatJokerInventory(inventory: JokerInventory): {
  total: number
  byType: Array<{ type: JokerType; count: number; emoji: string; name: string }>
  nextAllocation: string | null
  expiringCount: number
} {
  const counts = countJokersByType(inventory)
  const byType = (Object.keys(counts) as JokerType[])
    .filter((type) => counts[type] > 0)
    .map((type) => ({
      type,
      count: counts[type],
      emoji: JOKER_INFO[type].emoji,
      name: JOKER_INFO[type].name,
    }))

  // Count expiring within 7 days
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const expiringCount = inventory.available.filter(
    (j) => j.expiresAt && j.expiresAt <= soon
  ).length

  // Format next allocation date
  let nextAllocation: string | null = null
  if (inventory.nextAllocationDate) {
    const days = getDaysDifference(new Date(), inventory.nextAllocationDate)
    if (days === 0) {
      nextAllocation = "Aujourd'hui"
    } else if (days === 1) {
      nextAllocation = "Demain"
    } else {
      nextAllocation = `Dans ${days} jours`
    }
  }

  return {
    total: inventory.available.length,
    byType,
    nextAllocation,
    expiringCount,
  }
}

/**
 * Get joker usage suggestion message
 */
export function getJokerSuggestion(
  inventory: JokerInventory,
  streakStatus: StreakStatus
): string | null {
  if (inventory.available.length === 0) {
    return null
  }

  if (streakStatus.isActiveToday) {
    return null
  }

  if (streakStatus.currentStreak === 0) {
    return null
  }

  if (streakStatus.riskOfBreak) {
    return `⚠️ Votre série de ${streakStatus.currentStreak} jours est en danger ! Utilisez un joker ou complétez une tâche.`
  }

  // Check if expiring joker should be suggested
  const soonestExpiring = inventory.available
    .filter((j) => j.expiresAt)
    .sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime())[0]

  if (soonestExpiring?.expiresAt) {
    const daysUntilExpiry = getDaysDifference(new Date(), soonestExpiring.expiresAt)
    if (daysUntilExpiry <= 3) {
      return `Un joker expire dans ${daysUntilExpiry} jour(s) - pensez à l'utiliser si vous n'êtes pas actif !`
    }
  }

  return null
}
