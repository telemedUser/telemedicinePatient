import { describe, it } from "vitest";
import fc from "fast-check";
import { severityWord } from "./severity";

// Feature: patient-booking-intake, Property 1: Severity mapping is total and consistent with stored value
describe("severity mapping (Property 1)", () => {
  it("returns exactly one of the four bands for every integer 0..10", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (v) => {
        const word = severityWord(v);
        if (v <= 2) return word === "Mild";
        if (v <= 6) return word === "Moderate";
        if (v <= 9) return word === "Severe";
        return word === "Worst possible";
      }),
      { numRuns: 100 },
    );
  });

  it("only ever yields the four allowed words", () => {
    const allowed = new Set(["Mild", "Moderate", "Severe", "Worst possible"]);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (v) =>
        allowed.has(severityWord(v)),
      ),
      { numRuns: 100 },
    );
  });
});

