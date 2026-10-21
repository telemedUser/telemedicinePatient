import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const HOLD_SECONDS = 9 * 60 + 14; // "slot held 9:14" like the prototype

export function PaymentScreen() {
  useStepMark("P-11");
  const { state, update } = useBooking();
  const { goBack, goTo } = useWizard();
  const [method, setMethod] = useState<"saved" | "new">("saved");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(false);
  const [remaining, setRemaining] = useState(HOLD_SECONDS);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const quote = state.coverQuote;
  const fee = quote?.consultationFee ?? quote?.feeClp ?? state.selectedDoctor?.priceClp ?? 0;
  const voucher = quote?.voucher ?? 0;
  const total = quote?.total ?? Math.max(0, fee - voucher);

  useEffect(() => {
    tick.current = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  async function pay() {
    setProcessing(true);
    setError(false);
    try {
      // 1) Mock payment confirm (records a payment reference; no real gateway).
      await apiFetch("/payments/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, amount: total, currency: "INR" }),
      });
      // 2) Create the appointment now that "payment" succeeded.
      const res = await apiFetch("/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          careSubjectId: state.careSubject?.id,
          careSubjectName: state.careSubject?.name,
          doctorId: state.selectedDoctor?.id,
          slotId: state.selectedSlot?.id,
          mode: state.selectedMode ?? state.selectedSlot?.mode ?? "video",
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

  const cards = [
    { id: "saved" as const, brand: "MASTERCARD", title: "Mastercard \u2022\u2022\u2022\u2022 5521", sub: "Saved card \u00b7 expires 08/28" },
    { id: "new" as const, brand: "CARD", title: "New card", sub: "Debit or credit" },
  ];

  return (
    <section data-screen="P-11" style={{ maxWidth: 560, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Payment</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 20px" }}>
        Secured payment &middot; slot held {mmss}
      </p>

      <div role="radiogroup" aria-label="Payment method" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {cards.map((c) => {
          const on = method === c.id;
          return (
            <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(c.id)}
              style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: "14px 16px", borderRadius: 14, background: on ? "var(--color-tint)" : "#fff", border: `2px solid ${on ? "var(--color-primary)" : "#e1e4e8"}`, cursor: "pointer" }}>
              <span aria-hidden="true" style={{ flex: "none", width: 44, height: 30, borderRadius: 6, background: "var(--color-heading)", color: "#fff", display: "grid", placeItems: "center", fontSize: 8, fontWeight: 700, letterSpacing: "0.03em" }}>
                {c.brand === "MASTERCARD" ? "MC" : "CARD"}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", font: "600 15px var(--font-family)", color: "var(--color-heading)" }}>{c.title}</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--color-muted)" }}>{c.sub}</span>
              </span>
              <span aria-hidden="true" style={{ flex: "none", width: 20, height: 20, borderRadius: "50%", border: `2px solid ${on ? "var(--color-primary)" : "#c9d0d8"}`, background: on ? "var(--color-primary)" : "#fff", display: "grid", placeItems: "center", color: "#fff", fontSize: 12 }}>
                {on ? "\u2713" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pb-card" style={{ marginBottom: 20, fontSize: 14, color: "#3a4453", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Consultation fee</span><span>{inr(fee)}</span></div>
        {voucher > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-success)" }}>
            <span>Insurance voucher{quote?.voucherRef ? ` ${quote.voucherRef}` : ""}</span>
            <span>&#8211; {inr(voucher)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--color-heading)", borderTop: "1px solid #eef0f2", marginTop: 2, paddingTop: 8 }}>
          <span>Total</span><span>{inr(total)}</span>
        </div>
      </div>

      {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14, marginBottom: 10 }}>Payment could not be completed. Please try again.</p>}

      <button type="button" className="pb-btn pb-btn-primary" onClick={pay} disabled={processing} style={{ width: "100%", minHeight: 52, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span aria-hidden="true">&#128274;</span> {processing ? "Processing…" : `Pay ${inr(total)}`}
      </button>
      <button type="button" className="pb-btn" onClick={goBack} disabled={processing} style={{ background: "transparent", color: "var(--color-primary)", width: "100%", marginTop: 8 }}>Back</button>

      <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 14, textAlign: "center" }}>
        Card details are handled by our secure payment provider. We never store your full card number.
      </p>
    </section>
  );
}
