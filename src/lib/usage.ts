import { createServerClient } from './supabase';

export const DAILY_LIMITS = {
  coach: 10,
  planner: 3,
} as const;

export type Feature = keyof typeof DAILY_LIMITS;

/**
 * Check if user can use the feature and increment counter.
 * Returns { allowed, remaining } or { allowed: false, remaining: 0 }
 */
export async function checkAndUse(userId: string, feature: Feature): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const db = createServerClient();
  const limit = DAILY_LIMITS[feature];

  const { data, error } = await db.rpc('check_and_use', {
    p_user_id: userId,
    p_feature: feature,
    p_limit: limit,
  });

  if (error) {
    console.error('Usage check error:', error);
    // Fail open — allow the request if DB check fails
    return { allowed: true, remaining: limit };
  }

  const remaining = data as number;
  return {
    allowed: remaining >= 0,
    remaining: Math.max(remaining, 0),
  };
}

/**
 * Get current usage count without incrementing
 */
export async function getUsage(userId: string, feature: Feature): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const db = createServerClient();
  const limit = DAILY_LIMITS[feature];

  const { data, error } = await db.rpc('get_usage', {
    p_user_id: userId,
    p_feature: feature,
  });

  if (error) {
    console.error('Usage fetch error:', error);
    return { used: 0, limit, remaining: limit };
  }

  const used = (data as number) || 0;
  return { used, limit, remaining: limit - used };
}
