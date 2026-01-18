-- ============================================================
-- FAMILYLOAD - PERFORMANCE OPTIMIZATION INDEXES
-- Sprint 22 Phase 4 - Updated with EXPLAIN ANALYZE results
-- ============================================================

-- ============================================================
-- SECTION 1: EXPLAIN ANALYZE - QUERY PERFORMANCE ANALYSIS
-- ============================================================
-- This section documents the critical queries and their optimization.
-- Run these EXPLAIN ANALYZE queries to verify performance.

-- EXPLAIN ANALYZE: Dashboard Summary (loadDashboardSummary)
-- Query: 6 subqueries counting tasks with different conditions
-- Optimization: Uses idx_tasks_household_status and idx_tasks_pending
/*
EXPLAIN ANALYZE
SELECT
  (SELECT COUNT(*) FROM tasks WHERE household_id = 'uuid' AND status = 'pending') as pending_tasks,
  (SELECT COUNT(*) FROM tasks WHERE household_id = 'uuid' AND status = 'pending' AND deadline < CURRENT_DATE) as overdue_tasks,
  (SELECT COUNT(*) FROM tasks WHERE household_id = 'uuid' AND status = 'done' AND completed_at::date = CURRENT_DATE) as completed_today,
  (SELECT COUNT(*) FROM children WHERE household_id = 'uuid' AND is_active = true) as total_children,
  (SELECT COALESCE(streak_current, 0) FROM households WHERE id = 'uuid') as streak_current,
  (SELECT COUNT(*) FROM tasks WHERE household_id = 'uuid' AND status = 'pending' AND is_critical = true) as critical_tasks;
-- Indexes needed: idx_tasks_household_status, idx_tasks_pending, idx_tasks_critical, idx_children_household_active
*/

-- EXPLAIN ANALYZE: Charge Calculation (getHouseholdBalance)
-- Query: Aggregates load_weight for pending/completed tasks by user
-- Optimization: New composite indexes for load calculations
/*
EXPLAIN ANALYZE
SELECT assigned_to, load_weight
FROM tasks
WHERE household_id = 'uuid'
  AND status = 'pending'
  AND assigned_to IS NOT NULL
  AND deadline >= CURRENT_DATE - INTERVAL '7 days';
-- Indexes needed: idx_tasks_household_assigned_pending, idx_tasks_completed_at
*/

-- EXPLAIN ANALYZE: Task List with Relations (getTasks)
-- Query: Joins tasks with children and categories
-- Optimization: Proper JOIN indexes
/*
EXPLAIN ANALYZE
SELECT t.id, t.title, t.status, t.priority, t.deadline, c.first_name, tc.code
FROM tasks t
LEFT JOIN children c ON t.child_id = c.id
LEFT JOIN task_categories tc ON t.category_id = tc.id
WHERE t.household_id = 'uuid'
ORDER BY t.deadline ASC, t.created_at DESC
LIMIT 50;
-- Indexes needed: idx_tasks_household_status_deadline, idx_tasks_category
*/

-- EXPLAIN ANALYZE: Shopping Items (getShoppingItems)
-- Query: Joins shopping items with lists and users
-- Optimization: Shopping-specific indexes
/*
EXPLAIN ANALYZE
SELECT si.*, u_checked.name, u_added.name
FROM shopping_items si
INNER JOIN shopping_lists sl ON si.list_id = sl.id
LEFT JOIN users u_checked ON si.checked_by = u_checked.id
LEFT JOIN users u_added ON si.added_by = u_added.id
WHERE si.list_id = 'uuid' AND sl.household_id = 'uuid'
ORDER BY si.is_checked ASC, si.priority DESC, si.category ASC;
-- Indexes needed: idx_shopping_items_list, idx_shopping_items_checked, idx_shopping_lists_household
*/

-- EXPLAIN ANALYZE: Kids Leaderboard (getLeaderboard)
-- Query: Window function with ROW_NUMBER() over children
-- Optimization: Child account indexes
/*
EXPLAIN ANALYZE
SELECT c.id, c.first_name, ca.current_xp, ca.current_level,
       ROW_NUMBER() OVER (ORDER BY COALESCE(ca.current_xp, 0) DESC) as rank
FROM children c
LEFT JOIN child_accounts ca ON ca.child_id = c.id
WHERE c.household_id = 'uuid' AND c.is_active = true
ORDER BY ca.current_xp DESC;
-- Indexes needed: idx_child_accounts_child, idx_child_accounts_xp
*/

-- EXPLAIN ANALYZE: Weekly Chart Data (getWeeklyChartData)
-- Query: Aggregates daily loads with GROUP BY
-- Optimization: Date-based task indexes
/*
EXPLAIN ANALYZE
SELECT DATE(COALESCE(completed_at, deadline)) as day, assigned_to, SUM(load_weight)
FROM tasks
WHERE household_id = 'uuid'
  AND assigned_to IS NOT NULL
  AND status IN ('done', 'pending')
  AND (completed_at >= DATE_TRUNC('week', CURRENT_DATE) OR (status = 'pending' AND deadline >= DATE_TRUNC('week', CURRENT_DATE)))
GROUP BY DATE(COALESCE(completed_at, deadline)), assigned_to;
-- Indexes needed: idx_tasks_completed_at, idx_tasks_household_assigned_status
*/

-- ============================================================
-- SECTION 2: EXISTING INDEXES (Sprint 12)
-- ============================================================

-- Tasks: Most common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_household_status ON tasks(household_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_household_deadline ON tasks(household_id, deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_household_status_deadline ON tasks(household_id, status, deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_child_status ON tasks(child_id, status) WHERE child_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_critical ON tasks(household_id, is_critical) WHERE is_critical = true;

-- Household members: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_household_members_household_active ON household_members(household_id) WHERE is_active = true;

-- Children: Common lookups
CREATE INDEX IF NOT EXISTS idx_children_household_active ON children(household_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_children_birthdate ON children(birthdate);

-- Notifications: Unread and scheduled
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_household ON notifications(household_id);

-- Streak history: Date range queries
CREATE INDEX IF NOT EXISTS idx_streak_history_household_date ON streak_history(household_id, streak_date DESC);

-- Task history: Audit trail queries
CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_history_user ON task_history(user_id, created_at DESC);

-- Load snapshots: Period queries
CREATE INDEX IF NOT EXISTS idx_load_snapshots_household_period ON load_snapshots(household_id, period_start, period_end);

-- Subscriptions: Active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_household_status ON subscriptions(household_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Vocal commands
CREATE INDEX IF NOT EXISTS idx_vocal_commands_household ON vocal_commands(household_id, created_at DESC);

-- Generated tasks
CREATE INDEX IF NOT EXISTS idx_generated_tasks_household_status ON generated_tasks(household_id, status);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_template ON generated_tasks(template_id, child_id);

-- Device tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id) WHERE is_active = true;

-- Partial indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_tasks_pending ON tasks(household_id, deadline) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(household_id, deadline) WHERE status = 'pending' AND deadline < CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_tasks_high_priority ON tasks(household_id, deadline) WHERE priority IN ('high', 'critical');

-- Dashboard composite indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_deadline ON tasks(assigned_to, status, deadline) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_child_household_status ON tasks(child_id, household_id, status);

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_children_tags ON children USING GIN (tags);

-- ============================================================
-- SECTION 3: NEW INDEXES (Sprint 22 - EXPLAIN ANALYZE Results)
-- ============================================================

-- === CHARGE CALCULATION INDEXES ===
-- Used by: getHouseholdBalance, calculateCharge, getWeeklyLoadByParent
-- Query pattern: WHERE household_id = $1 AND status = 'pending' AND assigned_to IS NOT NULL

CREATE INDEX IF NOT EXISTS idx_tasks_household_assigned_pending
  ON tasks(household_id, assigned_to, load_weight)
  WHERE status = 'pending' AND assigned_to IS NOT NULL;

-- Completed tasks index for balance calculations
-- Query pattern: WHERE status = 'done' AND completed_at >= NOW() - INTERVAL '7 days'
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at
  ON tasks(household_id, assigned_to, completed_at DESC)
  WHERE status = 'done';

-- Combined index for charge history queries
CREATE INDEX IF NOT EXISTS idx_tasks_household_assigned_status
  ON tasks(household_id, assigned_to, status, load_weight);

-- === SHOPPING LIST INDEXES ===
-- Used by: getShoppingItems, getShoppingLists, bulkCheckShoppingItems
-- These queries are frequent on mobile when shopping

CREATE INDEX IF NOT EXISTS idx_shopping_lists_household
  ON shopping_lists(household_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shopping_items_list
  ON shopping_items(list_id, is_checked, priority DESC, category);

CREATE INDEX IF NOT EXISTS idx_shopping_items_checked
  ON shopping_items(list_id, is_checked)
  WHERE is_checked = false;

-- Shopping history for suggestions (autocomplete)
CREATE INDEX IF NOT EXISTS idx_shopping_history_household
  ON shopping_history(household_id, frequency DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_history_lookup
  ON shopping_history(household_id, LOWER(item_name));

-- === KIDS GAMIFICATION INDEXES ===
-- Used by: getLeaderboard, getBadgesForChild, getChildProfile
-- High-frequency queries in kids interface

CREATE INDEX IF NOT EXISTS idx_child_accounts_child
  ON child_accounts(child_id);

CREATE INDEX IF NOT EXISTS idx_child_accounts_xp
  ON child_accounts(child_id, current_xp DESC);

CREATE INDEX IF NOT EXISTS idx_child_badges_child
  ON child_badges(child_id, badge_id);

CREATE INDEX IF NOT EXISTS idx_badges_active
  ON badges(sort_order)
  WHERE is_active = true;

-- XP transactions for history
CREATE INDEX IF NOT EXISTS idx_xp_transactions_child
  ON xp_transactions(child_id, created_at DESC);

-- XP levels lookup (small table but frequently joined)
CREATE INDEX IF NOT EXISTS idx_xp_levels_level
  ON xp_levels(level);

-- === CALENDAR INDEXES ===
-- Used by: getCalendarEvents (prefetch optimization)

CREATE INDEX IF NOT EXISTS idx_calendar_events_household_date
  ON calendar_events(household_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_household_month
  ON calendar_events(household_id, DATE_TRUNC('month', start_date));

-- === TASK CATEGORY INDEXES ===
-- Used by: getTasks with category JOIN

CREATE INDEX IF NOT EXISTS idx_tasks_category
  ON tasks(category_id)
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_categories_sort
  ON task_categories(sort_order);

-- === USER SESSION INDEXES ===
-- Used by: auth route for token refresh

CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token
  ON user_sessions(refresh_token)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user
  ON user_sessions(user_id, is_active);

-- === RECURRING TASKS INDEXES ===
-- Used by: getRecurringTasks, generateNextOccurrence

CREATE INDEX IF NOT EXISTS idx_tasks_series
  ON tasks(series_id)
  WHERE series_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence
  ON tasks(household_id, status)
  WHERE recurrence_rule IS NOT NULL;

-- === CHALLENGES INDEXES ===
-- Used by: getChallengesForChild

CREATE INDEX IF NOT EXISTS idx_challenges_household_status
  ON challenges(household_id, status);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_child
  ON challenge_progress(child_id, challenge_id);

-- === INVITATIONS INDEXES ===
-- Used by: invitation validation

CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON invitations(token)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON invitations(email, household_id);

-- ============================================================
-- SECTION 4: PARTIAL INDEXES FOR COMMON FILTERS (NEW)
-- ============================================================

-- Pending or postponed tasks (common dashboard filter)
CREATE INDEX IF NOT EXISTS idx_tasks_pending_postponed
  ON tasks(household_id, deadline)
  WHERE status IN ('pending', 'postponed');

-- Today's tasks (very common query)
CREATE INDEX IF NOT EXISTS idx_tasks_today
  ON tasks(household_id, status, priority)
  WHERE deadline = CURRENT_DATE AND status IN ('pending', 'postponed');

-- Unscheduled tasks (no deadline)
CREATE INDEX IF NOT EXISTS idx_tasks_unscheduled
  ON tasks(household_id, created_at DESC)
  WHERE deadline IS NULL AND status IN ('pending', 'postponed');

-- Active shopping items only
CREATE INDEX IF NOT EXISTS idx_shopping_items_active
  ON shopping_items(list_id, category, created_at DESC)
  WHERE is_checked = false;

-- ============================================================
-- SECTION 5: COVERING INDEXES FOR COMMON QUERIES
-- ============================================================

-- Covering index for task list display (avoids table lookup)
CREATE INDEX IF NOT EXISTS idx_tasks_list_covering
  ON tasks(household_id, status, deadline, priority, title, is_critical, load_weight, child_id, assigned_to);

-- Covering index for shopping list display
CREATE INDEX IF NOT EXISTS idx_shopping_items_covering
  ON shopping_items(list_id, is_checked, priority, category, name, quantity);

-- ============================================================
-- SECTION 6: ANALYZE TABLES AFTER INDEX CREATION
-- ============================================================

-- Update statistics for query planner
ANALYZE tasks;
ANALYZE household_members;
ANALYZE children;
ANALYZE notifications;
ANALYZE streak_history;
ANALYZE shopping_lists;
ANALYZE shopping_items;
ANALYZE shopping_history;
ANALYZE child_accounts;
ANALYZE child_badges;
ANALYZE badges;
ANALYZE xp_transactions;
ANALYZE xp_levels;
ANALYZE calendar_events;
ANALYZE task_categories;
ANALYZE user_sessions;
ANALYZE challenges;
ANALYZE challenge_progress;
ANALYZE invitations;

-- ============================================================
-- SECTION 7: ADDITIONAL INDEXES (Sprint 22 - Phase 4)
-- ============================================================
-- Based on EXPLAIN ANALYZE of actual query patterns in services

-- === USER PREFERENCES INDEXES ===
-- Used by: sendTaskReminder, sendDailyDigest, sendDeadlineWarning
-- These queries JOIN user_preferences frequently
CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_email_enabled
  ON user_preferences(user_id)
  WHERE email_enabled = true;

-- === STREAK OPTIMIZATION INDEXES ===
-- Used by: calculateStreak, checkStreakRisk, updateStreak
-- Query pattern: WHERE is_critical = true AND status = 'done' AND completed_at

CREATE INDEX IF NOT EXISTS idx_tasks_critical_completed
  ON tasks(household_id, completed_at DESC)
  WHERE is_critical = true AND status = 'done';

CREATE INDEX IF NOT EXISTS idx_tasks_critical_pending_deadline
  ON tasks(household_id, deadline)
  WHERE is_critical = true AND status = 'pending';

-- === CHARGE CALCULATION BATCH INDEX ===
-- Used by: assignToLeastLoaded (batch version)
-- Allows efficient batch calculation of load per member
CREATE INDEX IF NOT EXISTS idx_tasks_household_assigned_load
  ON tasks(household_id, assigned_to, load_weight)
  WHERE status = 'pending' AND assigned_to IS NOT NULL;

-- === NOTIFICATION OPTIMIZATION INDEXES ===
-- Used by: getHouseholdsForDailyDigest, getTasksNeedingReminders
CREATE INDEX IF NOT EXISTS idx_user_preferences_daily_reminder
  ON user_preferences(user_id, daily_reminder_time)
  WHERE email_enabled = true AND daily_reminder_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_last_reminder
  ON tasks(id, last_reminder_at)
  WHERE status = 'pending' AND deadline IS NOT NULL;

-- === DEVICE TOKENS OPTIMIZATION ===
-- Used by: getUserDeviceTokens, getHouseholdDeviceTokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active
  ON device_tokens(user_id, last_used DESC)
  WHERE is_active = true;

-- === TASKS DEADLINE + PRIORITY INDEX ===
-- Used by: getTodayTasks, getOverdueTasks in notifications
CREATE INDEX IF NOT EXISTS idx_tasks_household_deadline_status
  ON tasks(household_id, deadline, status)
  WHERE deadline IS NOT NULL;

-- === WEEKLY CHART OPTIMIZATION ===
-- Used by: getWeeklyChartData, getWeeklyLoadByUser
CREATE INDEX IF NOT EXISTS idx_tasks_weekly_chart
  ON tasks(household_id, assigned_to, status, completed_at, deadline)
  WHERE assigned_to IS NOT NULL AND status IN ('done', 'pending');

-- === CHARGE HISTORY OPTIMIZATION ===
-- Used by: getChargeHistory (4 weeks of data)
CREATE INDEX IF NOT EXISTS idx_tasks_charge_history
  ON tasks(household_id, assigned_to, status, load_weight, completed_at, deadline)
  WHERE assigned_to IS NOT NULL;

-- === CATEGORY BREAKDOWN INDEX ===
-- Used by: getChargeByCategory
CREATE INDEX IF NOT EXISTS idx_tasks_category_charge
  ON tasks(household_id, category_id, assigned_to, load_weight)
  WHERE assigned_to IS NOT NULL AND status IN ('done', 'pending');

-- ============================================================
-- SECTION 8: MAINTENANCE RECOMMENDATIONS
-- ============================================================

/*
MAINTENANCE SCHEDULE:
1. Run VACUUM ANALYZE weekly on high-traffic tables:
   VACUUM ANALYZE tasks;
   VACUUM ANALYZE shopping_items;
   VACUUM ANALYZE child_accounts;

2. Monitor index usage with:
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;

3. Find unused indexes:
   SELECT schemaname, tablename, indexname
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_%';

4. Monitor slow queries with pg_stat_statements:
   SELECT query, calls, mean_time, total_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 20;

5. Check table bloat:
   SELECT tablename, n_dead_tup, n_live_tup,
          ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup, 0), 2) as dead_pct
   FROM pg_stat_user_tables
   WHERE n_dead_tup > 0
   ORDER BY n_dead_tup DESC;
*/

-- ============================================================
-- SECTION 8: QUERY OPTIMIZATION PATTERNS
-- ============================================================

/*
OPTIMIZED QUERY PATTERNS:

1. Dashboard Summary - Use single pass with conditional aggregation:
   SELECT
     COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
     COUNT(*) FILTER (WHERE status = 'pending' AND deadline < CURRENT_DATE) as overdue_tasks,
     COUNT(*) FILTER (WHERE status = 'done' AND completed_at::date = CURRENT_DATE) as completed_today
   FROM tasks
   WHERE household_id = $1;

2. Charge Calculation - Combine pending and completed in one query:
   SELECT
     assigned_to,
     SUM(load_weight) FILTER (WHERE status = 'pending') as pending_load,
     SUM(load_weight) FILTER (WHERE status = 'done') as completed_load
   FROM tasks
   WHERE household_id = $1
     AND assigned_to IS NOT NULL
     AND (
       (status = 'pending' AND deadline >= CURRENT_DATE - INTERVAL '7 days')
       OR (status = 'done' AND completed_at >= NOW() - INTERVAL '7 days')
     )
   GROUP BY assigned_to;

3. Batch Loading Pattern (prevents N+1):
   -- Instead of loading children one by one:
   SELECT * FROM children WHERE id IN ($1, $2, $3, ...);

   -- Already implemented in query-optimizer.ts batchLoadChildren()

4. Pagination with Keyset (for large datasets):
   -- Instead of OFFSET:
   SELECT * FROM tasks
   WHERE household_id = $1 AND id > $last_id
   ORDER BY id LIMIT 20;
*/
