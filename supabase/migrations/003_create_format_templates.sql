-- Migration 003: Create format_templates table + seed Big Boys Format
-- Also adds foreign key from leagues to format_templates and creates _migrations tracking table

CREATE TABLE format_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'team',
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE format_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates viewable by everyone" ON format_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can create templates" ON format_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update templates" ON format_templates FOR UPDATE USING (true);

CREATE TRIGGER format_templates_updated_at BEFORE UPDATE ON format_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE leagues ADD CONSTRAINT fk_leagues_format_template
  FOREIGN KEY (format_template_id) REFERENCES format_templates(id) ON DELETE SET NULL;

-- Seed Big Boys Format template
INSERT INTO format_templates (name, description, category, is_default, is_system, settings)
VALUES (
  'Big Boys Format',
  'Team format: gross scores, count 1 best + all under par per hole. 2 teams = match play, 3+ = stroke play.',
  'team', true, true,
  '{"teamSize":4,"scoringMethod":"gross","useHandicaps":false,
    "holeScoring":{"minScoresPerHole":1,"countAllUnderPar":true,"displayRelativeToPar":true},
    "maxScoreCap":{"enabled":true,"rules":[
      {"condition":"avgTotal<=82 OR skillRating>=7","cap":"par+2"},
      {"condition":"avgTotal>82 OR skillRating<7","cap":"par+3"}]},
    "competitionStructure":{
      "twoTeams":{"format":"matchPlay","competitions":["front9","back9","overall"]},
      "threeOrMoreTeams":{"format":"strokePlay","competitions":["front9","back9"]}},
    "sideGames":{"greenies":{"included":true},"holeInOnePot":{"included":true},"skins":{"optional":true}},
    "dnfHandling":{"enabled":true},"latePlayerHandling":{"enabled":true}}'
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  run_at TIMESTAMPTZ DEFAULT now()
);
