-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- PROGRAMS
-- =====================
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  season TEXT,
  start_date DATE,
  end_date DATE,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- PLAYERS
-- =====================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  position TEXT,
  jersey_number INTEGER,
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_id UUID REFERENCES program_groups(id) ON DELETE SET NULL,
  joined_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'injured', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (program_id, player_id)
);

-- =====================
-- COACHES
-- =====================
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialization TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (program_id, coach_id)
);

-- =====================
-- INDICATORS
-- =====================
CREATE TABLE IF NOT EXISTS indicator_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES indicator_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'numeric' CHECK (type IN ('numeric', 'rating', 'text', 'choice')),
  direction TEXT NOT NULL DEFAULT 'higher_better' CHECK (direction IN ('higher_better', 'lower_better', 'neutral')),
  unit TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  target_value NUMERIC,
  choices JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ASSESSMENTS
-- =====================
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_date DATE NOT NULL,
  notes TEXT,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  value_numeric NUMERIC,
  value_rating NUMERIC,
  value_text TEXT,
  value_choice TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, player_id, indicator_id)
);

-- =====================
-- NOTES & RECOMMENDATIONS
-- =====================
CREATE TABLE IF NOT EXISTS coach_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ATTENDANCE
-- =====================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_type TEXT DEFAULT 'training',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attendance_session_id, player_id)
);

-- =====================
-- BODY COMPOSITION
-- =====================
CREATE TABLE IF NOT EXISTS body_composition_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  body_fat_percentage NUMERIC(5,2),
  muscle_mass_kg NUMERIC(5,2),
  bmi NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- REPORTS & SETTINGS
-- =====================
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  organization_name TEXT,
  logo_url TEXT,
  report_title TEXT,
  primary_color TEXT DEFAULT '#0a1628',
  accent_color TEXT DEFAULT '#d4af37',
  report_footer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs(user_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_indicators_user_id ON indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_indicators_category_id ON indicators(category_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_program_id ON assessment_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_session_id ON assessment_results(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_player_id ON assessment_results(player_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_program_id ON attendance_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_body_composition_player_program ON body_composition_records(player_id, program_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
CREATE POLICY "Users can manage own programs" ON programs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage program groups via programs" ON program_groups FOR ALL USING (
  program_id IN (SELECT id FROM programs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own players" ON players FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage program_players via programs" ON program_players FOR ALL USING (
  program_id IN (SELECT id FROM programs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own coaches" ON coaches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage program_coaches via programs" ON program_coaches FOR ALL USING (
  program_id IN (SELECT id FROM programs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own indicator_categories" ON indicator_categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own indicators" ON indicators FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assessment_sessions" ON assessment_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage assessment_results via sessions" ON assessment_results FOR ALL USING (
  session_id IN (SELECT id FROM assessment_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own coach_notes" ON coach_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recommendations" ON recommendations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own attendance_sessions" ON attendance_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage attendance_records via sessions" ON attendance_records FOR ALL USING (
  attendance_session_id IN (SELECT id FROM attendance_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own body_composition" ON body_composition_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own report_exports" ON report_exports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own app_settings" ON app_settings FOR ALL USING (auth.uid() = user_id);

-- =====================
-- STORAGE BUCKETS
-- =====================
-- Run these in Supabase Storage dashboard or via API:
-- CREATE BUCKET photos (public: true)
-- CREATE BUCKET reports (public: false)
