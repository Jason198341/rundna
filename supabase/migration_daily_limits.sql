-- Daily AI usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('coach', 'planner')),
  used_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, feature, used_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_usage_lookup ON daily_usage(user_id, feature, used_date);

-- RPC: Check and increment usage. Returns remaining count or -1 if limit exceeded.
CREATE OR REPLACE FUNCTION check_and_use(
  p_user_id TEXT,
  p_feature TEXT,
  p_limit INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Upsert: create or get today's row
  INSERT INTO daily_usage (user_id, feature, used_date, count)
  VALUES (p_user_id, p_feature, CURRENT_DATE, 0)
  ON CONFLICT (user_id, feature, used_date) DO NOTHING;

  -- Get current count
  SELECT count INTO v_count
  FROM daily_usage
  WHERE user_id = p_user_id AND feature = p_feature AND used_date = CURRENT_DATE;

  -- Check limit
  IF v_count >= p_limit THEN
    RETURN -1; -- Limit exceeded
  END IF;

  -- Increment
  UPDATE daily_usage
  SET count = count + 1
  WHERE user_id = p_user_id AND feature = p_feature AND used_date = CURRENT_DATE;

  RETURN p_limit - v_count - 1; -- Remaining after this use
END;
$$;

-- RPC: Get current usage (no increment)
CREATE OR REPLACE FUNCTION get_usage(
  p_user_id TEXT,
  p_feature TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count INTO v_count
  FROM daily_usage
  WHERE user_id = p_user_id AND feature = p_feature AND used_date = CURRENT_DATE;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Enable RLS
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
