import type { Measurements } from "@/shared/types/booking";

export function MeasurementsBlock({
  value,
  onChange,
}: {
  value: Measurements;
  onChange: (m: Measurements) => void;
}) {
  const parse = (s: string) => (s === "" ? undefined : Number(s));
  return (
    <div className="pb-card" style={{ padding: "14px 16px" }}>
      <div style={{ font: "600 15px var(--font-family)", color: "var(--color-heading)", marginBottom: 10 }}>
        Measurements <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>· used for medicine doses</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <label style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: 6, font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>
          Weight (kg)
          <input
            inputMode="decimal"
            aria-label="Weight in kilograms"
            value={value.weightKg ?? ""}
            min={0.1}
            max={500}
            onChange={(e) => onChange({ ...value, weightKg: parse(e.target.value) })}
            style={{ minHeight: 44, padding: "0 12px", border: "1.5px solid #c9d0d8", borderRadius: 12, font: "16px var(--font-family)" }}
          />
        </label>
        <label style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: 6, font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>
          Height (cm)
          <input
            inputMode="decimal"
            aria-label="Height in centimetres"
            value={value.heightCm ?? ""}
            min={1}
            max={300}
            onChange={(e) => onChange({ ...value, heightCm: parse(e.target.value) })}
            style={{ minHeight: 44, padding: "0 12px", border: "1.5px solid #c9d0d8", borderRadius: 12, font: "16px var(--font-family)" }}
          />
        </label>
      </div>
    </div>
  );
}
