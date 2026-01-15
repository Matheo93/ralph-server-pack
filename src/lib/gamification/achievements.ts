/**
 * Achievement System
 *
 * Gamification achievements and badges:
 * - Achievement definitions
 * - Progress tracking
 * - Unlock notifications
 * - Badge display
 */

import { z } from "zod"

// =============================================================================
// SCHEMAS
// =============================================================================

export const AchievementCategorySchema = z.enum([
  "streak",
  "tasks",
  "balance",
  "team",
  "special",
])

export const AchievementTierSchema = z.enum(["bronze", "silver", "gold", "platinum", "diamond"])

export const AchievementDefinitionSchema = z.object({
  id: z.string(),
  category: AchievementCategorySchema,
  tier: AchievementTierSchema,
  name: z.string(),
  description: z.string(),
  emoji: z.string(),
  points: z.number().min(0),
  requirement: z.object({
    type: z.string(),
    threshold: z.number(),
    conditions: z.record(z.string(), z.unknown()).optional(),
  }),
  isSecret: z.boolean().default(false),
  isRepeatable: z.boolean().default(false),
})

export const AchievementProgressSchema = z.object({
  achievementId: z.string(),
  userId: z.string(),
  currentValue: z.number(),
  targetValue: z.number(),
  percentage: z.number().min(0).max(100),
  unlockedAt: z.date().nullable(),
  unlockCount: z.number().default(1), // For repeatable achievements
  lastUpdated: z.date(),
})

export const UserAchievementsSchema = z.object({
  userId: z.string(),
  totalPoints: z.number(),
  unlockedCount: z.number(),
  progress: z.array(AchievementProgressSchema),
  recentUnlocks: z.array(
    z.object({
      achievementId: z.string(),
      unlockedAt: z.date(),
    })
  ),
  displayedBadges: z.array(z.string()), // IDs of badges shown on profile
})

export const UnlockNotificationSchema = z.object({
  achievementId: z.string(),
  name: z.string(),
  description: z.string(),
  emoji: z.string(),
  tier: AchievementTierSchema,
  points: z.number(),
  message: z.string(),
  isFirst: z.boolean(), // First person in household to unlock
})

// =============================================================================
// TYPES
// =============================================================================

export type AchievementCategory = z.infer<typeof AchievementCategorySchema>
export type AchievementTier = z.infer<typeof AchievementTierSchema>
export type AchievementDefinition = z.infer<typeof AchievementDefinitionSchema>
export type AchievementProgress = z.infer<typeof AchievementProgressSchema>
export type UserAchievements = z.infer<typeof UserAchievementsSchema>
export type UnlockNotification = z.infer<typeof UnlockNotificationSchema>

// =============================================================================
// ACHIEVEMENT DEFINITIONS
// =============================================================================

export const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
  // STREAK ACHIEVEMENTS
  streak_3: {
    id: "streak_3",
    category: "streak",
    tier: "bronze",
    name: "Premier Élan",
    description: "Maintenir une série de 3 jours",
    emoji: "🌱",
    points: 10,
    requirement: { type: "streak", threshold: 3 },
    isSecret: false,
    isRepeatable: false,
  },
  streak_7: {
    id: "streak_7",
    category: "streak",
    tier: "silver",
    name: "Semaine Parfaite",
    description: "Maintenir une série de 7 jours",
    emoji: "🔥",
    points: 25,
    requirement: { type: "streak", threshold: 7 },
    isSecret: false,
    isRepeatable: false,
  },
  streak_14: {
    id: "streak_14",
    category: "streak",
    tier: "silver",
    name: "Deux Semaines",
    description: "Maintenir une série de 14 jours",
    emoji: "⚡",
    points: 50,
    requirement: { type: "streak", threshold: 14 },
    isSecret: false,
    isRepeatable: false,
  },
  streak_30: {
    id: "streak_30",
    category: "streak",
    tier: "gold",
    name: "Un Mois",
    description: "Maintenir une série de 30 jours",
    emoji: "🏆",
    points: 100,
    requirement: { type: "streak", threshold: 30 },
    isSecret: false,
    isRepeatable: false,
  },
  streak_60: {
    id: "streak_60",
    category: "streak",
    tier: "gold",
    name: "Deux Mois",
    description: "Maintenir une série de 60 jours",
    emoji: "💎",
    points: 200,
    requirement: { type: "streak", threshold: 60 },
    isSecret: false,
    isRepeatable: false,
  },
  streak_90: {
    id: "streak_90",
    category: "streak",
    tier: "platinum",
    name: "Trimestre",
    description: "Maintenir une série de 90 jours",
    emoji: "👑",
    points: 350,
    requirement: { type: "streak", threshold: 90 },
    isSecret: false,
    isRepeatable: false,
  },
  streak_180: {
    id: "streak_180",
    category: "streak",
    tier: "platinum",
    name: "Six Mois",
    description: "Maintenir une série de 180 jours",
    emoji: "🌟",
    points: 750,
    requirement: { type: "streak", threshold: 180 },
    isSecret: false,
    isRepeatable: false,
  },
  streak_365: {
    id: "streak_365",
    category: "streak",
    tier: "diamond",
    name: "Un An",
    description: "Maintenir une série d'un an complet",
    emoji: "🎖️",
    points: 2000,
    requirement: { type: "streak", threshold: 365 },
    isSecret: false,
    isRepeatable: false,
  },

  // TASK ACHIEVEMENTS
  tasks_first: {
    id: "tasks_first",
    category: "tasks",
    tier: "bronze",
    name: "Premier Pas",
    description: "Compléter votre première tâche",
    emoji: "👣",
    points: 5,
    requirement: { type: "tasks_completed", threshold: 1 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_10: {
    id: "tasks_10",
    category: "tasks",
    tier: "bronze",
    name: "Démarrage",
    description: "Compléter 10 tâches",
    emoji: "✅",
    points: 15,
    requirement: { type: "tasks_completed", threshold: 10 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_50: {
    id: "tasks_50",
    category: "tasks",
    tier: "silver",
    name: "En Route",
    description: "Compléter 50 tâches",
    emoji: "🚀",
    points: 30,
    requirement: { type: "tasks_completed", threshold: 50 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_100: {
    id: "tasks_100",
    category: "tasks",
    tier: "silver",
    name: "Centurion",
    description: "Compléter 100 tâches",
    emoji: "💯",
    points: 50,
    requirement: { type: "tasks_completed", threshold: 100 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_500: {
    id: "tasks_500",
    category: "tasks",
    tier: "gold",
    name: "Expert",
    description: "Compléter 500 tâches",
    emoji: "🎯",
    points: 150,
    requirement: { type: "tasks_completed", threshold: 500 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_1000: {
    id: "tasks_1000",
    category: "tasks",
    tier: "platinum",
    name: "Millénaire",
    description: "Compléter 1000 tâches",
    emoji: "🌠",
    points: 500,
    requirement: { type: "tasks_completed", threshold: 1000 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_critical_5: {
    id: "tasks_critical_5",
    category: "tasks",
    tier: "bronze",
    name: "Prioritaire",
    description: "Compléter 5 tâches critiques",
    emoji: "⚠️",
    points: 20,
    requirement: { type: "critical_tasks_completed", threshold: 5 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_critical_25: {
    id: "tasks_critical_25",
    category: "tasks",
    tier: "silver",
    name: "Gestionnaire de Crise",
    description: "Compléter 25 tâches critiques",
    emoji: "🚨",
    points: 75,
    requirement: { type: "critical_tasks_completed", threshold: 25 },
    isSecret: false,
    isRepeatable: false,
  },
  tasks_week_perfect: {
    id: "tasks_week_perfect",
    category: "tasks",
    tier: "gold",
    name: "Semaine Parfaite",
    description: "Compléter toutes les tâches assignées pendant une semaine",
    emoji: "🌈",
    points: 100,
    requirement: { type: "perfect_week", threshold: 1 },
    isSecret: false,
    isRepeatable: true,
  },

  // BALANCE ACHIEVEMENTS
  balance_fair: {
    id: "balance_fair",
    category: "balance",
    tier: "silver",
    name: "Équilibriste",
    description: "Maintenir un score d'équilibre >80% pendant 7 jours",
    emoji: "⚖️",
    points: 50,
    requirement: { type: "balance_score", threshold: 80, conditions: { days: 7 } },
    isSecret: false,
    isRepeatable: false,
  },
  balance_month: {
    id: "balance_month",
    category: "balance",
    tier: "gold",
    name: "Mois Équilibré",
    description: "Maintenir un score d'équilibre >70% pendant 30 jours",
    emoji: "🎭",
    points: 150,
    requirement: { type: "balance_score", threshold: 70, conditions: { days: 30 } },
    isSecret: false,
    isRepeatable: false,
  },
  balance_improved: {
    id: "balance_improved",
    category: "balance",
    tier: "bronze",
    name: "Amélioration",
    description: "Améliorer le score d'équilibre de 20 points",
    emoji: "📈",
    points: 25,
    requirement: { type: "balance_improvement", threshold: 20 },
    isSecret: false,
    isRepeatable: false,
  },

  // TEAM ACHIEVEMENTS
  team_streak_7: {
    id: "team_streak_7",
    category: "team",
    tier: "silver",
    name: "Équipe Soudée",
    description: "Série d'équipe de 7 jours",
    emoji: "👨‍👩‍👧‍👦",
    points: 75,
    requirement: { type: "team_streak", threshold: 7 },
    isSecret: false,
    isRepeatable: false,
  },
  team_streak_30: {
    id: "team_streak_30",
    category: "team",
    tier: "gold",
    name: "Famille Unie",
    description: "Série d'équipe de 30 jours",
    emoji: "💪",
    points: 200,
    requirement: { type: "team_streak", threshold: 30 },
    isSecret: false,
    isRepeatable: false,
  },
  team_all_categories: {
    id: "team_all_categories",
    category: "team",
    tier: "silver",
    name: "Polyvalents",
    description: "Chaque membre a contribué dans toutes les catégories",
    emoji: "🌈",
    points: 100,
    requirement: { type: "all_categories_covered", threshold: 1 },
    isSecret: false,
    isRepeatable: false,
  },

  // SPECIAL ACHIEVEMENTS
  special_early_bird: {
    id: "special_early_bird",
    category: "special",
    tier: "bronze",
    name: "Lève-tôt",
    description: "Compléter une tâche avant 7h du matin",
    emoji: "🌅",
    points: 15,
    requirement: { type: "task_before_hour", threshold: 7 },
    isSecret: true,
    isRepeatable: false,
  },
  special_night_owl: {
    id: "special_night_owl",
    category: "special",
    tier: "bronze",
    name: "Couche-tard",
    description: "Compléter une tâche après 23h",
    emoji: "🦉",
    points: 15,
    requirement: { type: "task_after_hour", threshold: 23 },
    isSecret: true,
    isRepeatable: false,
  },
  special_weekend_warrior: {
    id: "special_weekend_warrior",
    category: "special",
    tier: "silver",
    name: "Guerrier du Weekend",
    description: "Compléter 10 tâches en un seul weekend",
    emoji: "⚔️",
    points: 40,
    requirement: { type: "weekend_tasks", threshold: 10 },
    isSecret: false,
    isRepeatable: true,
  },
  special_comeback: {
    id: "special_comeback",
    category: "special",
    tier: "gold",
    name: "Retour en Force",
    description: "Retrouver une série de 30 jours après l'avoir perdue",
    emoji: "🔄",
    points: 150,
    requirement: { type: "streak_recovery", threshold: 30 },
    isSecret: true,
    isRepeatable: false,
  },
  special_joker_master: {
    id: "special_joker_master",
    category: "special",
    tier: "gold",
    name: "Maître des Jokers",
    description: "Utiliser un joker pour sauver une série de 60+ jours",
    emoji: "🃏",
    points: 100,
    requirement: { type: "joker_save_streak", threshold: 60 },
    isSecret: false,
    isRepeatable: false,
  },
}

// =============================================================================
// TIER CONFIGURATION
// =============================================================================

export const TIER_INFO = {
  bronze: { color: "#CD7F32", label: "Bronze", minPoints: 0 },
  silver: { color: "#C0C0C0", label: "Argent", minPoints: 100 },
  gold: { color: "#FFD700", label: "Or", minPoints: 500 },
  platinum: { color: "#E5E4E2", label: "Platine", minPoints: 1500 },
  diamond: { color: "#B9F2FF", label: "Diamant", minPoints: 5000 },
} as const

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

/**
 * Create empty user achievements
 */
export function createUserAchievements(userId: string): UserAchievements {
  const progress: AchievementProgress[] = Object.values(ACHIEVEMENT_DEFINITIONS).map(
    (def) => ({
      achievementId: def.id,
      userId,
      currentValue: 0,
      targetValue: def.requirement.threshold,
      percentage: 0,
      unlockedAt: null,
      unlockCount: 0,
      lastUpdated: new Date(),
    })
  )

  return {
    userId,
    totalPoints: 0,
    unlockedCount: 0,
    progress,
    recentUnlocks: [],
    displayedBadges: [],
  }
}

/**
 * Update progress for a specific achievement
 */
export function updateAchievementProgress(
  achievements: UserAchievements,
  achievementId: string,
  newValue: number
): { achievements: UserAchievements; notification: UnlockNotification | null } {
  const definition = ACHIEVEMENT_DEFINITIONS[achievementId]
  if (!definition) {
    return { achievements, notification: null }
  }

  const progressIndex = achievements.progress.findIndex(
    (p) => p.achievementId === achievementId
  )

  if (progressIndex === -1) {
    return { achievements, notification: null }
  }

  const currentProgress = achievements.progress[progressIndex]!
  const wasUnlocked = currentProgress.unlockedAt !== null
  const targetValue = definition.requirement.threshold

  // Check if already unlocked and not repeatable
  if (wasUnlocked && !definition.isRepeatable) {
    return { achievements, notification: null }
  }

  // Calculate new percentage
  const percentage = Math.min(100, Math.round((newValue / targetValue) * 100))
  const isNowUnlocked = newValue >= targetValue

  // Create updated progress
  const updatedProgress: AchievementProgress = {
    ...currentProgress,
    currentValue: newValue,
    percentage,
    lastUpdated: new Date(),
    unlockedAt: isNowUnlocked && !wasUnlocked ? new Date() : currentProgress.unlockedAt,
    unlockCount: isNowUnlocked
      ? wasUnlocked
        ? currentProgress.unlockCount + 1
        : 1
      : currentProgress.unlockCount,
  }

  // Update achievements
  const newProgress = [...achievements.progress]
  newProgress[progressIndex] = updatedProgress

  let notification: UnlockNotification | null = null
  let newTotalPoints = achievements.totalPoints
  let newUnlockedCount = achievements.unlockedCount
  const newRecentUnlocks = [...achievements.recentUnlocks]

  // Check for new unlock
  if (isNowUnlocked && (!wasUnlocked || definition.isRepeatable)) {
    newTotalPoints += definition.points
    if (!wasUnlocked) {
      newUnlockedCount++
    }

    newRecentUnlocks.unshift({
      achievementId: definition.id,
      unlockedAt: new Date(),
    })

    // Keep only last 10 recent unlocks
    if (newRecentUnlocks.length > 10) {
      newRecentUnlocks.pop()
    }

    notification = {
      achievementId: definition.id,
      name: definition.name,
      description: definition.description,
      emoji: definition.emoji,
      tier: definition.tier,
      points: definition.points,
      message: `${definition.emoji} ${definition.name} débloqué ! +${definition.points} points`,
      isFirst: false, // Will be set by caller if needed
    }
  }

  return {
    achievements: {
      ...achievements,
      totalPoints: newTotalPoints,
      unlockedCount: newUnlockedCount,
      progress: newProgress,
      recentUnlocks: newRecentUnlocks,
    },
    notification,
  }
}

/**
 * Batch update multiple achievement types
 */
export function updateAchievementsFromStats(
  achievements: UserAchievements,
  stats: {
    currentStreak?: number
    totalTasksCompleted?: number
    criticalTasksCompleted?: number
    balanceScore?: number
    teamStreak?: number
    perfectWeeks?: number
    weekendTasks?: number
  }
): { achievements: UserAchievements; notifications: UnlockNotification[] } {
  let current = achievements
  const notifications: UnlockNotification[] = []

  // Update streak achievements
  if (stats.currentStreak !== undefined) {
    const streakAchievements = [
      "streak_3",
      "streak_7",
      "streak_14",
      "streak_30",
      "streak_60",
      "streak_90",
      "streak_180",
      "streak_365",
    ]
    for (const id of streakAchievements) {
      const result = updateAchievementProgress(current, id, stats.currentStreak)
      current = result.achievements
      if (result.notification) notifications.push(result.notification)
    }
  }

  // Update task achievements
  if (stats.totalTasksCompleted !== undefined) {
    const taskAchievements = [
      "tasks_first",
      "tasks_10",
      "tasks_50",
      "tasks_100",
      "tasks_500",
      "tasks_1000",
    ]
    for (const id of taskAchievements) {
      const result = updateAchievementProgress(current, id, stats.totalTasksCompleted)
      current = result.achievements
      if (result.notification) notifications.push(result.notification)
    }
  }

  // Update critical task achievements
  if (stats.criticalTasksCompleted !== undefined) {
    const criticalAchievements = ["tasks_critical_5", "tasks_critical_25"]
    for (const id of criticalAchievements) {
      const result = updateAchievementProgress(current, id, stats.criticalTasksCompleted)
      current = result.achievements
      if (result.notification) notifications.push(result.notification)
    }
  }

  // Update team streak achievements
  if (stats.teamStreak !== undefined) {
    const teamAchievements = ["team_streak_7", "team_streak_30"]
    for (const id of teamAchievements) {
      const result = updateAchievementProgress(current, id, stats.teamStreak)
      current = result.achievements
      if (result.notification) notifications.push(result.notification)
    }
  }

  // Update perfect week achievements
  if (stats.perfectWeeks !== undefined) {
    const result = updateAchievementProgress(current, "tasks_week_perfect", stats.perfectWeeks)
    current = result.achievements
    if (result.notification) notifications.push(result.notification)
  }

  // Update weekend warrior
  if (stats.weekendTasks !== undefined) {
    const result = updateAchievementProgress(
      current,
      "special_weekend_warrior",
      stats.weekendTasks
    )
    current = result.achievements
    if (result.notification) notifications.push(result.notification)
  }

  return { achievements: current, notifications }
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get unlocked achievements
 */
export function getUnlockedAchievements(achievements: UserAchievements): AchievementDefinition[] {
  return achievements.progress
    .filter((p) => p.unlockedAt !== null)
    .map((p) => ACHIEVEMENT_DEFINITIONS[p.achievementId])
    .filter((d): d is AchievementDefinition => d !== undefined)
}

/**
 * Get achievements in progress (unlockable)
 */
export function getInProgressAchievements(
  achievements: UserAchievements
): Array<{ definition: AchievementDefinition; progress: AchievementProgress }> {
  return achievements.progress
    .filter((p) => p.unlockedAt === null && p.percentage > 0)
    .map((p) => ({
      definition: ACHIEVEMENT_DEFINITIONS[p.achievementId]!,
      progress: p,
    }))
    .filter((item) => item.definition !== undefined)
    .sort((a, b) => b.progress.percentage - a.progress.percentage)
}

/**
 * Get next achievable achievements
 */
export function getNextAchievements(
  achievements: UserAchievements,
  limit: number = 3
): Array<{ definition: AchievementDefinition; progress: AchievementProgress }> {
  return achievements.progress
    .filter(
      (p) =>
        p.unlockedAt === null &&
        !ACHIEVEMENT_DEFINITIONS[p.achievementId]?.isSecret
    )
    .map((p) => ({
      definition: ACHIEVEMENT_DEFINITIONS[p.achievementId]!,
      progress: p,
    }))
    .filter((item) => item.definition !== undefined)
    .sort((a, b) => b.progress.percentage - a.progress.percentage)
    .slice(0, limit)
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  achievements: UserAchievements,
  category: AchievementCategory
): Array<{ definition: AchievementDefinition; progress: AchievementProgress }> {
  return achievements.progress
    .map((p) => ({
      definition: ACHIEVEMENT_DEFINITIONS[p.achievementId]!,
      progress: p,
    }))
    .filter(
      (item) => item.definition !== undefined && item.definition.category === category
    )
}

/**
 * Get user's current tier based on points
 */
export function getUserTier(totalPoints: number): AchievementTier {
  if (totalPoints >= TIER_INFO.diamond.minPoints) return "diamond"
  if (totalPoints >= TIER_INFO.platinum.minPoints) return "platinum"
  if (totalPoints >= TIER_INFO.gold.minPoints) return "gold"
  if (totalPoints >= TIER_INFO.silver.minPoints) return "silver"
  return "bronze"
}

/**
 * Get points needed for next tier
 */
export function getPointsToNextTier(totalPoints: number): {
  currentTier: AchievementTier
  nextTier: AchievementTier | null
  pointsNeeded: number
  percentage: number
} {
  const currentTier = getUserTier(totalPoints)
  const tiers: AchievementTier[] = ["bronze", "silver", "gold", "platinum", "diamond"]
  const currentIndex = tiers.indexOf(currentTier)
  const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1]! : null

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      pointsNeeded: 0,
      percentage: 100,
    }
  }

  const currentMin = TIER_INFO[currentTier].minPoints
  const nextMin = TIER_INFO[nextTier].minPoints
  const pointsNeeded = nextMin - totalPoints
  const rangeSize = nextMin - currentMin
  const progress = totalPoints - currentMin
  const percentage = Math.round((progress / rangeSize) * 100)

  return {
    currentTier,
    nextTier,
    pointsNeeded,
    percentage,
  }
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Format achievements summary for display
 */
export function formatAchievementsSummary(achievements: UserAchievements): {
  totalPoints: number
  unlockedCount: number
  totalCount: number
  completionPercentage: number
  tier: AchievementTier
  tierLabel: string
  tierColor: string
  nextTierProgress: number
} {
  const totalCount = Object.keys(ACHIEVEMENT_DEFINITIONS).length
  const tier = getUserTier(achievements.totalPoints)
  const tierProgress = getPointsToNextTier(achievements.totalPoints)

  return {
    totalPoints: achievements.totalPoints,
    unlockedCount: achievements.unlockedCount,
    totalCount,
    completionPercentage: Math.round((achievements.unlockedCount / totalCount) * 100),
    tier,
    tierLabel: TIER_INFO[tier].label,
    tierColor: TIER_INFO[tier].color,
    nextTierProgress: tierProgress.percentage,
  }
}

/**
 * Format achievement for display
 */
export function formatAchievement(
  definition: AchievementDefinition,
  progress: AchievementProgress
): {
  id: string
  name: string
  description: string
  emoji: string
  tier: AchievementTier
  tierColor: string
  points: number
  isUnlocked: boolean
  isSecret: boolean
  percentage: number
  currentValue: number
  targetValue: number
  unlockedAt: string | null
} {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    emoji: definition.emoji,
    tier: definition.tier,
    tierColor: TIER_INFO[definition.tier].color,
    points: definition.points,
    isUnlocked: progress.unlockedAt !== null,
    isSecret: definition.isSecret,
    percentage: progress.percentage,
    currentValue: progress.currentValue,
    targetValue: progress.targetValue,
    unlockedAt: progress.unlockedAt?.toISOString() ?? null,
  }
}

/**
 * Get achievement unlock message
 */
export function getAchievementMessage(notification: UnlockNotification): string {
  const tierLabel = TIER_INFO[notification.tier].label
  return `🎉 ${notification.emoji} Succès ${tierLabel} : "${notification.name}" ! ${notification.description}. +${notification.points} points`
}

/**
 * Get category display info
 */
export function getCategoryInfo(
  category: AchievementCategory
): { name: string; emoji: string; description: string } {
  const info: Record<AchievementCategory, { name: string; emoji: string; description: string }> = {
    streak: {
      name: "Séries",
      emoji: "🔥",
      description: "Récompenses pour maintenir des séries",
    },
    tasks: {
      name: "Tâches",
      emoji: "✅",
      description: "Récompenses pour compléter des tâches",
    },
    balance: {
      name: "Équilibre",
      emoji: "⚖️",
      description: "Récompenses pour maintenir l'équilibre",
    },
    team: {
      name: "Équipe",
      emoji: "👨‍👩‍👧‍👦",
      description: "Récompenses pour le travail d'équipe",
    },
    special: {
      name: "Spécial",
      emoji: "✨",
      description: "Récompenses spéciales et secrètes",
    },
  }

  return info[category]
}
