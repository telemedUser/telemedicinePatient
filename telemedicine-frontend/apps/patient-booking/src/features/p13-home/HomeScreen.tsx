import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { stepUrl, BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import { createInitialBookingState, type Appointment } from "@/shared/types/booking";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function HomeScreen() {
  useStepMark("P-13" as never);
  const { update } = useBooking();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    void apiFetch("/appointments?status=confirmed")
      .then((r) => r.json())
      .then((d: { appointments: Appointment[] }) => setAppointments(d.appointments))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function newConsultation() {
    const fresh = createInitialBookingState();
    update({ ...fresh, auth: { status: "authenticated", userId: "patient-1" } });
    navigate(stepUrl("P-01"));
  }

  return (
    <section data-screen="P-13" style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(20px,4cqi,48px) 20px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 24 }}>
        <h1 className="pb-h1" style={{ margin: 0 }}>My care</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(`${BASE_PATH}/past-consultations`)} style={{ minHeight: 44 }}>Past consultations</button>
          <button type="button" className="pb-btn pb-btn-primary" onClick={newConsultation} style={{ minHeight: 44 }}>+ New consultation</button>
        </div>
      </div>

      <h2 style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)", margin: "0 0 12px" }}>Upcoming consultations</h2>

      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Loading your consultations…</p>}
      {error && !loading && (
        <div role="alert" className="pb-card" style={{ borderColor: "#f3b8b8" }}>
          <p style={{ margin: "0 0 12px", color: "var(--color-danger-text)" }}>We couldn't load your consultations.</p>
          <button type="button" className="pb-btn pb-btn-primary" onClick={load} style={{ minHeight: 44 }}>Retry</button>
        </div>
      )}

      {!loading && !error && appointments.length === 0 && (
        <div className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 15, color: "#3a4453" }}>You have no upcoming consultations.</div>
          <button type="button" className="pb-btn pb-btn-primary" onClick={newConsultation} style={{ alignSelf: "flex-start", minHeight: 44 }}>Start a new consultation</button>
        </div>
      )}

      {!loading && !error && appointments.length > 0 && (
        <ul aria-label="Upcoming consultations" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {appointments.map((a) => (
            <li key={a.reference} className="pb-card" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)" }}>{a.doctor.name}</div>
                <div style={{ fontSize: 14, color: "var(--color-muted)" }}>{a.doctor.specialty} · {fmt(a.slot.startsAt)} · {a.mode} · {a.reference}</div>
              </div>
              <button type="button" className="pb-btn" onClick={() => navigate(`${BASE_PATH}/cancel?ref=${a.reference}`)} style={{ minHeight: 40, background: "transparent", color: "var(--color-danger-text)", border: "1.5px solid #f3c7c7" }}>Cancel</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}