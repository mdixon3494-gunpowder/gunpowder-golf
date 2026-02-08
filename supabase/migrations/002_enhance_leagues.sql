-- Migration 002: Enhance leagues table + create league_members
-- Adds metadata columns to leagues and creates the league_members junction table

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS format_template_id UUID,
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS join_approval_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('owner', 'co_owner', 'admin', 'player')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_league_member UNIQUE (league_id, profile_id)
);

CREATE INDEX idx_league_members_league ON league_members(league_id);
CREATE INDEX idx_league_members_profile ON league_members(profile_id);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leagues viewable by everyone" ON leagues FOR SELECT USING (true);
CREATE POLICY "Anyone can create leagues" ON leagues FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leagues" ON leagues FOR UPDATE USING (true);

ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members viewable by everyone" ON league_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join leagues" ON league_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Members can update" ON league_members FOR UPDATE USING (true);
CREATE POLICY "Members can leave" ON league_members FOR DELETE USING (true);
