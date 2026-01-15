/**
 * Distribution Module
 *
 * Task load distribution and fair assignment system.
 */

// Base calculator (v1)
export {
  calculateTaskWeight,
  calculateDistribution,
  calculateBalanceScore,
  getISOWeek,
  getWeekBounds,
  calculateWeeklyStats,
  getWeeklyHistory,
  generateBalanceAlert,
  formatWeight,
  getLoadLevel,
  calculateTrend,
  CATEGORY_WEIGHTS,
  WEIGHT_MULTIPLIERS,
  type TaskLoad,
  type ParentLoad,
  type LoadDistribution,
  type WeeklyStats,
  type AlertLevel,
  type AlertStatus,
  type ReassignmentSuggestion,
  type BalanceAlert,
} from "./calculator"

// Base assigner (v1)
export {
  getLeastLoadedParent,
  getRotatingAssignment,
  suggestRebalance,
  type AssignmentOptions,
  type AssignmentResult as AssignmentResultV1,
  type RebalanceSuggestion,
} from "./assigner"

// Enhanced load calculator (v2)
export {
  calculateTaskWeight as calculateTaskWeightV2,
  calculateTimeDecay,
  calculateDeadlineMultiplier,
  calculateFatigueMultiplier,
  calculatePriorityMultiplier,
  calculateRecurringMultiplier,
  calculateTimeWeightedLoad,
  calculateCategoryLoad,
  calculateLoadTrend,
  calculateFatigueLevel,
  buildFatigueState,
  calculateGiniCoefficient,
  calculateBalanceScoreV2,
  buildUserLoadSummary,
  generateLoadAlerts,
  generateRecommendations,
  calculateLoadDistributionV2,
  getCategoryWeight,
  formatWeight as formatWeightV2,
  getFatigueLevelLabel,
  getBalanceStatusLabel,
  getTrendIcon,
  CATEGORY_WEIGHTS_V2,
  MULTIPLIERS,
  TIME_DECAY,
  TaskWeightInputSchema,
  HistoricalLoadEntrySchema,
  type TaskWeightInput,
  type HistoricalLoadEntry,
  type UserLoadSummary,
  type LoadDistributionV2,
  type LoadAlert,
  type LoadRecommendation,
  type FatigueState,
  type LoadCalculationResult,
  type CategoryWeight,
  type TimeWeightedScore,
} from "./load-calculator-v2"

// Assignment optimizer (v2)
export {
  isInExclusionPeriod,
  canHandleCategory,
  hasRequiredSkills,
  hasCapacity,
  checkEligibility,
  calculateLoadBalanceScore,
  calculateCategoryPreferenceScore,
  calculateSkillMatchScore,
  calculateAvailabilityScore,
  calculateRotationScore,
  calculateFatigueScore,
  calculateAssignmentScore,
  findOptimalAssignee,
  assignTasksBatch,
  createRotationTracker,
  updateRotationTracker,
  getCategoryRotationStatus,
  addExclusionPeriod,
  cleanupExclusionPeriods,
  getUpcomingExclusions,
  suggestReassignments,
  createMemberAvailability,
  getAssignmentStats,
  MemberAvailabilitySchema,
  AssignmentScoreSchema,
  AssignmentResultSchema,
  BatchAssignmentResultSchema,
  TaskWeightInputSchemaWithSkills,
  type MemberAvailability,
  type AssignmentScore,
  type AssignmentResult,
  type BatchAssignmentResult,
  type RotationTracker,
  type ExclusionPeriod,
  type TaskWeightInputWithSkills,
} from "./assignment-optimizer"

// Balance alerts
export {
  analyzeBalanceStatus,
  generateWeeklyDigest,
  analyzeTrend,
  generateAlertMessage,
  generatePositiveMessage,
  generateRecommendationMessage,
  createAlertNotification,
  createDigestNotification,
  DEFAULT_ALERT_CONFIG,
  AlertConfigSchema,
  BalanceStatusSchema,
  WeeklyDigestSchema,
  TrendAnalysisSchema,
  type AlertConfig,
  type BalanceStatus,
  type WeeklyDigest,
  type TrendAnalysis,
  type NotificationPayload,
} from "./balance-alerts"

// Fairness algorithm
export * from "./fairness-algorithm"

// Burnout prevention
export * from "./burnout-prevention"

// Delegation engine
export * from "./delegation-engine"

// Workload predictor
export * from "./workload-predictor"
