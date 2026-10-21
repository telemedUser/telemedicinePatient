import type { SymptomChip } from "@/shared/types/booking";

/**
 * P-04 "Symptoms we picked up" panel. Shows the symptoms auto-extracted from the free text as
 * removable pills, and a divider-separated "Also have any of these?" row of related symptoms the
 * patient can add. Matches the patient prototype P-04.
 */
export function SymptomChips({
  selected,
  related,
  error,
  onAdd,
  onRemove,
  onDismiss,
}: {
  selected: SymptomChip[];
  related: SymptomChip[];
  error: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onDismiss: () => void;
}) {
  // Nothing to show yet: keep the panel hidden until the extractor returns something.
  if (!error && selected.length === 0 && related.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Symptoms we picked up"
      style={{ background: "#eef5fb", border: "1px solid #d3e5f3", borderRadius: 14, padding: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span aria-hidden="true" style={{ color: "var(--color-primary)", fontSize: 18, lineHeight: 1 }}>
          &#10022;
        </span>
        <span style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", flex: 1 }}>
          Symptoms we picked up
        </span>
        <button
          type="button"
          aria-label="Dismiss suggestions"
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 18, lineHeight: 1, padding: 2 }}
        >
          &#10005;
        </button>
      </div>

      {error && (
        <div role="status" style={{ fontSize: 14, color: "var(--color-warning)" }}>
          Symptom suggestions are unavailable right now. You can still continue.
        </div>
      )}

      {!error && selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {selected.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Remove ${c.label}`}
              onClick={() => onRemove(c.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 12px", borderRadius: 999, background: "#fff", border: "1px solid #bcd6ea", color: "var(--color-heading)", font: "600 14px var(--font-family)", cursor: "pointer" }}
            >
              {c.label}
              <span aria-hidden="true" style={{ color: "var(--color-primary)", fontSize: 13 }}>&#10005;</span>
            </button>
          ))}
        </div>
      )}

      {!error && related.length > 0 && (
        <>
          <div style={{ height: 1, background: "#d3e5f3", margin: "14px 0 12px" }} />
          <div style={{ font: "500 13px var(--font-family)", color: "var(--color-muted)", marginBottom: 8 }}>
            Also have any of these?
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {related.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={`Add ${c.label}`}
                onClick={() => onAdd(c.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 999, background: "#fff", border: "1px solid #cfd7df", color: "var(--color-primary)", font: "600 14px var(--font-family)", cursor: "pointer" }}
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
