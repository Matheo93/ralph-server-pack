-- ============================================================
-- FAMILYLOAD KIDS - Interface Enfants Schema
-- Tables pour gamification, badges, XP, et récompenses
-- ============================================================

-- ============================================================
-- CHILD ACCOUNTS (Comptes enfants avec PIN)
-- ============================================================

CREATE TABLE IF NOT EXISTS child_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    current_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    streak_current INTEGER DEFAULT 0,
    streak_best INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id)
);

-- ============================================================
-- XP LEVELS (Configuration des niveaux)
-- ============================================================

CREATE TABLE IF NOT EXISTS xp_levels (
    level INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    xp_required INTEGER NOT NULL,
    icon VARCHAR(50)
);

-- Insert niveaux de base
INSERT INTO xp_levels (level, name, xp_required, icon) VALUES
(1, 'Débutant', 0, '🌱'),
(2, 'Apprenti', 100, '🌿'),
(3, 'Assistant', 300, '🌳'),
(4, 'Expert', 600, '⭐'),
(5, 'Champion', 1000, '🏆'),
(6, 'Super-Héros', 1500, '🦸'),
(7, 'Légende', 2500, '👑')
ON CONFLICT (level) DO NOTHING;

-- ============================================================
-- BADGES SYSTÈME
-- ============================================================

CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    condition_type VARCHAR(50) NOT NULL, -- tasks_completed, streak_days, level_reached, special
    condition_value INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert badges de base
INSERT INTO badges (slug, name, description, icon, condition_type, condition_value, xp_reward, sort_order) VALUES
('first_task', 'Première mission', 'Tu as complété ta première tâche !', '🎯', 'tasks_completed', 1, 10, 1),
('five_tasks', 'Sur la lancée', '5 tâches complétées', '✋', 'tasks_completed', 5, 25, 2),
('ten_tasks', 'Efficace', '10 tâches complétées', '🔟', 'tasks_completed', 10, 50, 3),
('twenty_five_tasks', 'Persévérant', '25 tâches complétées', '💪', 'tasks_completed', 25, 75, 4),
('fifty_tasks', 'Machine', '50 tâches complétées', '🤖', 'tasks_completed', 50, 100, 5),
('hundred_tasks', 'Centurion', '100 tâches complétées', '🏛️', 'tasks_completed', 100, 200, 6),
('streak_3', 'Régulier', '3 jours de suite', '🔥', 'streak_days', 3, 20, 10),
('streak_7', 'Semaine parfaite', '7 jours de suite', '💪', 'streak_days', 7, 50, 11),
('streak_14', 'Deux semaines', '14 jours de suite', '⚡', 'streak_days', 14, 100, 12),
('streak_30', 'Inarrêtable', '30 jours de suite', '🏆', 'streak_days', 30, 200, 13),
('early_bird', 'Lève-tôt', 'Tâche faite avant 9h', '🌅', 'special', 1, 15, 20),
('weekend_warrior', 'Guerrier du weekend', 'Tâche le samedi ET dimanche', '⚔️', 'special', 1, 30, 21),
('night_owl', 'Couche-tard', 'Tâche faite après 20h', '🦉', 'special', 1, 15, 22),
('level_5', 'Champion', 'Atteindre niveau 5', '🏅', 'level_reached', 5, 100, 30),
('level_7', 'Légende', 'Atteindre niveau 7', '👑', 'level_reached', 7, 250, 31)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- BADGES DÉBLOQUÉS PAR ENFANT
-- ============================================================

CREATE TABLE IF NOT EXISTS child_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    seen_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(child_id, badge_id)
);

-- ============================================================
-- HISTORIQUE XP
-- ============================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL, -- task_completed, badge_earned, bonus_streak, reward_spent
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PREUVES PHOTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS task_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    validated_by UUID, -- Cognito user ID (parent)
    validated_at TIMESTAMP WITH TIME ZONE,
    xp_awarded INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- RÉCOMPENSES (créées par parents)
-- ============================================================

CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    xp_cost INTEGER NOT NULL,
    reward_type VARCHAR(30) NOT NULL, -- screen_time, money, privilege, custom
    icon VARCHAR(50) DEFAULT '🎁',
    screen_time_minutes INTEGER,
    money_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    max_redemptions_per_week INTEGER, -- null = illimité
    created_by UUID, -- Cognito user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ÉCHANGES DE RÉCOMPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    reward_snapshot JSONB NOT NULL, -- Snapshot de la récompense au moment de l'échange
    xp_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, delivered
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_by UUID, -- Cognito user ID
    validated_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- CHILD STREAK HISTORY (séparé du foyer)
-- ============================================================

CREATE TABLE IF NOT EXISTS child_streak_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    streak_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id, streak_date)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_child_accounts_child ON child_accounts(child_id);
CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);
CREATE INDEX IF NOT EXISTS idx_child_badges_badge ON child_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_child ON xp_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_task_proofs_child ON task_proofs(child_id);
CREATE INDEX IF NOT EXISTS idx_task_proofs_task ON task_proofs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_proofs_status ON task_proofs(status);
CREATE INDEX IF NOT EXISTS idx_rewards_household ON rewards(household_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(household_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_redemptions_child ON reward_redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_child_streak_history_child ON child_streak_history(child_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE child_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_streak_history ENABLE ROW LEVEL SECURITY;

-- XP Levels: lecture publique
CREATE POLICY "xp_levels_select_all" ON xp_levels FOR SELECT USING (true);

-- Badges: lecture publique
CREATE POLICY "badges_select_all" ON badges FOR SELECT USING (true);

-- Child accounts: parents du foyer
CREATE POLICY "child_accounts_select" ON child_accounts FOR SELECT
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "child_accounts_insert" ON child_accounts FOR INSERT
    WITH CHECK (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "child_accounts_update" ON child_accounts FOR UPDATE
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));

-- Child badges: parents du foyer
CREATE POLICY "child_badges_select" ON child_badges FOR SELECT
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "child_badges_insert" ON child_badges FOR INSERT
    WITH CHECK (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));

-- XP transactions: parents du foyer
CREATE POLICY "xp_transactions_select" ON xp_transactions FOR SELECT
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "xp_transactions_insert" ON xp_transactions FOR INSERT
    WITH CHECK (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));

-- Task proofs: parents du foyer
CREATE POLICY "task_proofs_select" ON task_proofs FOR SELECT
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "task_proofs_insert" ON task_proofs FOR INSERT
    WITH CHECK (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "task_proofs_update" ON task_proofs FOR UPDATE
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));

-- Rewards: membres du foyer
CREATE POLICY "rewards_select" ON rewards FOR SELECT
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    ));
CREATE POLICY "rewards_insert" ON rewards FOR INSERT
    WITH CHECK (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    ));
CREATE POLICY "rewards_update" ON rewards FOR UPDATE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    ));
CREATE POLICY "rewards_delete" ON rewards FOR DELETE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    ));

-- Reward redemptions: parents du foyer
CREATE POLICY "reward_redemptions_select" ON reward_redemptions FOR SELECT
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "reward_redemptions_insert" ON reward_redemptions FOR INSERT
    WITH CHECK (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "reward_redemptions_update" ON reward_redemptions FOR UPDATE
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));

-- Child streak history: parents du foyer
CREATE POLICY "child_streak_history_select" ON child_streak_history FOR SELECT
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));
CREATE POLICY "child_streak_history_insert" ON child_streak_history FOR INSERT
    WITH CHECK (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = auth.uid()
    ));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated at trigger pour child_accounts
CREATE TRIGGER child_accounts_updated_at
    BEFORE UPDATE ON child_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Updated at trigger pour rewards
CREATE TRIGGER rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Fonction pour calculer le niveau basé sur XP
CREATE OR REPLACE FUNCTION get_level_for_xp(xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    result_level INTEGER;
BEGIN
    SELECT level INTO result_level
    FROM xp_levels
    WHERE xp_required <= xp
    ORDER BY level DESC
    LIMIT 1;

    RETURN COALESCE(result_level, 1);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir XP requis pour le prochain niveau
CREATE OR REPLACE FUNCTION get_xp_for_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
DECLARE
    next_xp INTEGER;
BEGIN
    SELECT xp_required INTO next_xp
    FROM xp_levels
    WHERE level = current_level + 1;

    RETURN next_xp;
END;
$$ LANGUAGE plpgsql;
