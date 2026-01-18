-- ============================================================
-- FAMILYLOAD - AWS RDS SCHEMA
-- PostgreSQL avec Cognito Auth (pas Supabase)
-- ============================================================

-- === EXTENSIONS ===
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- AUTH SCHEMA (Mock Supabase auth for compatibility)
-- ============================================================

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Function to get current user ID (set via app.current_user_id)
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
BEGIN
    -- Get user ID from session variable set by the application
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NULL
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- PUBLIC SCHEMA TABLES
-- ============================================================

-- === USERS ===
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT, -- Display name (optional)
    auth_provider TEXT DEFAULT 'cognito', -- cognito, google, apple
    language TEXT DEFAULT 'fr',
    timezone TEXT DEFAULT 'Europe/Paris',
    role TEXT DEFAULT 'parent_principal', -- parent_principal, co_parent, tiers
    avatar_url TEXT,
    device_tokens JSONB DEFAULT '[]',
    notification_preferences JSONB DEFAULT '{"push": true, "email": true, "reminder_time": "08:00"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === HOUSEHOLDS (FOYERS) ===
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country TEXT DEFAULT 'FR',
    timezone TEXT DEFAULT 'Europe/Paris',
    streak_current INT DEFAULT 0,
    streak_best INT DEFAULT 0,
    streak_last_update DATE DEFAULT CURRENT_DATE,
    subscription_status TEXT DEFAULT 'trial', -- trial, active, cancelled, expired
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === HOUSEHOLD MEMBERS ===
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Cognito user ID (sub)
    role TEXT DEFAULT 'co_parent', -- parent_principal, co_parent, tiers
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(household_id, user_id)
);

-- === INVITATIONS ===
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'co_parent',
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === CHILDREN (ENFANTS) ===
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    birthdate DATE NOT NULL,
    gender TEXT, -- M, F, null
    school_name TEXT,
    school_level TEXT, -- maternelle, primaire, college, lycee
    school_class TEXT, -- PS, MS, GS, CP, CE1, etc.
    tags JSONB DEFAULT '[]', -- ["allergie_gluten", "PAP", etc.]
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === TASK CATEGORIES ===
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- ecole, sante, admin, quotidien, social, activites, logistique
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INT DEFAULT 0
);

-- === TASK TEMPLATES (CATALOGUE AUTOMATIQUE) ===
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country TEXT DEFAULT 'FR',
    category_id UUID REFERENCES task_categories(id),
    age_min INT, -- null = tous âges
    age_max INT,
    school_level TEXT, -- null = tous niveaux
    title_fr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    recurrence_rule JSONB, -- {"type": "yearly", "month": 9, "day": 1} pour rentrée
    period_trigger TEXT, -- rentree, vacances_ete, janvier, etc.
    default_deadline_days INT DEFAULT 7,
    load_weight INT DEFAULT 3,
    is_critical BOOLEAN DEFAULT false, -- si true, casse le streak
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === TASKS ===
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    category_id UUID REFERENCES task_categories(id),
    template_id UUID REFERENCES task_templates(id), -- null si vocal/manuel

    title TEXT NOT NULL,
    description TEXT,

    source TEXT NOT NULL, -- auto, vocal, manual
    vocal_transcript TEXT, -- si source = vocal
    vocal_audio_url TEXT,

    status TEXT DEFAULT 'pending', -- pending, done, postponed, cancelled
    priority TEXT DEFAULT 'normal', -- low, normal, high, critical

    deadline DATE,
    deadline_flexible BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE,
    postponed_to DATE,

    assigned_to UUID, -- Cognito user ID
    created_by UUID, -- Cognito user ID

    load_weight INT DEFAULT 3,
    is_critical BOOLEAN DEFAULT false,

    recurrence_rule JSONB,
    parent_task_id UUID REFERENCES tasks(id), -- pour récurrence

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === TASK HISTORY (AUDIT) ===
CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID, -- Cognito user ID
    action TEXT NOT NULL, -- created, assigned, completed, postponed, cancelled
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === LOAD BALANCE (CHARGE MENTALE) ===
CREATE TABLE IF NOT EXISTS load_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID, -- Cognito user ID
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_load INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === STREAKS ===
CREATE TABLE IF NOT EXISTS streak_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    streak_value INT NOT NULL,
    was_broken BOOLEAN DEFAULT false,
    joker_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, streak_date)
);

-- === NOTIFICATIONS ===
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Cognito user ID
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- reminder, alert, streak, load_imbalance
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === SUBSCRIPTIONS ===
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    status TEXT DEFAULT 'trial', -- trial, active, past_due, cancelled
    plan TEXT DEFAULT 'monthly', -- monthly, yearly
    amount INT, -- en centimes
    currency TEXT DEFAULT 'EUR',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_child ON tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_children_household ON children(household_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);

-- ============================================================
-- RLS POLICIES (Application-level enforcement with auth.uid())
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "households_select" ON households;
DROP POLICY IF EXISTS "members_select" ON household_members;
DROP POLICY IF EXISTS "children_select" ON children;
DROP POLICY IF EXISTS "children_insert" ON children;
DROP POLICY IF EXISTS "children_update" ON children;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "invitations_select" ON invitations;
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
DROP POLICY IF EXISTS "task_categories_select_all" ON task_categories;
DROP POLICY IF EXISTS "task_templates_select_public" ON task_templates;
DROP POLICY IF EXISTS "task_history_select" ON task_history;
DROP POLICY IF EXISTS "task_history_insert" ON task_history;
DROP POLICY IF EXISTS "load_snapshots_select" ON load_snapshots;
DROP POLICY IF EXISTS "load_snapshots_insert" ON load_snapshots;
DROP POLICY IF EXISTS "streak_history_select" ON streak_history;
DROP POLICY IF EXISTS "streak_history_insert" ON streak_history;
DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON subscriptions;

-- Users can only see themselves
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Household members can see their household
CREATE POLICY "households_select" ON households FOR SELECT
    USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Members can see other members of their household
CREATE POLICY "members_select" ON household_members FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Children visible to household members
CREATE POLICY "children_select" ON children FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "children_insert" ON children FOR INSERT
    WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "children_update" ON children FOR UPDATE
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Tasks visible to household members
CREATE POLICY "tasks_select" ON tasks FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
    WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Notifications for own user
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Invitations for household members
CREATE POLICY "invitations_select" ON invitations FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "invitations_insert" ON invitations FOR INSERT
    WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Task categories - public read (reference data)
CREATE POLICY "task_categories_select_all" ON task_categories FOR SELECT USING (true);

-- Task templates - public read for active templates (catalog)
CREATE POLICY "task_templates_select_public" ON task_templates FOR SELECT USING (is_active = true);

-- Task history - household member scope via task
CREATE POLICY "task_history_select" ON task_history FOR SELECT
    USING (task_id IN (
        SELECT t.id FROM tasks t
        WHERE t.household_id IN (
            SELECT hm.household_id FROM household_members hm
            WHERE hm.user_id = auth.uid()
        )
    ));
CREATE POLICY "task_history_insert" ON task_history FOR INSERT
    WITH CHECK (task_id IN (
        SELECT t.id FROM tasks t
        WHERE t.household_id IN (
            SELECT hm.household_id FROM household_members hm
            WHERE hm.user_id = auth.uid()
        )
    ));

-- Load snapshots - household member scope
CREATE POLICY "load_snapshots_select" ON load_snapshots FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "load_snapshots_insert" ON load_snapshots FOR INSERT
    WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Streak history - household member scope
CREATE POLICY "streak_history_select" ON streak_history FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "streak_history_insert" ON streak_history FOR INSERT
    WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Subscriptions - household member scope
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT
    WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));
CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Fonction pour calculer l'âge
CREATE OR REPLACE FUNCTION calculate_age(birthdate DATE)
RETURNS INT AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, birthdate));
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS users_updated_at ON users;
DROP TRIGGER IF EXISTS households_updated_at ON households;
DROP TRIGGER IF EXISTS children_updated_at ON children;
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;

-- Create triggers
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert categories only if they don't exist
INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order)
SELECT 'ecole', 'École', 'School', '🏫', '#4CAF50', 1
WHERE NOT EXISTS (SELECT 1 FROM task_categories WHERE code = 'ecole');

INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order)
SELECT 'sante', 'Santé', 'Health', '🏥', '#F44336', 2
WHERE NOT EXISTS (SELECT 1 FROM task_categories WHERE code = 'sante');

INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order)
SELECT 'admin', 'Administratif', 'Administrative', '📋', '#2196F3', 3
WHERE NOT EXISTS (SELECT 1 FROM task_categories WHERE code = 'admin');

INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order)
SELECT 'quotidien', 'Quotidien', 'Daily', '🏠', '#FF9800', 4
WHERE NOT EXISTS (SELECT 1 FROM task_categories WHERE code = 'quotidien');

INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order)
SELECT 'social', 'Social', 'Social', '🎉', '#9C27B0', 5
WHERE NOT EXISTS (SELECT 1 FROM task_categories WHERE code = 'social');

INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order)
SELECT 'activites', 'Activités', 'Activities', '⚽', '#00BCD4', 6
WHERE NOT EXISTS (SELECT 1 FROM task_categories WHERE code = 'activites');

INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order)
SELECT 'logistique', 'Logistique', 'Logistics', '🚗', '#795548', 7
WHERE NOT EXISTS (SELECT 1 FROM task_categories WHERE code = 'logistique');

-- ============================================================
-- GRANT PERMISSIONS (for RDS user)
-- ============================================================

-- Grant usage on auth schema
GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
