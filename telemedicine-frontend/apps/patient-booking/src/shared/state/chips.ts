import type { SymptomChip } from "@/shared/types/booking";

export interface ChipSets {
  selected: SymptomChip[];
  available: SymptomChip[];
}

function dedupeById(chips: SymptomChip[]): SymptomChip[] {
  const seen = new Set<string>();
  const out: SymptomChip[] = [];
  for (const c of chips) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/** Initialise from extracted candidates: all selected, none available-only. */
export function initChipSets(candidates: SymptomChip[]): ChipSets {
  return { selected: dedupeById(candidates), available: [] };
}

/** Move a chip from available -> selected. No-op if not in available. */
export function addChip(sets: ChipSets, id: string): ChipSets {
  const chip = sets.available.find((c) => c.id === id);
  if (!chip) return sets;
  return {
    selected: dedupeById([...sets.selected, chip]),
    available: sets.available.filter((c) => c.id !== id),
  };
}

/** Move a chip from selected -> available. No-op if not in selected. */
export function removeChip(sets: ChipSets, id: string): ChipSets {
  const chip = sets.selected.find((c) => c.id === id);
  if (!chip) return sets;
  return {
    selected: sets.selected.filter((c) => c.id !== id),
    available: dedupeById([...sets.available, chip]),
  };
}
