import { useEffect, useState } from "react";
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
/** Newest slot time first; unknown times sort last. */
function byLatestFirst(a: Appointment, b: Appointment): number {
  const ta = a.slot?.startsAt ? Date.parse(a.slot.startsAt) : -Infinity;
  const tb = b.slot?.startsAt ? Date.parse(b.slot.startsAt) : -Infinity;
  return tb - ta;
}

export function PastConsultationsScreen() {
  useStepMark("P-20" as never);
  const navigate = useNavigate();
  const { state } = useBooking();
  const [items, setItems] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    const pid = state.auth.userId ?? "patient-1";
    const scope = `patientId=${encodeURIComponent(pid)}`;
    Promise.all([
      apiFetch(`/appointments?status=completed&${scope}`).then((r) => r.json()),
      apiFetch(`/appointments?status=cancelled&${scope}`).then((r) => r.json()),
    ])
      .then(([a, b]: { appointments: Appointment[] }[]) => {
        setItems([...(a.appointments ?? []), ...(b.appointments ?? [])].sort(byLatestFirst));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <section data-screen="P-20" style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(20px,4cqi,48px) 20px 48px" }}>
      <button type="button" className="pb-btn" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ background: "transparent", color: "var(--color-primary)", marginBottom: 12 }}>&larr; My care</button>
      <h1 className="pb-h1">Past consultations</h1>

      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Loading your past consultations...</p>}
      {error && !loading && (
        <div role="alert" className="pb-card" style={{ borderColor: "#f3b8b8" }}>
          <p style={{ margin: "0 0 12px", color: "var(--color-danger-text)" }}>We could not load your past consultations.</p>
          <button type="button" className="pb-btn pb-btn-primary" onClick={load} style={{ minHeight: 44 }}>Retry</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="pb-card"><p style={{ margin: 0, color: "#3a4453" }}>You have no past consultations on file.</p></div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          <ul aria-label="Past consultations" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12, flex: "1 1 380px" }}>
            {items.map((a) => (
              <li key={a.reference}>
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  aria-pressed={selected?.reference === a.reference}
                  className="pb-card"
                  style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", border: selected?.reference === a.reference ? "2px solid var(--color-primary)" : undefined }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ font: "700 15px var(--font-family)", color: "var(--color-heading)" }}>{a.doctor.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: a.status === "cancelled" ? "var(--color-danger-text)" : "#2a7d4f" }}>{a.status}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--color-muted)", marginTop: 4 }}>{a.doctor.specialty} &middot; {fmt(a.slot.startsAt)} &middot; {a.mode} &middot; {a.reference}</div>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <aside aria-label="Consultation detail" className="pb-card" style={{ flex: "1 1 300px", position: "sticky", top: 16 }}>
              <h2 style={{ font: "700 17px var(--font-family)", color: "var(--color-heading)", margin: "0 0 12px" }}>{selected.doctor.name}</h2>
              <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", margin: 0, fontSize: 14 }}>
                <dt style={{ color: "var(--color-muted)" }}>Specialty</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{selected.doctor.specialty}</dd>
                <dt style={{ color: "var(--color-muted)" }}>When</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{fmt(selected.slot.startsAt)}</dd>
                <dt style={{ color: "var(--color-muted)" }}>Mode</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{selected.mode}</dd>
                <dt style={{ color: "var(--color-muted)" }}>Reference</dt><dd style={{ margin: 0, color: "var(--color-heading)" }}>{selected.reference}</dd>
                <dt style={{ color: "var(--color-muted)" }}>Status</dt><dd style={{ margin: 0, color: "var(--color-heading)", textTransform: "capitalize" }}>{selected.status}</dd>
              </dl>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}