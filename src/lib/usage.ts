import { createServerClient } from './supabase';

export const DAILY_LIMITS = {
  coach: 2,
  planner: 2,
} as const;

export type Feature = keyof typeof DAILY_LIMITS;

// Track whether the table exists to avoid repeated failed queries
let tableExists: boolean | null = null;

/**
 * Check if user can use the feature and increment counter.
 * Uses PostgREST (no stored procedures needed).
 * Falls back to unlimited if daily_usage table doesn't exist yet.
 */
export async function checkAndUse(userId: string, feature: Feature): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const limit = DAILY_LIMITS[feature];

  // Skip DB call if we already know the table doesn't exist
  if (tableExists === false) {
    return { allowed: true, remaining: limit };
  }

  const db = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Try to get today's usage count
    const { data, error } = await db
      .from('daily_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('feature', feature)
      .eq('used_date', today)
      .maybeSingle();

    if (error) {
      // Table doesn't exist (42P01) or other error — fail open
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('[usage] daily_usage table not found. Run migration_daily_limits.sql to enable limits.');
        tableExists = false;
      } else {
        console.error('[usage] checkAndUse error:', error.message);
      }
      return { allowed: true, remaining: limit };
    }

    tableExists = true;
    const currentCount = data?.count ?? 0;

    // Check limit
    if (currentCount >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment: upsert with count + 1
    if (data) {
      await db
        .from('daily_usage')
        .update({ count: currentCount + 1 })
        .eq('user_id', userId)
        .eq('feature', feature)
        .eq('used_date', today);
    } else {
      await db
        .from('daily_usage')
        .insert({ user_id: userId, feature, used_date: today, count: 1 });
    }

    return { allowed: true, remaining: limit - currentCount - 1 };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

/**
 * Get current usage count without incrementing
 */
export async function getUsage(userId: string, feature: Feature): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const limit = DAILY_LIMITS[feature];

  if (tableExists === false) {
    return { used: 0, limit, remaining: limit };
  }

  const db = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await db
      .from('daily_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('feature', feature)
      .eq('used_date', today)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        tableExists = false;
      }
      return { used: 0, limit, remaining: limit };
    }

    tableExists = true;
    const used = data?.count ?? 0;
    return { used, limit, remaining: Math.max(limit - used, 0) };
  } catch {
    return { used: 0, limit, remaining: limit };
  }
}
