const DAILY_LIMIT = 1;

export function checkDailyLimit(featureKey: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `rundna_rate_${featureKey}_${today}`;
  const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
  return { allowed: count < DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - count) };
}

export function incrementDailyCount(featureKey: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `rundna_rate_${featureKey}_${today}`;
  const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
  localStorage.setItem(storageKey, String(count + 1));
}
