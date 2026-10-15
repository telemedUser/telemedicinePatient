import { describe, it } from "vitest";
import fc from "fast-check";
import {
  advance,
  retreat,
  jumpTo,
  stepIndex,
  type StepState,
} from "./transitions";
import { WIZARD_ORDER, type WizardStep } from "@/shared/types/booking";

// Feature: patient-booking-intake, Property 5: Wizard transitions stay within P-01..P-05 and furthest step never regresses
describe("wizard transitions (Property 5)", () => {
  type Op =
    | { kind: "next" }
    | { kind: "back" }
    | { kind: "skip" }
    | { kind: "jump"; target: WizardStep };

  const opArb = fc.oneof(
    fc.constant<Op>({ kind: "next" }),
    fc.constant<Op>({ kind: "back" }),
    fc.constant<Op>({ kind: "skip" }),
    fc
      .constantFrom(...WIZARD_ORDER)
      .map((target): Op => ({ kind: "jump", target })),
  );

  it("current index in 0..4 and furthest non-decreasing and >= current", () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 50 }), (ops) => {
        let s: StepState = { current: "P-01", furthest: "P-01" };
        let prevFurthest = stepIndex(s.furthest);

        for (const op of ops) {
          if (op.kind === "next" || op.kind === "skip") s = advance(s);
          else if (op.kind === "back") s = retreat(s);
          else s = jumpTo(s, op.target);

          const ci = stepIndex(s.current);
          const fi = stepIndex(s.furthest);

          if (ci < 0 || ci > 4) return false;
          if (fi < prevFurthest) return false; // never regresses
          if (fi < ci) return false; // furthest >= current
          prevFurthest = fi;
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
