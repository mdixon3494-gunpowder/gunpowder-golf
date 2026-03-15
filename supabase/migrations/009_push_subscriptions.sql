-- Push notification subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  league_id TEXT,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, league_id)
);

-- RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_id));

-- Service role needs full access for Edge Function cleanup of expired subs
CREATE POLICY "Service role full access"
  ON push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');
