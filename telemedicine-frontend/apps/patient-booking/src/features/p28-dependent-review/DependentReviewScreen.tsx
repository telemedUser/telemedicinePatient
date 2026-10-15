import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";

function fmt(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function DependentReviewScreen() {
  useStepMark("P-28" as never);
  const navigate = useNavigate();
  const { state, update } = useBooking();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const { careSubject, selectedDoctor, selectedSlot, coverQuote } = state;
  const symptoms = state.selectedSymptoms.map((s) => s.label).join(", ");

  async function confirm() {
    if (!selectedDoctor || !selectedSlot) return;
    setBusy(true);
    setError(false);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000));
    try {
      const req = apiFetch("/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          careSubjectId: careSubject?.id,
          doctorId: selectedDoctor.id,
          slotId: selectedSlot.id,
          mode: selectedSlot.mode,
          reason: state.symptomText,
        }),
      });
      const res = (await Promise.race([req, timeout])) as Response;
      if (!res.ok) throw new Error();
      const appt = (await res.json()) as Appointment;
      update({ appointmentRef: appt.reference });
      navigate(`${BASE_PATH}/follow-up-booked`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-screen="P-28" style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px,4cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Review and confirm</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 20px" }}>Please check the details for this dependent booking.</p>

      <div className="pb-card" style={{ marginBottom: 16 }}>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0, fontSize: 14 }}>
          <dt style={{ color: "var(--color-muted)" }}>For</dt><dd style={{ margin: 0, color: "var(--color-heading)", fontWeight: 600 }}>{careSubject?.name ?? "-"}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Reason</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{symptoms || state.symptomText || "-"}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Doctor</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{selectedDoctor?.name ?? "-"} ({selectedDoctor?.specialty})</dd>
          <dt style={{ color: "var(--color-muted)" }}>When</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{fmt(selectedSlot?.startsAt)}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Mode</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{selectedSlot?.mode ?? "-"}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Fee</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{coverQuote ? `${coverQuote.currency} ${coverQuote.feeClp.toLocaleString()}` : (selectedDoctor ? `CLP ${selectedDoctor.priceClp.toLocaleString()}` : "-")}</dd>
        </dl>
      </div>

      {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14 }}>We could not confirm the booking. Please try again.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(-1)} disabled={busy} style={{ minHeight: 48 }}>Back</button>
        <button type="button" className="pb-btn pb-btn-primary" onClick={confirm} disabled={busy} style={{ minHeight: 48, flex: "1 1 200px" }}>{busy ? "Confirming..." : "Confirm booking"}</button>
      </div>
    </section>
  );
}