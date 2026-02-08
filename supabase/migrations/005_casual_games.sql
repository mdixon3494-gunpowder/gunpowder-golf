-- 005_casual_games.sql
-- Add type column to leagues and create round_history table

-- Add type column to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'league';
-- Values: 'league' | 'casual' | 'individual'

-- Per-profile round history
CREATE TABLE IF NOT EXISTS round_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source_id TEXT,               -- league/game ID where round was played
  round_type TEXT NOT NULL DEFAULT 'league',  -- 'league' | 'casual' | 'individual'
  date DATE NOT NULL,
  course_name TEXT,
  holes_played INTEGER DEFAULT 18,
  total_score INTEGER,
  front_nine INTEGER,
  back_nine INTEGER,
  scores JSONB,                 -- {"1": 4, "2": 5, ...}
  handicap_used NUMERIC(4,1),
  applied_to_handicap BOOLEAN DEFAULT false,
  format_name TEXT,
  metadata JSONB,               -- team results, greenies, skins, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_round_history_profile ON round_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_round_history_date ON round_history(date DESC);

-- RLS policies
ALTER TABLE round_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read round history" ON round_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert round history" ON round_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update round history" ON round_history
  FOR UPDATE USING (true);
