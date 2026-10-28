import { createInitialBookingState, type BookingState } from "@/shared/types/booking";

export const STORAGE_KEY = "patient-booking.state";

// Fields that must never be persisted (defence in depth; tokens never enter state).
const FORBIDDEN_KEYS = ["accessToken", "refreshToken", "token"];

export function serializeState(state: BookingState): string {
  return JSON.stringify(state, (key, value) => {
    if (FORBIDDEN_KEYS.includes(key)) return undefined;
    return value;
  });
}

export function deserializeState(raw: string | null): BookingState {
  const fresh = createInitialBookingState();
  if (!raw) return fresh;
  try {
    const parsed = JSON.parse(raw) as Partial<BookingState>;
    // Auth is session-scoped: a page reload must not resurrect a signed-in session. Always restore
    // as unauthenticated so the sign-in gate (and the My care / Help nav) require a real sign-in,
    // while the rest of the in-progress booking draft is preserved.
    return { ...fresh, ...parsed, auth: fresh.auth };
  } catch {
    return fresh;
  }
}

export function loadState(storage: Storage = sessionStorage): BookingState {
  return deserializeState(storage.getItem(STORAGE_KEY));
}

export function saveState(state: BookingState, storage: Storage = sessionStorage): void {
  storage.setItem(STORAGE_KEY, serializeState(state));
}

export function clearState(storage: Storage = sessionStorage): void {
  storage.removeItem(STORAGE_KEY);
}
