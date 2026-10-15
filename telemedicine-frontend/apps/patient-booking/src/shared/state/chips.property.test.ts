import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { initChipSets, addChip, removeChip, type ChipSets } from "./chips";
import type { SymptomChip } from "@/shared/types/booking";

// Feature: patient-booking-intake, Property 3: Symptom chip sets stay disjoint and conserved
describe("chip-set algebra (Property 3)", () => {
  const idsOf = (chips: SymptomChip[]) => new Set(chips.map((c) => c.id));

  it("keeps selected and available disjoint and conserves the id universe", () => {
    const chipArb = fc
      .uniqueArray(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 15 })
      .map((ids): SymptomChip[] =>
        ids.map((n) => ({ id: `sym-${n}`, label: `Symptom ${n}` })),
      );

    fc.assert(
      fc.property(
        chipArb,
        fc.array(
          fc.record({
            op: fc.constantFrom<"add" | "remove">("add", "remove"),
            idx: fc.integer({ min: 0, max: 14 }),
          }),
          { maxLength: 40 },
        ),
        (candidates, ops) => {
          const universe = idsOf(candidates);
          let sets: ChipSets = initChipSets(candidates);

          for (const { op, idx } of ops) {
            const pool = op === "add" ? sets.available : sets.selected;
            if (pool.length === 0) continue;
            const target = pool[idx % pool.length].id;
            sets = op === "add" ? addChip(sets, target) : removeChip(sets, target);
          }

          const sel = idsOf(sets.selected);
          const avail = idsOf(sets.available);

          // disjoint
          for (const id of sel) if (avail.has(id)) return false;
          // no duplicates within each set
          if (sel.size !== sets.selected.length) return false;
          if (avail.size !== sets.available.length) return false;
          // conserved: union equals the original universe
          const union = new Set([...sel, ...avail]);
          if (union.size !== universe.size) return false;
          for (const id of universe) if (!union.has(id)) return false;
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("initChipSets places every candidate in selected", () => {
    const candidates: SymptomChip[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const sets = initChipSets(candidates);
    expect(sets.selected).toHaveLength(2);
    expect(sets.available).toHaveLength(0);
  });
});
