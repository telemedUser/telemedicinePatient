export function EmergencyNotice() {
  return (
    <div
      role="note"
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        background: "#fdf0f0",
        border: "1px solid #f3c7c7",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "var(--color-danger)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
        }}
      >
        !
      </span>
      <div style={{ fontSize: 15, color: "var(--color-text)" }}>
        <strong style={{ color: "var(--color-danger-text)" }}>
          If you think this is an emergency,
        </strong>{" "}
        call{" "}
        <a href="tel:131" style={{ fontWeight: 700, color: "var(--color-danger-text)" }}>
          131 (SAMU)
        </a>{" "}
        or go to the nearest emergency department. This service is not for emergencies.
      </div>
    </div>
  );
}
