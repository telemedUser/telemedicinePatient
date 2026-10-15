export function EmergencyInterrupt({
  phrase,
  onDismiss,
}: {
  phrase: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Emergency: urgent care guidance"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(142,27,27,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="pb-card" style={{ width: "min(560px,100%)", display: "flex", flexDirection: "column", gap: 16 }}>
        <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-danger)", color: "#fff", display: "grid", placeItems: "center", fontSize: 28 }}>
          !
        </span>
        <h2 style={{ color: "var(--color-heading)", margin: 0, fontSize: 28 }}>
          Your symptoms may need urgent care
        </h2>
        <p style={{ fontSize: 16, color: "var(--color-text)", margin: 0 }}>
          You mentioned <strong>&ldquo;{phrase}&rdquo;</strong>. This can be
          serious. Please don&apos;t wait for a video consultation.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a
            href="tel:131"
            className="pb-btn pb-btn-primary"
            style={{ flex: "1 1 200px", background: "var(--color-danger)", borderColor: "var(--color-danger)", textAlign: "center", textDecoration: "none", lineHeight: "48px" }}
          >
            Call 131
          </a>
          <button type="button" className="pb-btn pb-btn-secondary" onClick={onDismiss}>
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
