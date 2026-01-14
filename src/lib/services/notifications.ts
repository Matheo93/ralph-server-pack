import { query, queryOne } from "@/lib/aws/database"
import { sendEmail } from "@/lib/aws/ses"
import {
  generateDailyDigestEmail,
  generateTaskReminderEmail,
  generateStreakWarningEmail,
} from "@/lib/templates/email"

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] || "https://app.familyload.com"

interface TaskListItem {
  id: string
  title: string
  priority: string
  is_critical: boolean
  child_name: string | null
  category_name: string | null
  deadline: string | null
  description: string | null
}

interface HouseholdMember {
  user_id: string
  email: string
  name: string | null
  role: string
  daily_reminder_time: string | null
  email_enabled: boolean
  weekly_summary_enabled: boolean
}

interface Household {
  id: string
  name: string
  streak_current: number
  streak_best: number
  timezone: string
}

// ============================================================
// SEND TASK REMINDER
// ============================================================

export async function sendTaskReminder(
  taskId: string,
  memberId: string
): Promise<boolean> {
  // Get task details
  const task = await queryOne<TaskListItem & { household_id: string }>(`
    SELECT
      t.id,
      t.title,
      t.description,
      t.priority,
      t.is_critical,
      t.deadline::text,
      t.household_id,
      c.first_name as child_name,
      tc.name_fr as category_name
    FROM tasks t
    LEFT JOIN children c ON t.child_id = c.id
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.id = $1
  `, [taskId])

  if (!task) {
    console.error(`Task ${taskId} not found`)
    return false
  }

  // Get member details
  const member = await queryOne<{
    email: string
    name: string | null
    email_enabled: boolean
  }>(`
    SELECT u.email, u.name, COALESCE(up.email_enabled, true) as email_enabled
    FROM users u
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE u.id = $1
  `, [memberId])

  if (!member || !member.email_enabled) {
    console.log(`Member ${memberId} email disabled or not found`)
    return false
  }

  const emailData = generateTaskReminderEmail({
    userName: member.name || "Utilisateur",
    taskTitle: task.title,
    taskDescription: task.description,
    deadline: task.deadline || new Date().toISOString(),
    priority: task.priority,
    is_critical: task.is_critical,
    childName: task.child_name,
    categoryName: task.category_name,
    appUrl: APP_URL,
    taskId: task.id,
  })

  return sendEmail({
    to: member.email,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  })
}

// ============================================================
// SEND DAILY DIGEST
// ============================================================

export async function sendDailyDigest(householdId: string): Promise<{
  sent: number
  failed: number
}> {
  let sent = 0
  let failed = 0

  // Get household details
  const household = await queryOne<Household>(`
    SELECT id, name, streak_current, streak_best, timezone
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household) {
    console.error(`Household ${householdId} not found`)
    return { sent: 0, failed: 0 }
  }

  // Get household members with preferences
  const members = await query<HouseholdMember>(`
    SELECT
      hm.user_id,
      hm.role,
      u.email,
      u.name,
      COALESCE(up.daily_reminder_time, '08:00') as daily_reminder_time,
      COALESCE(up.email_enabled, true) as email_enabled,
      COALESCE(up.weekly_summary_enabled, true) as weekly_summary_enabled
    FROM household_members hm
    JOIN users u ON u.id = hm.user_id
    LEFT JOIN user_preferences up ON up.user_id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  // Get today's tasks
  const todayTasks = await query<TaskListItem>(`
    SELECT
      t.id,
      t.title,
      t.priority,
      t.is_critical,
      t.deadline::text,
      c.first_name as child_name,
      tc.name_fr as category_name
    FROM tasks t
    LEFT JOIN children c ON t.child_id = c.id
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.household_id = $1
      AND t.deadline::date = CURRENT_DATE
      AND t.status IN ('pending', 'postponed')
    ORDER BY t.is_critical DESC, t.priority ASC
  `, [householdId])

  // Get overdue tasks
  const overdueTasks = await query<TaskListItem>(`
    SELECT
      t.id,
      t.title,
      t.priority,
      t.is_critical,
      t.deadline::text,
      c.first_name as child_name,
      tc.name_fr as category_name
    FROM tasks t
    LEFT JOIN children c ON t.child_id = c.id
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.household_id = $1
      AND t.deadline::date < CURRENT_DATE
      AND t.status = 'pending'
    ORDER BY t.deadline ASC
  `, [householdId])

  // Get week count
  const weekCountResult = await queryOne<{ count: number }>(`
    SELECT COUNT(*)::int as count
    FROM tasks
    WHERE household_id = $1
      AND deadline::date >= CURRENT_DATE
      AND deadline::date <= CURRENT_DATE + INTERVAL '7 days'
      AND status IN ('pending', 'postponed')
  `, [householdId])
  const weekCount = weekCountResult?.count || 0

  // Send to each member who has email enabled
  for (const member of members) {
    if (!member.email_enabled) {
      continue
    }

    const emailData = generateDailyDigestEmail({
      userName: member.name || "Utilisateur",
      householdName: household.name,
      date: new Date().toISOString(),
      todayTasks,
      overdueTasks,
      weekCount,
      streakCurrent: household.streak_current,
      streakBest: household.streak_best,
      appUrl: APP_URL,
    })

    const success = await sendEmail({
      to: member.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })

    if (success) {
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}

// ============================================================
// SEND STREAK ALERT
// ============================================================

export async function sendStreakAlert(householdId: string): Promise<{
  sent: number
  failed: number
}> {
  let sent = 0
  let failed = 0

  // Get household details
  const household = await queryOne<Household>(`
    SELECT id, name, streak_current, streak_best, timezone
    FROM households
    WHERE id = $1
  `, [householdId])

  if (!household || household.streak_current === 0) {
    return { sent: 0, failed: 0 }
  }

  // Check if there are uncompleted critical tasks for today
  const criticalTask = await queryOne<{ id: string; title: string }>(`
    SELECT id, title
    FROM tasks
    WHERE household_id = $1
      AND is_critical = true
      AND deadline::date = CURRENT_DATE
      AND status = 'pending'
    LIMIT 1
  `, [householdId])

  if (!criticalTask) {
    // No uncompleted critical tasks, no alert needed
    return { sent: 0, failed: 0 }
  }

  // Get members
  const members = await query<HouseholdMember>(`
    SELECT
      hm.user_id,
      u.email,
      u.name,
      COALESCE(up.email_enabled, true) as email_enabled
    FROM household_members hm
    JOIN users u ON u.id = hm.user_id
    LEFT JOIN user_preferences up ON up.user_id = hm.user_id
    WHERE hm.household_id = $1 AND hm.is_active = true
  `, [householdId])

  for (const member of members) {
    if (!member.email_enabled) {
      continue
    }

    const emailData = generateStreakWarningEmail({
      userName: member.name || "Utilisateur",
      householdName: household.name,
      streakCurrent: household.streak_current,
      streakBest: household.streak_best,
      criticalTaskTitle: criticalTask.title,
      criticalTaskId: criticalTask.id,
      appUrl: APP_URL,
    })

    const success = await sendEmail({
      to: member.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })

    if (success) {
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}

// ============================================================
// SEND DEADLINE WARNING
// ============================================================

export async function sendDeadlineWarning(taskId: string): Promise<boolean> {
  // Get task with assigned user
  const task = await queryOne<
    TaskListItem & {
      household_id: string
      assigned_to: string | null
      created_by: string
    }
  >(`
    SELECT
      t.id,
      t.title,
      t.description,
      t.priority,
      t.is_critical,
      t.deadline::text,
      t.household_id,
      t.assigned_to,
      t.created_by,
      c.first_name as child_name,
      tc.name_fr as category_name
    FROM tasks t
    LEFT JOIN children c ON t.child_id = c.id
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.id = $1 AND t.status = 'pending'
  `, [taskId])

  if (!task || !task.deadline) {
    return false
  }

  const targetUserId = task.assigned_to || task.created_by

  // Get user details
  const user = await queryOne<{
    email: string
    name: string | null
    email_enabled: boolean
    reminder_before_deadline_hours: number
  }>(`
    SELECT
      u.email,
      u.name,
      COALESCE(up.email_enabled, true) as email_enabled,
      COALESCE(up.reminder_before_deadline_hours, 24) as reminder_before_deadline_hours
    FROM users u
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE u.id = $1
  `, [targetUserId])

  if (!user || !user.email_enabled) {
    return false
  }

  const emailData = generateTaskReminderEmail({
    userName: user.name || "Utilisateur",
    taskTitle: task.title,
    taskDescription: task.description,
    deadline: task.deadline,
    priority: task.priority,
    is_critical: task.is_critical,
    childName: task.child_name,
    categoryName: task.category_name,
    appUrl: APP_URL,
    taskId: task.id,
  })

  return sendEmail({
    to: user.email,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  })
}

// ============================================================
// GET HOUSEHOLDS FOR NOTIFICATIONS
// ============================================================

export async function getHouseholdsForDailyDigest(): Promise<string[]> {
  const households = await query<{ id: string }>(`
    SELECT DISTINCT h.id
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    JOIN user_preferences up ON up.user_id = hm.user_id
    WHERE hm.is_active = true
      AND up.email_enabled = true
      AND up.daily_reminder_time IS NOT NULL
  `)

  return households.map((h) => h.id)
}

// ============================================================
// GET TASKS NEEDING REMINDERS
// ============================================================

export async function getTasksNeedingReminders(): Promise<
  Array<{ task_id: string; user_id: string }>
> {
  // Get tasks that:
  // 1. Have a deadline within the user's reminder_before_deadline_hours
  // 2. Haven't been reminded yet today
  // 3. Are still pending
  const tasks = await query<{ task_id: string; user_id: string }>(`
    SELECT t.id as task_id, COALESCE(t.assigned_to, t.created_by) as user_id
    FROM tasks t
    JOIN household_members hm ON hm.household_id = t.household_id
    JOIN user_preferences up ON up.user_id = COALESCE(t.assigned_to, t.created_by)
    WHERE t.status = 'pending'
      AND t.deadline IS NOT NULL
      AND t.deadline::date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(up.reminder_before_deadline_hours, 24) / 24
      AND t.deadline::date >= CURRENT_DATE
      AND up.email_enabled = true
      AND (t.last_reminder_at IS NULL OR t.last_reminder_at::date < CURRENT_DATE)
  `)

  return tasks
}
