import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { serializeState, deserializeState } from "./persistence";
import {
  createInitialBookingState,
  WIZARD_ORDER,
  type BookingState,
} from "@/shared/types/booking";

// Feature: patient-booking-intake, Property 6: Session state persistence round-trips without tokens
describe("session persistence round-trip (Property 6)", () => {
  const stepArb = fc.constantFrom(...WIZARD_ORDER);

  const stateArb: fc.Arbitrary<BookingState> = fc
    .record({
      currentStep: stepArb,
      furthestStep: stepArb,
      userId: fc.option(fc.string(), { nil: null }),
      authed: fc.boolean(),
      symptomText: fc.string({ maxLength: 200 }),
      severity: fc.integer({ min: 0, max: 10 }),
      addMissing: fc.string({ maxLength: 200 }),
      confirmed: fc.boolean(),
    })
    .map((r) => {
      const base = createInitialBookingState();
      return {
        ...base,
        currentStep: r.currentStep,
        furthestStep: r.furthestStep,
        auth: {
          status: r.authed ? "authenticated" : "unauthenticated",
          userId: r.userId,
        },
        symptomText: r.symptomText,
        severity: r.severity,
        history: { ...base.history, addMissing: r.addMissing, confirmed: r.confirmed },
      } satisfies BookingState;
    });

  it("round-trips any valid BookingState to an equivalent value", () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        const rehydrated = deserializeState(serializeState(state));
        expect(rehydrated).toEqual(state);
      }),
      { numRuns: 100 },
    );
  });

  it("serialized payload never contains token fields", () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        const raw = serializeState(state);
        return (
          !raw.includes("accessToken") &&
          !raw.includes("refreshToken") &&
          !/"token"/.test(raw)
        );
      }),
      { numRuns: 100 },
    );
  });
});
