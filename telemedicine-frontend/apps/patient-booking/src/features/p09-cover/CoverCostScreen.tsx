import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { CoverQuote } from "@/shared/types/booking";

function clp(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export function CoverCostScreen() {
  useStepMark("P-09");
  const { state, update } = useBooking();
  const { goBack, goTo } = useWizard();
  const [quote, setQuote] = useState<CoverQuote | null>(state.coverQuote);
  const [loading, setLoading] = useState(!state.coverQuote);

  useEffect(() => {
    const doctorId = state.selectedDoctor?.id;
    const slotId = state.selectedSlot?.id;
    setLoading(true);
    const qs = new URLSearchParams();
    if (doctorId) qs.set("doctorId", doctorId);
    if (slotId) qs.set("slotId", slotId);
    void apiFetch(`/cover/quote?${qs.toString()}`)
      .then((r) => r.json())
      .then((q: CoverQuote) => { setQuote(q); update({ coverQuote: q }); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section data-screen="P-09" style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Your cover and cost</h1>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 20px" }}>Nothing is charged until you confirm on the next screen.</p>

      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Calculating your cost…</p>}
      {!loading && quote && (
        <div className="pb-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ font: "600 16px var(--font-family)", color: "var(--color-heading)" }}>Consultation fee</span>
          <span style={{ font: "700 22px var(--font-family)", color: "var(--color-heading)" }}>{clp(quote.feeClp)}</span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <button type="button" className="pb-btn pb-btn-primary" disabled={!quote} onClick={() => goTo("P-10")} style={{ flex: "1 1 200px", minHeight: 52 }}>Continue</button>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>Back</button>
      </div>
    </section>
  );
}