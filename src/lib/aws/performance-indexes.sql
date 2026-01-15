-- ============================================================
-- FAMILYLOAD - PERFORMANCE OPTIMIZATION INDEXES
-- Sprint 12 Phase 5
-- ============================================================

-- === CRITICAL INDEXES FOR COMMON QUERIES ===

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

-- Vocal commands (if table exists)
CREATE INDEX IF NOT EXISTS idx_vocal_commands_household ON vocal_commands(household_id, created_at DESC);

-- Generated tasks
CREATE INDEX IF NOT EXISTS idx_generated_tasks_household_status ON generated_tasks(household_id, status);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_template ON generated_tasks(template_id, child_id);

-- Device tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id) WHERE is_active = true;

-- === PARTIAL INDEXES FOR FILTERED QUERIES ===

-- Only pending tasks (most common filter)
CREATE INDEX IF NOT EXISTS idx_tasks_pending ON tasks(household_id, deadline) WHERE status = 'pending';

-- Only overdue tasks
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(household_id, deadline) WHERE status = 'pending' AND deadline < CURRENT_DATE;

-- High priority tasks
CREATE INDEX IF NOT EXISTS idx_tasks_high_priority ON tasks(household_id, deadline) WHERE priority IN ('high', 'critical');

-- === COMPOSITE INDEXES FOR DASHBOARD QUERIES ===

-- Dashboard: User's tasks by status and deadline
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_deadline ON tasks(assigned_to, status, deadline) WHERE assigned_to IS NOT NULL;

-- Dashboard: Household overview (tasks per child)
CREATE INDEX IF NOT EXISTS idx_tasks_child_household_status ON tasks(child_id, household_id, status);

-- === GIN INDEXES FOR JSONB QUERIES ===

-- Task metadata (if queried frequently)
CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN (metadata);

-- Children tags
CREATE INDEX IF NOT EXISTS idx_children_tags ON children USING GIN (tags);

-- === ANALYZE TABLES AFTER INDEX CREATION ===
ANALYZE tasks;
ANALYZE household_members;
ANALYZE children;
ANALYZE notifications;
ANALYZE streak_history;
