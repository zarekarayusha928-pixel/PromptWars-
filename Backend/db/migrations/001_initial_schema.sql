-- Migration 001: Initial Schema for Saheli
-- Creates profiles, users, symptom_logs, custom_questions, and safety_events

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INT,
  typical_cycle_length INT DEFAULT 28,
  typical_period_length INT DEFAULT 5,
  upcoming_visit_date DATE,
  doctor_name TEXT DEFAULT '',
  primary_pattern_focus TEXT DEFAULT '',
  summary_bio TEXT DEFAULT '',
  current_cycle_day INT DEFAULT 1,
  current_phase TEXT DEFAULT '',
  consent_settings JSONB DEFAULT '{"includeName": true, "includeAge": true, "includeNotes": true, "includeMood": true, "includeTrends": true}'::jsonb,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS symptom_logs (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  cycle_day INT,
  bleeding TEXT NOT NULL CHECK (bleeding IN ('None', 'Spotting', 'Light', 'Medium', 'Heavy')),
  pain_score INT NOT NULL CHECK (pain_score >= 0 AND pain_score <= 10),
  functional_impact BOOLEAN DEFAULT false,
  impact_types TEXT[] DEFAULT '{}',
  symptoms TEXT[] DEFAULT '{}',
  energy_rating INT NOT NULL CHECK (energy_rating >= 1 AND energy_rating <= 5),
  mood_rating INT NOT NULL CHECK (mood_rating >= 1 AND mood_rating <= 5),
  notes VARCHAR(500) DEFAULT '',
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, log_date)
);

CREATE TABLE IF NOT EXISTS custom_questions (
  id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  in_report BOOLEAN DEFAULT true,
  position INT DEFAULT 0,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, id)
);

CREATE TABLE IF NOT EXISTS safety_events (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  flag_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  action TEXT NOT NULL,
  triggeredFields TEXT[] DEFAULT '{}',
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users(profile_id);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_profile_date ON symptom_logs(profile_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_custom_questions_profile ON custom_questions(profile_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_safety_events_profile ON safety_events(profile_id, event_date DESC);
