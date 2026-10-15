import type { DurationValue } from "@/shared/types/booking";

const OPTIONS: { value: DurationValue; label: string }[] = [
  { value: "under-24h", label: "Under 24h" },
  { value: "1-3-days", label: "1-3 days" },
  { value: "4-7-days", label: "4-7 days" },
  { value: "1-2-weeks", label: "1-2 weeks" },
  { value: "over-2-weeks", label: "Over 2 weeks" },
];

export function DurationRadioGroup({
  value,
  onChange,
}: {
  value: DurationValue | null;
  onChange: (v: DurationValue) => void;
}) {
  return (
    <div>
      <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 8 }}>
        How long?
      </div>
      <div role="radiogroup" aria-label="How long?" style={{ display: "flex", flexWrap: "wrap", gap: 6, background: "#fff", border: "1.5px solid #c9d0d8", borderRadius: 999, padding: 4 }}>
        {OPTIONS.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              style={{
                flex: "1 1 auto",
                minHeight: 40,
                padding: "0 12px",
                borderRadius: 999,
                border: 0,
                background: on ? "var(--color-primary)" : "transparent",
                color: on ? "#fff" : "var(--color-text)",
                font: "600 14px var(--font-family)",
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
