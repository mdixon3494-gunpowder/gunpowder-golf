-- Add notification category preferences to push subscriptions
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Categories stored in preferences:
-- round_alerts: round start, round finish, check-in closing (default: true)
-- score_alerts: birdie, eagle, hole-in-one (default: true)
-- greenie_alerts: greenie finalized (default: true)
-- admin_messages: custom notifications, round announcements, join requests (default: true)
-- Missing key = default ON (backward compatible with existing subscriptions)
