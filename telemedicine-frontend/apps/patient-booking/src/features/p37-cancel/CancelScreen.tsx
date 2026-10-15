import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function CancelScreen() {
  useStepMark("P-37" as never);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void apiFetch("/appointments")
      .then((r) => r.json())
      .then((d: { appointments: Appointment[] }) => setAppt(d.appointments.find((a) => a.reference === ref) ?? null))
      .catch(() => {});
  }, [ref]);

  function back() { navigate(`${BASE_PATH}/home`); }

  async function confirmCancel() {
    setBusy(true);
    setError(false);
    try {
      const res = await apiFetch(`/appointments/${ref}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error();
      navigate(`${BASE_PATH}/home`);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <section data-screen="P-37" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(20px,4cqi,48px) 20px 48px" }}>
      <button type="button" className="pb-btn" onClick={back} style={{ background: "transparent", color: "var(--color-primary)", marginBottom: 12 }}>← Back</button>
      <h1 className="pb-h1">Cancel this consultation?</h1>

      {appt && (
        <div className="pb-card" style={{ marginBottom: 12 }}>
          <div style={{ font: "600 15px var(--font-family)", color: "var(--color-heading)" }}>{appt.doctor.name} · {appt.doctor.specialty}</div>
          <div style={{ fontSize: 14, color: "var(--color-muted)" }}>{fmt(appt.slot.startsAt)} · {appt.reference}</div>
        </div>
      )}

      {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14 }}>Could not cancel. Please try again.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        <button type="button" className="pb-btn pb-btn-primary" onClick={confirmCancel} disabled={busy} style={{ flex: "1 1 200px", minHeight: 52, background: "var(--color-danger)", borderColor: "var(--color-danger)" }}>
          {busy ? "Cancelling…" : "Yes, cancel consultation"}
        </button>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={back} disabled={busy} style={{ minHeight: 52 }}>Keep appointment</button>
      </div>
    </section>
  );
}