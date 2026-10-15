export const RED_FLAG_PHRASES = [
  "chest pain",
  "difficulty breathing",
  "trouble breathing",
  "shortness of breath",
  "cant breathe",
  "can't breathe",
  "suicidal",
  "stroke",
  "severe bleeding",
  "fainting",
  "faint",
  "unconscious",
] as const;

export function matchRedFlag(text: string): string | null {
  const t = text.toLowerCase();
  for (const phrase of RED_FLAG_PHRASES) {
    if (t.includes(phrase)) return phrase;
  }
  return null;
}
