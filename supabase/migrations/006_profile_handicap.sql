-- 006_profile_handicap.sql
-- Add handicap_index column to profiles for quick access to calculated handicap

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handicap_index NUMERIC(4,1) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handicap_updated_at TIMESTAMPTZ DEFAULT NULL;
