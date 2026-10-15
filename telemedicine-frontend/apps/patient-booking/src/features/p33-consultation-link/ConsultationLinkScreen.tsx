import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";

function fmt(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ConsultationLinkScreen() {
  useStepMark("P-33" as never);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    void apiFetch(`/appointments/${encodeURIComponent(ref)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: Appointment) => setAppt(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [ref]);

  return (
    <section data-screen="P-33" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(24px,4cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Your consultation</h1>

      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Loading your consultation...</p>}
      {error && !loading && (
        <div role="alert" className="pb-card" style={{ borderColor: "#f3b8b8" }}>
          <p style={{ margin: "0 0 12px", color: "var(--color-danger-text)" }}>We could not find that consultation.</p>
          <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/find-appointment`)} style={{ minHeight: 44 }}>Find my appointment</button>
        </div>
      )}

      {!loading && !error && appt && (
        <>
          <div className="pb-card" style={{ marginBottom: 20 }}>
            <div style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)" }}>{appt.doctor.name}</div>
            <div style={{ fontSize: 14, color: "var(--color-muted)", marginTop: 4 }}>{appt.doctor.specialty}</div>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", margin: "14px 0 0", fontSize: 14 }}>
              <dt style={{ color: "var(--color-muted)" }}>When</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{fmt(appt.slot.startsAt)}</dd>
              <dt style={{ color: "var(--color-muted)" }}>Mode</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{appt.mode}</dd>
              <dt style={{ color: "var(--color-muted)" }}>Reference</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{appt.reference}</dd>
            </dl>
          </div>
          <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/consultation-day`)} style={{ minHeight: 52, width: "100%" }}>Join consultation</button>
        </>
      )}
    </section>
  );
}