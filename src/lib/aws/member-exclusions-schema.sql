-- ============================================================
-- MEMBER EXCLUSIONS - Temporary absences for load balancing
-- PostgreSQL / Supabase
-- ============================================================

-- === MEMBER EXCLUSIONS ===
-- Tracks temporary exclusions from task assignment (travel, illness, etc.)
CREATE TABLE IF NOT EXISTS member_exclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    exclude_from TIMESTAMP WITH TIME ZONE NOT NULL,
    exclude_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL, -- voyage, maladie, surcharge, autre
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure exclude_until is after exclude_from
    CONSTRAINT exclude_dates_valid CHECK (exclude_until > exclude_from)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_member_exclusions_member_household
    ON member_exclusions(member_id, household_id);

CREATE INDEX IF NOT EXISTS idx_member_exclusions_dates
    ON member_exclusions(exclude_from, exclude_until);

-- === RLS POLICIES ===
ALTER TABLE member_exclusions ENABLE ROW LEVEL SECURITY;

-- Users can view exclusions in their household
CREATE POLICY "member_exclusions_select" ON member_exclusions
    FOR SELECT USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Users can insert exclusions in their household
CREATE POLICY "member_exclusions_insert" ON member_exclusions
    FOR INSERT WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Users can update exclusions in their household
CREATE POLICY "member_exclusions_update" ON member_exclusions
    FOR UPDATE USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Users can delete exclusions in their household
CREATE POLICY "member_exclusions_delete" ON member_exclusions
    FOR DELETE USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- === EXCLUSION REASONS (reference) ===
-- Available reasons for exclusions:
-- 'voyage' - Travel/vacation
-- 'maladie' - Illness
-- 'surcharge_travail' - Work overload
-- 'garde_alternee' - Custody arrangement (out of house)
-- 'autre' - Other

-- === CLEANUP FUNCTION ===
-- Automatically delete old exclusions (optional scheduled job)
-- DELETE FROM member_exclusions WHERE exclude_until < NOW() - INTERVAL '30 days';
