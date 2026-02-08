-- Migration 004: Add is_site_owner flag to profiles
-- This allows auto-detection of site owner privileges on login

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_site_owner BOOLEAN DEFAULT false;

-- Set your profile as site owner (update the display_name or use your profile ID)
-- Example: UPDATE profiles SET is_site_owner = true WHERE display_name = 'YourName';
