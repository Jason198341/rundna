-- Daily AI usage tracking (Coach: 10/day, Planner: 3/day)
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/qvxdfiuqnjrowtbedtpb/sql
CREATE TABLE IF NOT EXISTS daily_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('coach', 'planner')),
  used_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, feature, used_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_usage_lookup ON daily_usage(user_id, feature, used_date);

-- Enable RLS (service role key bypasses this)
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
