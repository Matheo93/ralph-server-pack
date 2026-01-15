/**
 * Streak Module Exports
 */

export {
  // Types
  type StreakStatus,
  type DailyProgress,
  type StreakHistory,
  type StreakConfig,
  type StreakValidation,

  // Constants
  DEFAULT_STREAK_CONFIG,
  STREAK_MILESTONES,

  // Date helpers
  getStreakDate,
  isSameStreakDay,
  isConsecutiveDay,
  getDaysBetween,

  // Calculation
  calculateStreak,
  isStreakBroken,
  canUseJoker,

  // Milestones
  getNextMilestone,
  isAtMilestone,
  getAchievedMilestones,
  getMilestoneProgress,

  // History
  buildStreakHistory,

  // Validation
  StreakValidationSchema,
} from "./calculator"
