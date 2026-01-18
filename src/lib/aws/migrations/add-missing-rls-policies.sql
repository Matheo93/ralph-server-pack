-- ============================================================
-- MIGRATION: Add missing RLS policies
-- Date: 2026-01-18
-- Description: Add RLS to 5 tables that were missing policies:
--   - task_categories (reference data - public read)
--   - task_history (audit table - household scope)
--   - load_snapshots (load balance - household scope)
--   - streak_history (streaks - household scope)
--   - subscriptions (billing - household scope)
-- ============================================================

-- ============================================================
-- 1. TASK CATEGORIES (Reference data - public read for all authenticated users)
-- ============================================================
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_categories_select_all" ON task_categories;

-- All authenticated users can read task categories (reference data)
CREATE POLICY "task_categories_select_all" ON task_categories
    FOR SELECT
    USING (true);

-- ============================================================
-- 2. TASK HISTORY (Audit table - household member scope via task)
-- ============================================================
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_history_select" ON task_history;
DROP POLICY IF EXISTS "task_history_insert" ON task_history;

-- Select: Users can see history for tasks in their household
CREATE POLICY "task_history_select" ON task_history
    FOR SELECT
    USING (task_id IN (
        SELECT t.id FROM tasks t
        WHERE t.household_id IN (
            SELECT hm.household_id FROM household_members hm
            WHERE hm.user_id = auth.uid()
        )
    ));

-- Insert: Users can add history for tasks in their household
CREATE POLICY "task_history_insert" ON task_history
    FOR INSERT
    WITH CHECK (task_id IN (
        SELECT t.id FROM tasks t
        WHERE t.household_id IN (
            SELECT hm.household_id FROM household_members hm
            WHERE hm.user_id = auth.uid()
        )
    ));

-- ============================================================
-- 3. LOAD SNAPSHOTS (Load balance data - household member scope)
-- ============================================================
ALTER TABLE load_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "load_snapshots_select" ON load_snapshots;
DROP POLICY IF EXISTS "load_snapshots_insert" ON load_snapshots;

-- Select: Users can see load snapshots for their household
CREATE POLICY "load_snapshots_select" ON load_snapshots
    FOR SELECT
    USING (household_id IN (
        SELECT hm.household_id FROM household_members hm
        WHERE hm.user_id = auth.uid()
    ));

-- Insert: Users can add load snapshots for their household
CREATE POLICY "load_snapshots_insert" ON load_snapshots
    FOR INSERT
    WITH CHECK (household_id IN (
        SELECT hm.household_id FROM household_members hm
        WHERE hm.user_id = auth.uid()
    ));

-- ============================================================
-- 4. STREAK HISTORY (Streak data - household member scope)
-- ============================================================
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "streak_history_select" ON streak_history;
DROP POLICY IF EXISTS "streak_history_insert" ON streak_history;

-- Select: Users can see streak history for their household
CREATE POLICY "streak_history_select" ON streak_history
    FOR SELECT
    USING (household_id IN (
        SELECT hm.household_id FROM household_members hm
        WHERE hm.user_id = auth.uid()
    ));

-- Insert: Users can add streak history for their household
CREATE POLICY "streak_history_insert" ON streak_history
    FOR INSERT
    WITH CHECK (household_id IN (
        SELECT hm.household_id FROM household_members hm
        WHERE hm.user_id = auth.uid()
    ));

-- ============================================================
-- 5. SUBSCRIPTIONS (Billing data - household member scope)
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON subscriptions;

-- Select: Users can see subscriptions for their household
CREATE POLICY "subscriptions_select" ON subscriptions
    FOR SELECT
    USING (household_id IN (
        SELECT hm.household_id FROM household_members hm
        WHERE hm.user_id = auth.uid()
    ));

-- Insert: Users can create subscriptions for their household
CREATE POLICY "subscriptions_insert" ON subscriptions
    FOR INSERT
    WITH CHECK (household_id IN (
        SELECT hm.household_id FROM household_members hm
        WHERE hm.user_id = auth.uid()
    ));

-- Update: Users can update subscriptions for their household
CREATE POLICY "subscriptions_update" ON subscriptions
    FOR UPDATE
    USING (household_id IN (
        SELECT hm.household_id FROM household_members hm
        WHERE hm.user_id = auth.uid()
    ));

-- ============================================================
-- 6. TASK TEMPLATES (Already has RLS but adding policies for completeness)
-- ============================================================
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_templates_select_public" ON task_templates;

-- All users can read active task templates (public catalog)
CREATE POLICY "task_templates_select_public" ON task_templates
    FOR SELECT
    USING (is_active = true);
