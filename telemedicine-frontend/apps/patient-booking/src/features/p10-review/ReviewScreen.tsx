import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

function clp(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}
function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ReviewScreen() {
  useStepMark("P-10");
  const { state } = useBooking();
  const { goBack, goTo } = useWizard();
  const d = state.selectedDoctor;
  const s = state.selectedSlot;

  const rows: { label: string; value: string; step?: Parameters<typeof goTo>[0] }[] = [
    { label: "For", value: state.careSubject?.name ?? "—", step: "P-03" },
    { label: "Reason", value: state.selectedSymptoms.map((c) => c.label).join(", ") || state.symptomText || "—", step: "P-04" },
    { label: "Doctor", value: d ? `${d.name} · ${d.specialty}` : "—", step: "P-07" },
    { label: "When", value: fmt(s?.startsAt), step: "P-08" },
    { label: "Mode", value: (s?.mode ?? d?.mode ?? "video"), step: "P-08" },
    { label: "Fee", value: state.coverQuote ? clp(state.coverQuote.feeClp) : "—", step: "P-09" },
  ];

  return (
    <section data-screen="P-10" style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Review and confirm</h1>
      <ul style={{ listStyle: "none", margin: "0 0 20px", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <li key={r.label} className="pb-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", font: "600 13px var(--font-family)", color: "var(--color-muted)" }}>{r.label}</span>
              <span style={{ display: "block", font: "600 15px var(--font-family)", color: "var(--color-heading)" }}>{r.value}</span>
            </span>
            {r.step && (
              <button type="button" className="pb-btn" onClick={() => goTo(r.step!)} style={{ minHeight: 36, background: "transparent", color: "var(--color-primary)" }}>Edit</button>
            )}
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button type="button" className="pb-btn pb-btn-primary" onClick={() => goTo("P-11")} style={{ flex: "1 1 200px", minHeight: 52 }}>Confirm</button>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>Back</button>
      </div>
    </section>
  );
}