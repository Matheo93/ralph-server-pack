-- Migration: Add web push subscriptions table
-- Date: 2026-01-18
-- Description: Create table for storing Web Push API subscriptions (VAPID-based)

-- Create web_push_subscriptions table
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_web_push_user ON web_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_web_push_enabled ON web_push_subscriptions(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_web_push_endpoint ON web_push_subscriptions(endpoint);

-- Add RLS policies
ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "web_push_select_own" ON web_push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own subscriptions
CREATE POLICY "web_push_insert_own" ON web_push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own subscriptions
CREATE POLICY "web_push_update_own" ON web_push_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own subscriptions
CREATE POLICY "web_push_delete_own" ON web_push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE web_push_subscriptions IS 'Web Push API subscriptions for browser push notifications';
COMMENT ON COLUMN web_push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN web_push_subscriptions.p256dh IS 'P-256 Diffie-Hellman public key';
COMMENT ON COLUMN web_push_subscriptions.auth IS 'Authentication secret';
