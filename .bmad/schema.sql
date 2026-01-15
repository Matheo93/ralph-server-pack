-- ============================================================
-- FAMILYLOAD - SCHEMA SQL COMPLET
-- PostgreSQL / Supabase
-- ============================================================

-- === EXTENSIONS ===
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- === USERS ===
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    auth_provider TEXT DEFAULT 'email', -- email, google, apple
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
CREATE TABLE households (
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
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'co_parent', -- parent_principal, co_parent, tiers
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(household_id, user_id)
);

-- === INVITATIONS ===
CREATE TABLE invitations (
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
CREATE TABLE children (
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
CREATE TABLE task_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- ecole, sante, admin, quotidien, social, activites, logistique
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INT DEFAULT 0
);

-- === TASK TEMPLATES (CATALOGUE AUTOMATIQUE) ===
CREATE TABLE task_templates (
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
CREATE TABLE tasks (
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

    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),

    load_weight INT DEFAULT 3,
    is_critical BOOLEAN DEFAULT false,

    recurrence_rule JSONB,
    parent_task_id UUID REFERENCES tasks(id), -- pour récurrence

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === TASK HISTORY (AUDIT) ===
CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL, -- created, assigned, completed, postponed, cancelled
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === LOAD BALANCE (CHARGE MENTALE) ===
CREATE TABLE load_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_load INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === STREAKS ===
CREATE TABLE streak_history (
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
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE subscriptions (
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

-- === INDEXES ===
CREATE INDEX idx_tasks_household ON tasks(household_id);
CREATE INDEX idx_tasks_child ON tasks(child_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_children_household ON children(household_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE is_sent = false;

-- === RLS POLICIES ===
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- === SEED DATA: CATEGORIES ===
INSERT INTO task_categories (code, name_fr, name_en, icon, color, sort_order) VALUES
    ('ecole', 'École', 'School', '🏫', '#4CAF50', 1),
    ('sante', 'Santé', 'Health', '🏥', '#F44336', 2),
    ('admin', 'Administratif', 'Administrative', '📋', '#2196F3', 3),
    ('quotidien', 'Quotidien', 'Daily', '🏠', '#FF9800', 4),
    ('social', 'Social', 'Social', '🎉', '#9C27B0', 5),
    ('activites', 'Activités', 'Activities', '⚽', '#00BCD4', 6),
    ('logistique', 'Logistique', 'Logistics', '🚗', '#795548', 7);

-- === SEED DATA: TASK TEMPLATES (FRANCE) ===
INSERT INTO task_templates (country, category_id, age_min, age_max, title_fr, title_en, period_trigger, default_deadline_days, load_weight, is_critical) VALUES
    -- École
    ('FR', (SELECT id FROM task_categories WHERE code = 'ecole'), 3, 18, 'Assurance scolaire', 'School insurance', 'rentree', 14, 4, true),
    ('FR', (SELECT id FROM task_categories WHERE code = 'ecole'), 3, 18, 'Fournitures scolaires', 'School supplies', 'rentree', 7, 5, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'ecole'), 3, 18, 'Réunion parents-profs', 'Parent-teacher meeting', null, 7, 4, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'ecole'), 3, 18, 'Photo de classe', 'Class photo', null, 14, 2, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'ecole'), 6, 18, 'Inscription cantine', 'Canteen registration', 'rentree', 7, 3, true),

    -- Santé
    ('FR', (SELECT id FROM task_categories WHERE code = 'sante'), 0, 2, 'Vaccin obligatoire', 'Mandatory vaccine', null, 30, 5, true),
    ('FR', (SELECT id FROM task_categories WHERE code = 'sante'), 0, 18, 'Visite médecin', 'Doctor visit', null, 30, 4, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'sante'), 3, 18, 'Rendez-vous dentiste', 'Dentist appointment', null, 60, 3, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'sante'), 0, 18, 'Renouvellement ordonnance', 'Prescription renewal', null, 7, 3, false),

    -- Administratif
    ('FR', (SELECT id FROM task_categories WHERE code = 'admin'), 0, 18, 'MAJ carte vitale', 'Health card update', null, 30, 3, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'admin'), 0, 18, 'Déclaration CAF', 'CAF declaration', null, 14, 4, true),

    -- Social
    ('FR', (SELECT id FROM task_categories WHERE code = 'social'), 3, 12, 'Anniversaire camarade', 'Friend birthday', null, 7, 3, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'social'), 0, 18, 'Cadeau anniversaire enfant', 'Child birthday gift', null, 14, 5, false),

    -- Activités
    ('FR', (SELECT id FROM task_categories WHERE code = 'activites'), 3, 18, 'Inscription activité', 'Activity registration', 'janvier', 14, 4, false),
    ('FR', (SELECT id FROM task_categories WHERE code = 'activites'), 3, 18, 'Réinscription activité', 'Activity re-registration', 'juin', 14, 3, false);

-- === FUNCTIONS ===

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

-- Triggers updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
