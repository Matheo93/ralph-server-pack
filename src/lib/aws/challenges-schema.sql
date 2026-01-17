-- ============================================================
-- FAMILYLOAD CHALLENGES - Systeme de Defis/Quetes XP
-- Tables pour challenges personnalises et templates
-- ============================================================

-- ============================================================
-- CHALLENGE TEMPLATES (Templates predefinis)
-- ============================================================

CREATE TABLE IF NOT EXISTS challenge_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT '🎯',
    -- Trigger conditions
    trigger_type VARCHAR(30) NOT NULL, -- task_category, task_any, specific_task
    trigger_category_code VARCHAR(50), -- code from task_categories
    trigger_task_keyword VARCHAR(100), -- keyword to match in task title
    required_count INTEGER NOT NULL DEFAULT 1,
    timeframe_days INTEGER, -- null = no limit, otherwise complete within X days
    -- Rewards
    reward_xp INTEGER NOT NULL DEFAULT 50,
    reward_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
    -- Metadata
    difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    age_min INTEGER,
    age_max INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert templates de base
INSERT INTO challenge_templates (slug, name_fr, name_en, description_fr, description_en, icon, trigger_type, trigger_task_keyword, required_count, timeframe_days, reward_xp, difficulty, sort_order) VALUES
('chambre_impeccable', 'Chambre Impeccable', 'Spotless Room', 'Range ta chambre 3 fois cette semaine', 'Clean your room 3 times this week', '🛏️', 'task_any', 'chambre,ranger,room,clean', 3, 7, 75, 'easy', 1),
('rat_bibliotheque', 'Rat de Bibliotheque', 'Bookworm', 'Lis 5 fois cette semaine', 'Read 5 times this week', '📚', 'task_any', 'lire,lecture,read,book', 5, 7, 100, 'medium', 2),
('sourire_eclatant', 'Sourire Eclatant', 'Sparkling Smile', 'Brosse tes dents 14 fois en une semaine (matin et soir)', 'Brush your teeth 14 times in a week (morning and evening)', '🦷', 'task_any', 'dents,teeth,brosse,brush', 14, 7, 150, 'medium', 3),
('chef_cuistot', 'Chef Cuistot', 'Little Chef', 'Aide a la cuisine 3 fois', 'Help in the kitchen 3 times', '🍽️', 'task_any', 'cuisine,kitchen,cook,repas', 3, 14, 100, 'medium', 4),
('ami_animaux', 'Ami des Animaux', 'Pet Pal', 'Promene le chien ou nourris les animaux 7 fois', 'Walk the dog or feed pets 7 times', '🐕', 'task_any', 'chien,dog,animal,pet,promener,walk', 7, 14, 125, 'medium', 5),
('super_helper', 'Super Helper', 'Super Helper', 'Complete 10 taches de n''importe quel type', 'Complete 10 tasks of any type', '🦸', 'task_any', NULL, 10, 7, 200, 'hard', 6),
('devoir_champion', 'Champion des Devoirs', 'Homework Champion', 'Fais tes devoirs 5 jours de suite', 'Do your homework 5 days in a row', '📝', 'task_any', 'devoir,homework,ecole,school', 5, 7, 150, 'hard', 7),
('eco_warrior', 'Eco Warrior', 'Eco Warrior', 'Participe au tri ou recyclage 5 fois', 'Help with sorting or recycling 5 times', '♻️', 'task_any', 'tri,recycle,poubelle,trash', 5, 14, 100, 'medium', 8),
('rangement_expert', 'Expert du Rangement', 'Tidying Expert', 'Range ou nettoie 7 fois', 'Tidy or clean 7 times', '🧹', 'task_any', 'ranger,nettoyer,clean,tidy', 7, 14, 125, 'medium', 9),
('early_bird', 'Leve-tot', 'Early Bird', 'Complete une tache avant 9h, 5 fois', 'Complete a task before 9am, 5 times', '🌅', 'task_any', NULL, 5, 7, 100, 'hard', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CHALLENGES (Defis actifs/completes)
-- ============================================================

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    template_id UUID REFERENCES challenge_templates(id) ON DELETE SET NULL,
    -- Basic info (can override template)
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT '🎯',
    -- Trigger conditions
    trigger_type VARCHAR(30) NOT NULL, -- task_category, task_any, specific_task
    trigger_category_code VARCHAR(50),
    trigger_task_keyword VARCHAR(100),
    required_count INTEGER NOT NULL DEFAULT 1,
    timeframe_days INTEGER,
    -- Rewards
    reward_xp INTEGER NOT NULL DEFAULT 50,
    reward_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
    reward_custom TEXT, -- Custom reward text (e.g., "1h de jeux video")
    -- Assignment
    child_ids UUID[] NOT NULL DEFAULT '{}', -- Which children this applies to
    -- Progress tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Calculated from timeframe_days
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_by UUID, -- Cognito user ID (parent)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CHALLENGE PROGRESS (Progress par enfant)
-- ============================================================

CREATE TABLE IF NOT EXISTS challenge_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    current_count INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    xp_awarded INTEGER,
    badge_awarded_id UUID REFERENCES badges(id) ON DELETE SET NULL,
    last_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    last_progress_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(challenge_id, child_id)
);

-- ============================================================
-- CHALLENGE PROGRESS LOG (Historique des progressions)
-- ============================================================

CREATE TABLE IF NOT EXISTS challenge_progress_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_progress_id UUID NOT NULL REFERENCES challenge_progress(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    task_title VARCHAR(255),
    count_added INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_challenge_templates_active ON challenge_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_challenge_templates_slug ON challenge_templates(slug);

CREATE INDEX IF NOT EXISTS idx_challenges_household ON challenges(household_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(household_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_challenges_template ON challenges(template_id);
CREATE INDEX IF NOT EXISTS idx_challenges_child_ids ON challenges USING GIN(child_ids);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_child ON challenge_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_active ON challenge_progress(child_id, is_completed) WHERE is_completed = false;

CREATE INDEX IF NOT EXISTS idx_challenge_progress_log_progress ON challenge_progress_log(challenge_progress_id);

-- ============================================================
-- RLS POLICIES (using app.current_user_id for PostgreSQL RDS)
-- ============================================================

ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress_log ENABLE ROW LEVEL SECURITY;

-- Challenge templates: lecture publique (templates systeme)
CREATE POLICY "challenge_templates_select_all" ON challenge_templates FOR SELECT USING (true);

-- Challenges: membres du foyer
CREATE POLICY "challenges_select" ON challenges FOR SELECT
    USING (household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = current_setting('app.current_user_id', true)::uuid
    ));
CREATE POLICY "challenges_insert" ON challenges FOR INSERT
    WITH CHECK (household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = current_setting('app.current_user_id', true)::uuid
    ));
CREATE POLICY "challenges_update" ON challenges FOR UPDATE
    USING (household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = current_setting('app.current_user_id', true)::uuid
    ));
CREATE POLICY "challenges_delete" ON challenges FOR DELETE
    USING (household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = current_setting('app.current_user_id', true)::uuid
    ));

-- Challenge progress: via children -> household
CREATE POLICY "challenge_progress_select" ON challenge_progress FOR SELECT
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = current_setting('app.current_user_id', true)::uuid
    ));
CREATE POLICY "challenge_progress_insert" ON challenge_progress FOR INSERT
    WITH CHECK (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = current_setting('app.current_user_id', true)::uuid
    ));
CREATE POLICY "challenge_progress_update" ON challenge_progress FOR UPDATE
    USING (child_id IN (
        SELECT c.id FROM children c
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = current_setting('app.current_user_id', true)::uuid
    ));

-- Challenge progress log: via challenge_progress
CREATE POLICY "challenge_progress_log_select" ON challenge_progress_log FOR SELECT
    USING (challenge_progress_id IN (
        SELECT cp.id FROM challenge_progress cp
        JOIN children c ON c.id = cp.child_id
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = current_setting('app.current_user_id', true)::uuid
    ));
CREATE POLICY "challenge_progress_log_insert" ON challenge_progress_log FOR INSERT
    WITH CHECK (challenge_progress_id IN (
        SELECT cp.id FROM challenge_progress cp
        JOIN children c ON c.id = cp.child_id
        JOIN household_members hm ON hm.household_id = c.household_id
        WHERE hm.user_id = current_setting('app.current_user_id', true)::uuid
    ));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated at trigger pour challenges
CREATE TRIGGER challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Updated at trigger pour challenge_progress
CREATE TRIGGER challenge_progress_updated_at
    BEFORE UPDATE ON challenge_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Fonction pour verifier si une tache correspond a un challenge
CREATE OR REPLACE FUNCTION check_task_matches_challenge(
    p_task_title TEXT,
    p_task_category_code VARCHAR(50),
    p_challenge_trigger_type VARCHAR(30),
    p_challenge_trigger_category_code VARCHAR(50),
    p_challenge_trigger_task_keyword VARCHAR(100)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- task_any with no keyword matches everything
    IF p_challenge_trigger_type = 'task_any' AND p_challenge_trigger_task_keyword IS NULL THEN
        RETURN true;
    END IF;

    -- task_category: match category code
    IF p_challenge_trigger_type = 'task_category' AND p_task_category_code IS NOT NULL THEN
        RETURN p_task_category_code = p_challenge_trigger_category_code;
    END IF;

    -- task_any with keyword: match any keyword in task title (case insensitive)
    IF p_challenge_trigger_type = 'task_any' AND p_challenge_trigger_task_keyword IS NOT NULL THEN
        DECLARE
            keywords TEXT[];
            kw TEXT;
        BEGIN
            keywords := string_to_array(p_challenge_trigger_task_keyword, ',');
            FOREACH kw IN ARRAY keywords
            LOOP
                IF LOWER(p_task_title) LIKE '%' || LOWER(TRIM(kw)) || '%' THEN
                    RETURN true;
                END IF;
            END LOOP;
            RETURN false;
        END;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre a jour la progression d'un challenge
CREATE OR REPLACE FUNCTION update_challenge_progress_on_task_complete()
RETURNS TRIGGER AS $$
DECLARE
    v_challenge RECORD;
    v_progress_id UUID;
    v_current_count INTEGER;
    v_task_category_code VARCHAR(50);
BEGIN
    -- Only process when task is marked as done (completed)
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') AND NEW.child_id IS NOT NULL THEN
        -- Get task category code
        SELECT code INTO v_task_category_code
        FROM task_categories
        WHERE id = NEW.category_id;

        -- Find all active challenges for this child
        FOR v_challenge IN
            SELECT ch.* FROM challenges ch
            WHERE ch.is_active = true
            AND NEW.child_id = ANY(ch.child_ids)
            AND (ch.expires_at IS NULL OR ch.expires_at > NOW())
            AND ch.household_id = NEW.household_id
        LOOP
            -- Check if task matches challenge criteria
            IF check_task_matches_challenge(
                NEW.title,
                v_task_category_code,
                v_challenge.trigger_type,
                v_challenge.trigger_category_code,
                v_challenge.trigger_task_keyword
            ) THEN
                -- Get or create progress record
                SELECT id, current_count INTO v_progress_id, v_current_count
                FROM challenge_progress
                WHERE challenge_id = v_challenge.id AND child_id = NEW.child_id;

                IF v_progress_id IS NULL THEN
                    INSERT INTO challenge_progress (challenge_id, child_id, current_count)
                    VALUES (v_challenge.id, NEW.child_id, 1)
                    RETURNING id, current_count INTO v_progress_id, v_current_count;
                ELSE
                    -- Only update if not already completed
                    UPDATE challenge_progress
                    SET current_count = current_count + 1,
                        last_task_id = NEW.id,
                        last_progress_at = NOW()
                    WHERE id = v_progress_id AND is_completed = false
                    RETURNING current_count INTO v_current_count;
                END IF;

                -- Log the progress
                INSERT INTO challenge_progress_log (challenge_progress_id, task_id, task_title)
                VALUES (v_progress_id, NEW.id, NEW.title);

                -- Check if challenge is now complete
                IF v_current_count >= v_challenge.required_count THEN
                    UPDATE challenge_progress
                    SET is_completed = true,
                        completed_at = NOW(),
                        xp_awarded = v_challenge.reward_xp,
                        badge_awarded_id = v_challenge.reward_badge_id
                    WHERE id = v_progress_id AND is_completed = false;

                    -- Award XP to child
                    UPDATE child_accounts
                    SET current_xp = current_xp + v_challenge.reward_xp
                    WHERE child_id = NEW.child_id;

                    -- Log XP transaction
                    INSERT INTO xp_transactions (child_id, amount, reason)
                    VALUES (NEW.child_id, v_challenge.reward_xp, 'challenge_completed');

                    -- Award badge if specified
                    IF v_challenge.reward_badge_id IS NOT NULL THEN
                        INSERT INTO child_badges (child_id, badge_id)
                        VALUES (NEW.child_id, v_challenge.reward_badge_id)
                        ON CONFLICT (child_id, badge_id) DO NOTHING;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur tasks pour mettre a jour les challenges
DROP TRIGGER IF EXISTS trigger_update_challenge_on_task_complete ON tasks;
CREATE TRIGGER trigger_update_challenge_on_task_complete
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_progress_on_task_complete();
