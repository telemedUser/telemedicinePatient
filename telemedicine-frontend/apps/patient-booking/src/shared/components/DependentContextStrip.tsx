import { useI18n } from "@/shared/i18n/i18n";
import { useBooking } from "@/shared/state/BookingProvider";

export function DependentContextStrip() {
  const { t } = useI18n();
  const { state } = useBooking();
  const subject = state.careSubject;

  if (!subject || subject.kind !== "dependent") return null;

  return (
    <div
      role="note"
      aria-label="Dependent context"
      style={{
        background: "var(--color-tint)",
        borderBottom: "1px solid #cfe4f3",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "8px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#fff",
            color: "#0068ac",
            display: "grid",
            placeItems: "center",
            font: "700 12px var(--font-family)",
            boxShadow: "0 0 0 1.5px #bfddf2",
          }}
        >
          {subject.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 14px var(--font-family)", color: "#10294a" }}>
            {t("dependent.bookingFor", {
              name: subject.name,
              age: subject.ageYears,
            })}
          </div>
          <div style={{ fontSize: 12, color: "#3a4453" }}>
            {t("dependent.acting", { relationship: subject.relationship })} ·{" "}
            {t("dependent.bothRecorded")}
          </div>
        </div>
        <button type="button" className="pb-btn pb-btn-secondary">
          {t("dependent.consentCentre")}
        </button>
      </div>
    </div>
  );
}
