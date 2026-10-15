export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

export function emptyAttempt(): AttemptRecord {
  return { count: 0, lockedUntil: null };
}

export function isLocked(rec: AttemptRecord, now: number): boolean {
  return rec.lockedUntil !== null && now < rec.lockedUntil;
}

/** Apply a rejected sign-in. Engages lockout exactly when count reaches MAX. */
export function registerFailure(rec: AttemptRecord, now: number): AttemptRecord {
  if (isLocked(rec, now)) return rec;
  // Expired lockout resets before counting again.
  const base = rec.lockedUntil !== null && now >= rec.lockedUntil ? emptyAttempt() : rec;
  const count = Math.min(base.count + 1, MAX_ATTEMPTS);
  const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null;
  return { count, lockedUntil };
}

/** Successful sign-in resets the counter. */
export function registerSuccess(): AttemptRecord {
  return emptyAttempt();
}

/** Returns the record normalised against the clock (clears expired lockout). */
export function normalise(rec: AttemptRecord, now: number): AttemptRecord {
  if (rec.lockedUntil !== null && now >= rec.lockedUntil) return emptyAttempt();
  return rec;
}
