-- ============================================================
-- DEVICE TOKENS TABLE FOR PUSH NOTIFICATIONS
-- Run this migration to add support for FCM push notifications
-- ============================================================

-- === DEVICE TOKENS TABLE ===
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT DEFAULT 'web', -- web, android, ios
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- === INDEXES ===
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_last_used ON device_tokens(last_used);

-- === RLS POLICIES ===
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own device tokens
CREATE POLICY "select_own_device_tokens"
ON device_tokens FOR SELECT
USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Users can only insert their own device tokens
CREATE POLICY "insert_own_device_tokens"
ON device_tokens FOR INSERT
WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- Users can only update their own device tokens
CREATE POLICY "update_own_device_tokens"
ON device_tokens FOR UPDATE
USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Users can only delete their own device tokens
CREATE POLICY "delete_own_device_tokens"
ON device_tokens FOR DELETE
USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- === USER PREFERENCES TABLE (if not exists) ===
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    daily_reminder_time TIME DEFAULT '08:00',
    weekly_summary_enabled BOOLEAN DEFAULT true,
    reminder_before_deadline_hours INT DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === RLS FOR USER_PREFERENCES ===
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_preferences"
ON user_preferences FOR SELECT
USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "insert_own_preferences"
ON user_preferences FOR INSERT
WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "update_own_preferences"
ON user_preferences FOR UPDATE
USING (user_id = current_setting('app.current_user_id', true)::uuid);
