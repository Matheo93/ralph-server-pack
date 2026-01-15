-- Alert History Schema
-- Tracks when balance alerts were sent to avoid spamming users

-- Create alert_history table
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  alert_key VARCHAR(100) NOT NULL, -- e.g., "imbalance", "overload-<user_id>"
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(household_id, alert_key, (sent_at::date)) -- One alert per type per day
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_alert_history_household_date
ON alert_history(household_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_alert_history_lookup
ON alert_history(household_id, alert_key, (sent_at::date));

-- Enable RLS
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "alert_history_household_member_select" ON alert_history
FOR SELECT USING (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = current_setting('app.current_user_id', true)::uuid
    AND is_active = true
  )
);

CREATE POLICY "alert_history_system_insert" ON alert_history
FOR INSERT WITH CHECK (true); -- Allow system to insert

-- Member category preferences table (for assignment preferences)
CREATE TABLE IF NOT EXISTS member_category_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES task_categories(id) ON DELETE CASCADE,
  preference_level VARCHAR(20) NOT NULL CHECK (preference_level IN ('prefer', 'neutral', 'dislike', 'expert')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, household_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_category_preferences_user
ON member_category_preferences(user_id, household_id);

CREATE INDEX IF NOT EXISTS idx_member_category_preferences_category
ON member_category_preferences(category_id);

-- Enable RLS
ALTER TABLE member_category_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "member_category_preferences_own_select" ON member_category_preferences
FOR SELECT USING (
  user_id = current_setting('app.current_user_id', true)::uuid
  OR household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = current_setting('app.current_user_id', true)::uuid
    AND is_active = true
  )
);

CREATE POLICY "member_category_preferences_own_insert" ON member_category_preferences
FOR INSERT WITH CHECK (
  user_id = current_setting('app.current_user_id', true)::uuid
);

CREATE POLICY "member_category_preferences_own_update" ON member_category_preferences
FOR UPDATE USING (
  user_id = current_setting('app.current_user_id', true)::uuid
);

CREATE POLICY "member_category_preferences_own_delete" ON member_category_preferences
FOR DELETE USING (
  user_id = current_setting('app.current_user_id', true)::uuid
);
