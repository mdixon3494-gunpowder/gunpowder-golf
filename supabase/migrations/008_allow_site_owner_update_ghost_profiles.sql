-- Migration 008: Fix RLS for ghost profile updates
-- Ghost profiles (user_id IS NULL) can't be updated by anyone under the current
-- RLS policy ("Users can update own profile" requires auth.uid() = user_id).
--
-- This adds three policies:
-- 1. Any authenticated user can CLAIM a ghost profile (set user_id to their own uid)
-- 2. Site owners can fully update ghost profiles (assign email, merge accounts, etc.)
-- 3. Site owners can delete duplicate profiles after merging

-- Policy 1: Claiming — user sets user_id on an unclaimed profile to their own uid
CREATE POLICY "Users can claim ghost profiles"
  ON profiles FOR UPDATE
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Policy 2: Site owner admin — full update access to any profile (merge, assign email, etc.)
-- Covers both ghost and claimed profiles so site owners can clear user_id during merges
CREATE POLICY "Site owners can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND is_site_owner = true
    )
  )
  WITH CHECK (true);

-- Policy 3: Site owners can delete profiles (for cleanup after merging duplicates)
CREATE POLICY "Site owners can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND is_site_owner = true
    )
  );
