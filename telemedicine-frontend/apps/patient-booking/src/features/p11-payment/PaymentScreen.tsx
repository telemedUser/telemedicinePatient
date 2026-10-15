import { useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";

function clp(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export function PaymentScreen() {
  useStepMark("P-11");
  const { state, update } = useBooking();
  const { goBack, goTo } = useWizard();
  const [method, setMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(false);
  const fee = state.coverQuote?.feeClp ?? state.selectedDoctor?.priceClp ?? 0;

  async function pay() {
    setProcessing(true);
    setError(false);
    // Mock payment: pretend to process, then create the appointment.
    await new Promise((r) => setTimeout(r, 900));
    try {
      const res = await apiFetch("/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          careSubjectId: state.careSubject?.id,
          doctorId: state.selectedDoctor?.id,
          slotId: state.selectedSlot?.id,
          mode: state.selectedSlot?.mode ?? "video",
          reason: state.symptomText,
        }),
      });
      if (!res.ok) throw new Error();
      const appt = (await res.json()) as Appointment;
      update({ appointmentRef: appt.reference });
      goTo("P-12");
    } catch {
      setError(true);
      setProcessing(false);
    }
  }

  return (
    <section data-screen="P-11" style={{ maxWidth: 560, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Payment</h1>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 20px" }}>Secured payment · your slot is held for 10 minutes.</p>

      <div role="radiogroup" aria-label="Payment method" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {[{ id: "card", title: "Credit or debit card", sub: "Visa, Mastercard" }, { id: "webpay", title: "Webpay Plus", sub: "Redirect to bank" }].map((m) => {
          const on = method === m.id;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.id)}
              style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: "14px 16px", borderRadius: 16, background: on ? "var(--color-tint)" : "#fff", border: `2px solid ${on ? "var(--color-primary)" : "#e1e4e8"}`, cursor: "pointer" }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", font: "600 16px var(--font-family)", color: "var(--color-heading)" }}>{m.title}</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--color-muted)" }}>{m.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="pb-card" style={{ marginBottom: 20, fontSize: 14, color: "#3a4453" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Consultation fee</span><span>{clp(fee)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--color-heading)", borderTop: "1px solid #eef0f2", marginTop: 6, paddingTop: 6 }}><span>Total</span><span>{clp(fee)}</span></div>
      </div>

      {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14 }}>Payment could not be completed. Please try again.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button type="button" className="pb-btn pb-btn-primary" onClick={pay} disabled={processing} style={{ flex: "1 1 200px", minHeight: 52 }}>
          {processing ? "Processing…" : `Pay ${clp(fee)}`}
        </button>
        <button type="button" className="pb-btn" onClick={goBack} disabled={processing} style={{ background: "transparent", color: "var(--color-primary)" }}>Back</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 12 }}>This is a mock payment screen — no real charge is made and no card data is captured.</p>
    </section>
  );
}