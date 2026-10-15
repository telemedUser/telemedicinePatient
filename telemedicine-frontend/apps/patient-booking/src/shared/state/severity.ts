import type { SeverityWord } from "@/shared/types/booking";

/** Total mapping over integer severity 0..10. */
export function severityWord(value: number): SeverityWord {
  if (value <= 2) return "Mild";
  if (value <= 6) return "Moderate";
  if (value <= 9) return "Severe";
  return "Worst possible";
}

export function clampSeverity(value: number): number {
  if (Number.isNaN(value)) return 0;
  const n = Math.round(value);
  if (n < 0) return 0;
  if (n > 10) return 10;
  return n;
}
