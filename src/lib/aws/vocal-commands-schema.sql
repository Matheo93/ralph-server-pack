-- Vocal Commands History Schema
-- Tracks all vocal commands for feedback, corrections, and analytics

-- Create the vocal_commands table
CREATE TABLE IF NOT EXISTS vocal_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  parsed_action TEXT NOT NULL,
  parsed_child TEXT,
  parsed_date TIMESTAMPTZ,
  parsed_category TEXT NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'corrected', 'cancelled')),
  correction_notes TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_vocal_commands_user_id ON vocal_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_vocal_commands_household_id ON vocal_commands(household_id);
CREATE INDEX IF NOT EXISTS idx_vocal_commands_created_at ON vocal_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocal_commands_status ON vocal_commands(status);

-- RLS Policies
ALTER TABLE vocal_commands ENABLE ROW LEVEL SECURITY;

-- Users can only see commands from their household
CREATE POLICY vocal_commands_select_policy ON vocal_commands
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = current_user_id() AND is_active = true
    )
  );

-- Users can only create commands for their household
CREATE POLICY vocal_commands_insert_policy ON vocal_commands
  FOR INSERT
  WITH CHECK (
    user_id = current_user_id()
    AND household_id IN (
      SELECT household_id FROM household_members WHERE user_id = current_user_id() AND is_active = true
    )
  );

-- Users can only update their own commands
CREATE POLICY vocal_commands_update_policy ON vocal_commands
  FOR UPDATE
  USING (user_id = current_user_id());

-- Users can only delete their own commands
CREATE POLICY vocal_commands_delete_policy ON vocal_commands
  FOR DELETE
  USING (user_id = current_user_id());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_vocal_commands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vocal_commands_updated_at_trigger
  BEFORE UPDATE ON vocal_commands
  FOR EACH ROW
  EXECUTE FUNCTION update_vocal_commands_updated_at();
