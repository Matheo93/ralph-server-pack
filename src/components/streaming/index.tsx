/**
 * Streaming SSR Components
 *
 * These components are designed to be used with React Suspense for streaming SSR.
 * Each component fetches its own data and can be loaded independently,
 * allowing the page to stream content progressively.
 *
 * Usage pattern:
 * ```tsx
 * import { Suspense } from "react"
 * import { StreamingErrorBoundary } from "@/components/streaming"
 *
 * <StreamingErrorBoundary sectionName="Tâches">
 *   <Suspense fallback={<TasksSkeleton />}>
 *     <TasksStream />
 *   </Suspense>
 * </StreamingErrorBoundary>
 * ```
 */

// Error boundary for streaming
export { StreamingErrorBoundary, StreamingErrorFallback } from "./StreamingErrorBoundary"

// Dashboard streaming components
export { DashboardStatsStream, DashboardStatsSkeleton } from "./DashboardStats"
export { DashboardTodayStream, DashboardTodaySkeleton } from "./DashboardToday"
export { DashboardWeekStream, DashboardWeekSkeleton } from "./DashboardWeek"
export { DashboardChargeStream, DashboardChargeSkeleton } from "./DashboardCharge"
export { DashboardOverdueStream, DashboardOverdueSkeleton } from "./DashboardOverdue"
export { DashboardUnscheduledStream, DashboardUnscheduledSkeleton } from "./DashboardUnscheduled"

// Page-level streaming components
export { ChildrenListStream, ChildrenListSkeleton } from "./ChildrenList"
export { TasksListStream, TasksListSkeleton } from "./TasksList"
export { CalendarEventsStream, CalendarEventsSkeleton } from "./CalendarEvents"
export { ChargeDataStream, ChargeDataSkeleton } from "./ChargeData"
export { ShoppingDataStream, ShoppingDataSkeleton } from "./ShoppingData"
export { ChallengesDataStream, ChallengesDataSkeleton } from "./ChallengesData"

// Settings page skeletons
export {
  ProfileFormSkeleton,
  HouseholdSettingsSkeleton,
  NotificationSettingsSkeleton,
  BillingContentSkeleton,
  SettingsPageSkeleton,
} from "./SettingsStreaming"
