import type { SymptomChip } from "@/shared/types/booking";

export function SymptomChips({
  selected,
  available,
  error,
  onAdd,
  onRemove,
}: {
  selected: SymptomChip[];
  available: SymptomChip[];
  error: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Symptoms we picked up"
      style={{ background: "#f3f8fc", border: "1px solid #d3e5f3", borderRadius: 14, padding: 12 }}
    >
      <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 8 }}>
        Symptoms we picked up
      </div>

      {error && (
        <div role="status" style={{ fontSize: 14, color: "var(--color-warning)" }}>
          Symptom suggestions are unavailable right now. You can still continue.
        </div>
      )}

      {!error && selected.length === 0 && available.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--color-muted)", margin: 0 }}>
          Start typing your symptoms and we'll suggest some here.
        </p>
      )}

      {!error && selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: available.length ? 10 : 0 }}>
          {selected.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Remove ${c.label}`}
              onClick={() => onRemove(c.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 34, padding: "0 10px", borderRadius: 999, background: "#fff", border: "1px solid #a8cde8", color: "var(--color-heading)", font: "600 14px var(--font-family)", cursor: "pointer" }}
            >
              {c.label} <span aria-hidden="true">{"\u00d7"}</span>
            </button>
          ))}
        </div>
      )}

      {!error && available.length > 0 && (
        <>
          <div style={{ font: "600 13px var(--font-family)", color: "var(--color-muted)", marginBottom: 6 }}>
            Also have any of these?
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {available.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={`Add ${c.label}`}
                onClick={() => onAdd(c.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 34, padding: "0 10px", borderRadius: 999, background: "transparent", border: "1px dashed #9fb0c0", color: "#3a4453", font: "600 14px var(--font-family)", cursor: "pointer" }}
              >
                <span aria-hidden="true">+</span> {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}