-- ============================================================
-- FAMILYLOAD - JOKER STREAK SCHEMA
-- Track monthly joker usage for premium subscribers
-- ============================================================

-- === STREAK JOKERS TABLE ===
-- One joker per month for premium subscribers
CREATE TABLE IF NOT EXISTS streak_jokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    month INT NOT NULL, -- 1-12
    year INT NOT NULL,
    streak_value_saved INT NOT NULL, -- Streak value that was saved by the joker
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure only one joker per household per month
    UNIQUE(household_id, month, year)
);

-- === INDEXES ===
CREATE INDEX IF NOT EXISTS idx_streak_jokers_household ON streak_jokers(household_id);
CREATE INDEX IF NOT EXISTS idx_streak_jokers_month_year ON streak_jokers(month, year);

-- === RLS POLICIES ===
ALTER TABLE streak_jokers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "jokers_select" ON streak_jokers;
DROP POLICY IF EXISTS "jokers_insert" ON streak_jokers;
DROP POLICY IF EXISTS "jokers_delete" ON streak_jokers;

-- Household members can view joker history
CREATE POLICY "jokers_select" ON streak_jokers FOR SELECT
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Household members can use joker (insert)
CREATE POLICY "jokers_insert" ON streak_jokers FOR INSERT
    WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Household members can delete joker usage (for admin purposes)
CREATE POLICY "jokers_delete" ON streak_jokers FOR DELETE
    USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to check if a joker is available this month
CREATE OR REPLACE FUNCTION can_use_joker(p_household_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_premium BOOLEAN;
    v_joker_used BOOLEAN;
BEGIN
    -- Check if household has active subscription
    SELECT subscription_status IN ('active', 'trial')
    INTO v_is_premium
    FROM households
    WHERE id = p_household_id;

    IF NOT COALESCE(v_is_premium, false) THEN
        RETURN false;
    END IF;

    -- Check if joker already used this month
    SELECT EXISTS(
        SELECT 1 FROM streak_jokers
        WHERE household_id = p_household_id
        AND month = EXTRACT(MONTH FROM CURRENT_DATE)
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    ) INTO v_joker_used;

    RETURN NOT v_joker_used;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to use a joker and save the streak
CREATE OR REPLACE FUNCTION use_joker(p_household_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_current_streak INT;
    v_can_use BOOLEAN;
BEGIN
    -- Check if can use joker
    v_can_use := can_use_joker(p_household_id);

    IF NOT v_can_use THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Joker not available'
        );
    END IF;

    -- Get current streak
    SELECT streak_current INTO v_current_streak
    FROM households
    WHERE id = p_household_id;

    -- Insert joker usage
    INSERT INTO streak_jokers (household_id, month, year, streak_value_saved)
    VALUES (
        p_household_id,
        EXTRACT(MONTH FROM CURRENT_DATE),
        EXTRACT(YEAR FROM CURRENT_DATE),
        COALESCE(v_current_streak, 0)
    );

    -- Update streak_history to mark joker used
    UPDATE streak_history
    SET joker_used = true
    WHERE household_id = p_household_id
    AND streak_date = CURRENT_DATE;

    -- If no streak_history entry for today, create one
    INSERT INTO streak_history (household_id, streak_date, streak_value, joker_used)
    VALUES (p_household_id, CURRENT_DATE, v_current_streak, true)
    ON CONFLICT (household_id, streak_date) DO UPDATE SET joker_used = true;

    RETURN jsonb_build_object(
        'success', true,
        'streak_saved', v_current_streak,
        'month', EXTRACT(MONTH FROM CURRENT_DATE),
        'year', EXTRACT(YEAR FROM CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION can_use_joker(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION use_joker(UUID) TO PUBLIC;
