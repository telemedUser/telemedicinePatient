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
  if (!raw) return createInitialBookingState();
  try {
    const parsed = JSON.parse(raw) as Partial<BookingState>;
    return { ...createInitialBookingState(), ...parsed };
  } catch {
    return createInitialBookingState();
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
