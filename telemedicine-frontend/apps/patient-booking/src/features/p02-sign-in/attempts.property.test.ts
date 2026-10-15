import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  emptyAttempt,
  isLocked,
  normalise,
  registerFailure,
  registerSuccess,
  MAX_ATTEMPTS,
  LOCKOUT_MS,
  type AttemptRecord,
} from "./attempts";

// Feature: patient-booking-intake, Property 4: Attempt counter never exceeds 5 and lockout engages exactly at the threshold
describe("sign-in attempt counter (Property 4)", () => {
  type Event =
    | { kind: "fail" }
    | { kind: "success" }
    | { kind: "advance"; ms: number };

  const eventArb = fc.oneof(
    fc.constant<Event>({ kind: "fail" }),
    fc.constant<Event>({ kind: "success" }),
    fc
      .integer({ min: 0, max: LOCKOUT_MS * 2 })
      .map((ms): Event => ({ kind: "advance", ms })),
  );

  it("count stays in 0..5, lockout iff count==5 within window, resets on success/expiry", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 60 }), (events) => {
        let rec: AttemptRecord = emptyAttempt();
        let now = 1_000_000;

        for (const ev of events) {
          if (ev.kind === "advance") {
            now += ev.ms;
          } else if (ev.kind === "success") {
            rec = registerSuccess();
          } else {
            rec = registerFailure(rec, now);
          }

          // count always within bounds
          if (rec.count < 0 || rec.count > MAX_ATTEMPTS) return false;

          // lockout engaged iff count reached MAX and window not elapsed
          const locked = isLocked(rec, now);
          const atThreshold = rec.count >= MAX_ATTEMPTS && rec.lockedUntil !== null;
          if (locked !== (atThreshold && now < rec.lockedUntil!)) return false;
        }

        // after a success, count is 0
        const afterSuccess = registerSuccess();
        if (afterSuccess.count !== 0) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("expired lockout normalises to a fresh record", () => {
    const locked = registerFailureTimes(5, 1000);
    expect(isLocked(locked, 1000)).toBe(true);
    const after = normalise(locked, 1000 + LOCKOUT_MS);
    expect(after.count).toBe(0);
    expect(after.lockedUntil).toBeNull();
  });
});

function registerFailureTimes(times: number, now: number): AttemptRecord {
  let rec = emptyAttempt();
  for (let i = 0; i < times; i++) rec = registerFailure(rec, now);
  return rec;
}
