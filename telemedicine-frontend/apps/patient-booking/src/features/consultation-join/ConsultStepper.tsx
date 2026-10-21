/**
 * 3-step progress header for the pre-join consultation flow (P-14 → P-16):
 * Confirm it's you · Consents · Device check. The waiting room (P-17) sits after these.
 */
const STEPS = ["Confirm it's you", "Consents", "Device check"];

export function ConsultStepper({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", gap: 12, maxWidth: 680, margin: "0 auto 8px", padding: "0 20px" }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const color = done ? "var(--color-success)" : active ? "var(--color-primary)" : "#9aa7b4";
        return (
          <div key={label} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 3, borderRadius: 2, background: done ? "var(--color-success)" : active ? "var(--color-primary)" : "#d8dee4", marginBottom: 7 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {i + 1} &middot; {done ? (i === 0 ? "Confirmed" : label) : label} {done ? "\u2713" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
