export function NoRecordBranch({ onTryAnother }: { onTryAnother: () => void }) {
  return (
    <div className="pb-card">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ fontSize: 28, color: "var(--color-warning)" }}>
          ⚠
        </span>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-heading)", margin: "0 0 6px" }}>
            We couldn't find your record
          </h2>
          <p style={{ fontSize: 15, color: "#3a4453", margin: 0 }}>
            Your account signed in, but no patient record matches it in our
            system. We won't guess — a support agent can link it in a few
            minutes.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        <button type="button" className="pb-btn pb-btn-primary" style={{ flex: "1 1 180px" }}>
          Get help linking my record
        </button>
        <button
          type="button"
          className="pb-btn pb-btn-secondary"
          style={{ flex: "1 1 140px" }}
          onClick={onTryAnother}
        >
          Try another account
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "14px 0 0" }}>
        Reference F-08 · nothing was booked and no identity was assumed.
      </p>
    </div>
  );
}
