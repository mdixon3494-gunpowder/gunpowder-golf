-- Add soft delete support for leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_leagues_deleted_at ON leagues(deleted_at) WHERE deleted_at IS NULL;
