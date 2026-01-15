/**
 * Family Justice Module
 *
 * Fair distribution measurement and non-culpabilizing communication
 *
 * Components:
 * - fairness-calculator: Gini coefficient, exclusion adjustments, category fairness
 * - messaging-engine: Non-culpabilizing messages, weekly summaries
 * - report-generator: Weekly/monthly reports, email/push formatting
 */

// Fairness Calculator
export {
  // Schemas
  MemberLoadSchema,
  FairnessScoreSchema,
  FairnessTrendSchema,
  CategoryFairnessSchema,
  ExclusionAdjustmentSchema,
  // Types
  type MemberLoad,
  type FairnessScore,
  type FairnessTrend,
  type CategoryFairness,
  type ExclusionAdjustment,
  type TaskCompletion,
  type MemberExclusion,
  // Constants
  CATEGORY_NAMES,
  FAIRNESS_THRESHOLDS,
  // Core Functions
  calculateGini,
  giniToFairnessScore,
  calculateExclusionAdjustment,
  getAllExclusionAdjustments,
  calculateMemberLoads,
  calculateFairnessScore,
  getFairnessStatus,
  analyzeCategoryFairness,
  getAllCategoryFairness,
  calculateFairnessTrend,
  // Formatting
  getFairnessStatusLabel,
  getFairnessStatusColor,
  getTrendIcon,
  getTrendLabel,
  formatFairnessScore,
  formatMemberLoad,
} from "./fairness-calculator"

// Messaging Engine
export {
  // Schemas
  MessageTypeSchema,
  MessageContextSchema,
  GeneratedMessageSchema,
  WeeklySummarySchema,
  // Types
  type MessageType,
  type MessageContext,
  type GeneratedMessage,
  type WeeklySummary,
  // Functions
  generateEncouragementMessage,
  generateCelebrationMessage,
  generateSuggestionMessage,
  generateObservationMessage,
  generateScoreBasedMessages,
  generateMemberMessages,
  generateWeeklySummary,
  generateNotificationMessage,
  generateEmailSubject,
} from "./messaging-engine"

// Report Generator
export {
  // Schemas
  ReportPeriodSchema,
  ReportFormatSchema,
  WeeklyReportSchema,
  MonthlyReportSchema,
  ReportDeliverySchema,
  // Types
  type ReportPeriod,
  type ReportFormat,
  type WeeklyReport,
  type MonthlyReport,
  type ReportDelivery,
  type WeeklyScoreData,
  // Functions
  generateWeeklyReport,
  generateMonthlyReport,
  formatWeeklyReportHTML,
  formatWeeklyReportMarkdown,
  createReportDelivery,
  markDeliverySent,
  markDeliveryFailed,
  generateWeeklyReportEmail,
  generateWeeklyReportPush,
} from "./report-generator"
