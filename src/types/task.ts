import type { Tables, Json } from "./database"
import type {
  TaskCategory,
  TaskStatus,
  TaskPriority,
  TaskSource,
  TaskFilter,
  RecurrenceRule,
} from "@/lib/validations/task"

// Re-export enums and types from validations
export type { TaskCategory, TaskStatus, TaskPriority, TaskSource, TaskFilter, RecurrenceRule }

// Base task type from database
export type Task = Tables<"tasks">

// Task with relations
export interface TaskWithRelations extends Omit<Task, "recurrence_rule" | "metadata"> {
  recurrence_rule: RecurrenceRule
  metadata: Record<string, unknown>
  child?: {
    id: string
    first_name: string
    birthdate: string
  } | null
  assigned_user?: {
    id: string
    email: string
  } | null
  created_by_user?: {
    id: string
    email: string
  } | null
  category?: {
    id: string
    code: string
    name_fr: string
    name_en: string
    icon: string | null
    color: string | null
  } | null
}

// Task for list display (minimal data)
export interface TaskListItem {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
  deadline_flexible: boolean
  is_critical: boolean
  load_weight: number
  child_id: string | null
  child_name: string | null
  assigned_to: string | null
  assigned_name: string | null
  category_code: string | null
  category_name: string | null
  category_color: string | null
  category_icon: string | null
  created_at: string
}

// Recurring task for list display (includes recurrence_rule)
export interface RecurringTaskItem extends TaskListItem {
  recurrence_rule: RecurrenceRule | null
}

// Task creation type (for server actions)
export interface TaskCreate {
  household_id: string
  title: string
  description?: string | null
  category_id?: string | null
  child_id?: string | null
  assigned_to?: string | null
  deadline?: string | null
  deadline_flexible?: boolean
  priority?: TaskPriority
  load_weight?: number
  is_critical?: boolean
  recurrence_rule?: RecurrenceRule
  source?: TaskSource
  vocal_transcript?: string | null
  vocal_audio_url?: string | null
  created_by?: string | null
  template_id?: string | null
  metadata?: Record<string, unknown>
}

// Task update type
export interface TaskUpdate {
  id: string
  title?: string
  description?: string | null
  category_id?: string | null
  child_id?: string | null
  assigned_to?: string | null
  deadline?: string | null
  deadline_flexible?: boolean
  priority?: TaskPriority
  load_weight?: number
  is_critical?: boolean
  recurrence_rule?: RecurrenceRule
  status?: TaskStatus
  completed_at?: string | null
  postponed_to?: string | null
}

// Task grouped by date
export interface TasksByDate {
  date: string
  tasks: TaskListItem[]
  totalWeight: number
}

// Task grouped by status
export interface TasksByStatus {
  status: TaskStatus
  tasks: TaskListItem[]
  count: number
}

// Household task summary
export interface HouseholdTaskSummary {
  totalTasks: number
  pendingTasks: number
  doneTasks: number
  criticalTasks: number
  overdueTasks: number
  todayTasks: number
  weekTasks: number
}

// User load summary
export interface UserLoadSummary {
  userId: string
  userName: string
  totalLoad: number
  percentage: number
  tasksCount: number
}

// Household balance
export interface HouseholdBalance {
  householdId: string
  totalLoad: number
  members: UserLoadSummary[]
  isBalanced: boolean // true if no member has > 60%
  alertLevel: "none" | "warning" | "critical" // warning = 55-60%, critical = >60%
}

// Task category with stats
export interface TaskCategoryWithStats {
  id: string
  code: string
  name_fr: string
  name_en: string
  icon: string | null
  color: string | null
  taskCount: number
  pendingCount: number
}

// Task statistics for dashboard
export interface TaskStats {
  today: {
    total: number
    done: number
    pending: number
    critical: number
  }
  week: {
    total: number
    done: number
    pending: number
    byDay: { date: string; count: number }[]
  }
  overdue: number
  streak: number
}

// Quick action type for task operations
export type TaskQuickAction = "complete" | "postpone" | "cancel" | "reassign"

// Task action result
export interface TaskActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
