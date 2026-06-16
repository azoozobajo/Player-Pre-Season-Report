-- Migration: Add session_indicators table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS session_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, indicator_id)
);

ALTER TABLE session_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage session_indicators via sessions" ON session_indicators FOR ALL USING (
  session_id IN (SELECT id FROM assessment_sessions WHERE user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_session_indicators_session_id ON session_indicators(session_id);
