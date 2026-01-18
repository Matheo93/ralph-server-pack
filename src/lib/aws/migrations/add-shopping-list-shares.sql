-- ============================================================
-- MIGRATION: Add shopping_list_shares table for read-only link sharing
-- Date: 2026-01-18
-- ============================================================

-- === TABLE SHOPPING_LIST_SHARES ===
CREATE TABLE IF NOT EXISTS shopping_list_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    share_token VARCHAR(32) NOT NULL UNIQUE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- === INDEXES ===
CREATE INDEX IF NOT EXISTS idx_shopping_list_shares_list ON shopping_list_shares(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_shares_token ON shopping_list_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_shopping_list_shares_active ON shopping_list_shares(list_id, is_active);

-- === RLS POLICIES ===
ALTER TABLE shopping_list_shares ENABLE ROW LEVEL SECURITY;

-- Select: users can see shares for lists in their household
DROP POLICY IF EXISTS "shopping_list_shares_select" ON shopping_list_shares;
CREATE POLICY "shopping_list_shares_select" ON shopping_list_shares FOR SELECT
    USING (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

-- Insert: users can create shares for lists in their household
DROP POLICY IF EXISTS "shopping_list_shares_insert" ON shopping_list_shares;
CREATE POLICY "shopping_list_shares_insert" ON shopping_list_shares FOR INSERT
    WITH CHECK (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

-- Update: users can update shares they created or for lists in their household
DROP POLICY IF EXISTS "shopping_list_shares_update" ON shopping_list_shares;
CREATE POLICY "shopping_list_shares_update" ON shopping_list_shares FOR UPDATE
    USING (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

-- Delete: users can delete shares for lists in their household
DROP POLICY IF EXISTS "shopping_list_shares_delete" ON shopping_list_shares;
CREATE POLICY "shopping_list_shares_delete" ON shopping_list_shares FOR DELETE
    USING (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

-- === PUBLIC ACCESS POLICY FOR SHARED LINKS ===
-- This allows anyone with a valid token to read the share record
-- The actual data fetching is done via a service role or API route
DROP POLICY IF EXISTS "shopping_list_shares_public_read" ON shopping_list_shares;
CREATE POLICY "shopping_list_shares_public_read" ON shopping_list_shares FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- === FUNCTION: Generate unique share token ===
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(32) AS $$
DECLARE
    chars VARCHAR(62) := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(32) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..16 LOOP
        result := result || substr(chars, floor(random() * 62 + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- === FUNCTION: Increment access count ===
CREATE OR REPLACE FUNCTION increment_share_access(p_token VARCHAR(32))
RETURNS VOID AS $$
BEGIN
    UPDATE shopping_list_shares
    SET
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE share_token = p_token
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW());
END;
$$ LANGUAGE plpgsql;
