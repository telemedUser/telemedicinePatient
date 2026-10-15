import { useNavigate } from "react-router-dom";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

function fmt(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function FollowUpCompleteScreen() {
  useStepMark("P-31" as never);
  const navigate = useNavigate();
  const { state } = useBooking();
  const { selectedDoctor, selectedSlot } = state;

  return (
    <section data-screen="P-31" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(28px,5cqi,64px) 20px 48px", textAlign: "center" }}>
      <h1 className="pb-h1">Follow-up complete</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 auto 24px", maxWidth: "48ch" }}>
        Your follow-up consultation is complete. A summary has been added to your records.
      </p>

      <div className="pb-card" style={{ textAlign: "left", marginBottom: 24 }}>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0, fontSize: 14 }}>
          <dt style={{ color: "var(--color-muted)" }}>Doctor</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{selectedDoctor?.name ?? "-"}</dd>
          <dt style={{ color: "var(--color-muted)" }}>When</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{fmt(selectedSlot?.startsAt)}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Mode</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{selectedSlot?.mode ?? "-"}</dd>
        </dl>
      </div>

      <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ minHeight: 48 }}>Go to My care</button>
    </section>
  );
}