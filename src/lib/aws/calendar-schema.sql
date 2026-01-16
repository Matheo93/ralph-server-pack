-- ============================================================
-- FAMILYLOAD - CALENDAR EVENTS SCHEMA
-- Calendrier familial partage
-- ============================================================

-- === TABLE CALENDAR_EVENTS ===
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    recurrence VARCHAR(50), -- none, daily, weekly, monthly, yearly
    recurrence_end_date DATE, -- Date de fin de recurrence
    color VARCHAR(7) DEFAULT '#6366f1', -- Hex color
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    event_type VARCHAR(50) DEFAULT 'general', -- general, medical, school, activity, birthday, reminder
    location TEXT,
    reminder_minutes INTEGER DEFAULT 30, -- Rappel X minutes avant
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === INDEXES ===
CREATE INDEX IF NOT EXISTS idx_calendar_events_household ON calendar_events(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to ON calendar_events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_events_child ON calendar_events(child_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(household_id, start_date, end_date);

-- === RLS POLICIES ===
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
CREATE POLICY "calendar_events_select" ON calendar_events FOR SELECT
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
CREATE POLICY "calendar_events_insert" ON calendar_events FOR INSERT
    WITH CHECK (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
CREATE POLICY "calendar_events_update" ON calendar_events FOR UPDATE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;
CREATE POLICY "calendar_events_delete" ON calendar_events FOR DELETE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

-- === FUNCTION: Get events for date range ===
CREATE OR REPLACE FUNCTION get_calendar_events(
    p_household_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN,
    recurrence VARCHAR(50),
    color VARCHAR(7),
    assigned_to UUID,
    assigned_to_name TEXT,
    child_id UUID,
    child_name TEXT,
    event_type VARCHAR(50),
    location TEXT,
    created_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.title,
        ce.description,
        ce.start_date,
        ce.end_date,
        ce.all_day,
        ce.recurrence,
        ce.color,
        ce.assigned_to,
        u.name AS assigned_to_name,
        ce.child_id,
        c.first_name AS child_name,
        ce.event_type,
        ce.location,
        ce.created_by
    FROM calendar_events ce
    LEFT JOIN users u ON ce.assigned_to = u.id
    LEFT JOIN children c ON ce.child_id = c.id
    WHERE ce.household_id = p_household_id
      AND ce.start_date <= p_end_date
      AND (ce.end_date >= p_start_date OR ce.end_date IS NULL)
    ORDER BY ce.start_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- === TRIGGER: Update updated_at ===
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trigger_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_events_updated_at();
