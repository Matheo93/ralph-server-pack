/**
 * Gamification Module
 *
 * Streak tracking, achievements, and leaderboards.
 */

// Streak Engine
export {
  // Functions
  getStartOfDay,
  getEndOfDay,
  getDaysDifference,
  isSameDay,
  isYesterday,
  isToday,
  isActiveDay,
  createDailyActivity,
  getActivitySummary,
  calculateStreakStatus,
  detectStreakBreak,
  canRecoverStreak,
  attemptStreakRecovery,
  calculateHouseholdStreak,
  getStreakMilestone,
  checkMilestoneReached,
  calculateStreakPoints,
  getStreakMessage,
  getHouseholdStreakMessage,
  formatStreakDisplay,
  // Constants
  DEFAULT_STREAK_CONFIG,
  STREAK_MILESTONES,
  // Schemas
  StreakStatusSchema,
  DailyActivitySchema,
  StreakConfigSchema,
  HouseholdStreakSchema,
  StreakBreakInfoSchema,
  // Types
  type StreakStatus,
  type DailyActivity,
  type StreakConfig,
  type HouseholdStreak,
  type StreakBreakInfo,
} from "./streak-engine"

// Joker System
export {
  // Functions
  createJokerInventory,
  getNextAllocationDate,
  countJokersByType,
  getTotalAvailableJokers,
  createJokerToken,
  addJokerToInventory,
  cleanupExpiredJokers,
  isEligibleForAllocation,
  allocateMonthlyJokers,
  getBestJokerToUse,
  useJoker,
  wasJokerUsedForDate,
  getJokerHistory,
  canUseEmergencyJoker,
  useEmergencyJoker,
  checkGoldenJokerReward,
  awardGoldenJoker,
  formatJokerInventory,
  getJokerSuggestion,
  // Constants
  DEFAULT_JOKER_CONFIG,
  JOKER_INFO,
  // Schemas
  JokerTypeSchema,
  JokerTokenSchema,
  JokerInventorySchema,
  JokerConfigSchema,
  JokerUsageResultSchema,
  JokerAllocationResultSchema,
  // Types
  type JokerType,
  type JokerToken,
  type JokerInventory,
  type JokerConfig,
  type JokerUsageResult,
  type JokerAllocationResult,
} from "./joker-system"

// Achievements
export {
  // Functions
  createUserAchievements,
  updateAchievementProgress,
  updateAchievementsFromStats,
  getUnlockedAchievements,
  getInProgressAchievements,
  getNextAchievements,
  getAchievementsByCategory,
  getUserTier,
  getPointsToNextTier,
  formatAchievementsSummary,
  formatAchievement,
  getAchievementMessage,
  getCategoryInfo,
  // Constants
  ACHIEVEMENT_DEFINITIONS,
  TIER_INFO,
  // Schemas
  AchievementCategorySchema,
  AchievementTierSchema,
  AchievementDefinitionSchema,
  AchievementProgressSchema,
  UserAchievementsSchema,
  UnlockNotificationSchema,
  // Types
  type AchievementCategory,
  type AchievementTier,
  type AchievementDefinition,
  type AchievementProgress,
  type UserAchievements,
  type UnlockNotification,
} from "./achievements"

// Leaderboard
export {
  // Functions
  getPeriodDateRange,
  getPeriodLabel,
  getCategoryLabel,
  calculateScore,
  createLeaderboardEntry,
  generateFamilyLeaderboard,
  getRankChangeIndicator,
  calculatePercentile,
  createDefaultGlobalStats,
  calculateUserRankingInfo,
  calculateNormalizedScore,
  compareFairly,
  formatLeaderboardEntry,
  getLeaderboardMessage,
  formatPercentile,
  formatLeaderboardSummary,
  // Schemas
  LeaderboardPeriodSchema,
  LeaderboardCategorySchema,
  LeaderboardEntrySchema,
  FamilyLeaderboardSchema,
  GlobalStatsSchema,
  UserRankingInfoSchema,
  // Types
  type LeaderboardPeriod,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type FamilyLeaderboard,
  type GlobalStats,
  type UserRankingInfo,
  type UserStats,
} from "./leaderboard"
