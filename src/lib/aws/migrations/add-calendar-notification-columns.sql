-- Migration: Add calendar notification support columns
-- Date: 2026-01-18
-- Description: Add event_id, household_id, and aggregation_key to notifications table
--              for calendar event reminder functionality

-- Add event_id column to link notifications to calendar events
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;

-- Add household_id column for better querying and RLS
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Add aggregation_key for preventing duplicate scheduled notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS aggregation_key TEXT;

-- Add is_aggregated flag for tracking aggregated notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN DEFAULT false;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_household ON notifications(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_aggregation_key ON notifications(aggregation_key) WHERE aggregation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_calendar_type ON notifications(type) WHERE type = 'calendar_reminder';

-- Add comment for documentation
COMMENT ON COLUMN notifications.event_id IS 'Reference to calendar_events for calendar reminders';
COMMENT ON COLUMN notifications.household_id IS 'Reference to household for batch queries and RLS';
COMMENT ON COLUMN notifications.aggregation_key IS 'Unique key to prevent duplicate scheduled notifications';
COMMENT ON COLUMN notifications.is_aggregated IS 'Whether this notification was aggregated with others';
