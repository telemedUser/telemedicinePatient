import { useCallback, useState } from "react";
import {
  emptyAttempt,
  isLocked,
  normalise,
  registerFailure,
  registerSuccess,
  type AttemptRecord,
  MAX_ATTEMPTS,
} from "./attempts";

const KEY = "patient-booking.signin-attempts";

function loadMap(): Record<string, AttemptRecord> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Record<
      string,
      AttemptRecord
    >;
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, AttemptRecord>): void {
  sessionStorage.setItem(KEY, JSON.stringify(map));
}

export interface SignInAttemptsApi {
  record: AttemptRecord;
  locked: boolean;
  attemptLabel: string | null;
  fail: () => void;
  succeed: () => void;
}

export function useSignInAttempts(
  email: string,
  now: () => number = Date.now,
): SignInAttemptsApi {
  const key = email.trim().toLowerCase();
  const [map, setMap] = useState<Record<string, AttemptRecord>>(() => loadMap());

  const current = normalise(map[key] ?? emptyAttempt(), now());

  const persist = useCallback((next: Record<string, AttemptRecord>) => {
    setMap(next);
    saveMap(next);
  }, []);

  const fail = useCallback(() => {
    const base = normalise(map[key] ?? emptyAttempt(), now());
    const next = registerFailure(base, now());
    persist({ ...map, [key]: next });
  }, [key, map, now, persist]);

  const succeed = useCallback(() => {
    persist({ ...map, [key]: registerSuccess() });
  }, [key, map, persist]);

  const locked = isLocked(current, now());

  return {
    record: current,
    locked,
    attemptLabel:
      current.count > 0 && !locked
        ? `Attempt ${current.count} of ${MAX_ATTEMPTS}`
        : null,
    fail,
    succeed,
  };
}
