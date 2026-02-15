-- ============================================
-- RunDNA — Supabase Migration
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Users ──

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strava_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  city TEXT,
  country TEXT,
  strava_access_token TEXT NOT NULL,
  strava_refresh_token TEXT NOT NULL,
  strava_token_expires_at BIGINT,
  last_login_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_users_strava_id ON users(strava_id);

-- ── Cached Activities (optional, for reducing Strava API calls) ──

CREATE TABLE cached_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  strava_activity_id BIGINT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strava_activity_id)
);

CREATE INDEX idx_cached_user ON cached_activities(user_id);

-- ── Race Plans ──

CREATE TABLE race_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  race_name TEXT NOT NULL,
  race_date DATE NOT NULL,
  race_distance TEXT NOT NULL,
  target_time TEXT,
  plan JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_plans ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. No direct client access to these tables.
-- All access goes through server-side API routes using the service role key.
