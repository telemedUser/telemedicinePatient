import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { stepUrl, BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import { createInitialBookingState, type Appointment } from "@/shared/types/booking";

function initials(name: string): string {
  return name.replace(/^(Dr\.?|Dra\.?)\s*/i, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
function timeLabel(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return isToday ? `Today ${t}` : d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + ` · ${t}`;
}
function modeLabel(m?: string) {
  return m === "audio" ? "Audio" : "Video";
}
/** Newest slot time first; unknown times sort last. */
function byLatestFirst(a: Appointment, b: Appointment): number {
  const ta = a.slot?.startsAt ? Date.parse(a.slot.startsAt) : -Infinity;
  const tb = b.slot?.startsAt ? Date.parse(b.slot.startsAt) : -Infinity;
  return tb - ta;
}

export function HomeScreen() {
  useStepMark("P-13" as never);
  const { state, update } = useBooking();
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [manageOpen, setManageOpen] = useState<string | null>(null);

  const patientName = state.careSubject?.name ?? "You";

  function load() {
    setLoading(true);
    setError(false);
    // Scope to the signed-in account so My care shows only this user's consultations.
    const pid = state.auth.userId ?? "patient-1";
    const scope = `patientId=${encodeURIComponent(pid)}`;
    void Promise.all([
      apiFetch(`/appointments?status=confirmed&${scope}`).then((r) => r.json()),
      apiFetch(`/appointments?${scope}`).then((r) => r.json()),
    ])
      .then(([conf, all]: [{ appointments: Appointment[] }, { appointments: Appointment[] }]) => {
        setUpcoming([...(conf.appointments ?? [])].sort(byLatestFirst));
        setPast(
          (all.appointments ?? [])
            .filter((a) => a.status === "completed" || a.status === "cancelled")
            .sort(byLatestFirst),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function newConsultation() {
    const fresh = createInitialBookingState();
    update({ ...fresh, auth: { status: "authenticated", userId: "patient-1" } });
    navigate(stepUrl("P-01"));
  }

  const tiles = [
    { icon: "\uD83D\uDCC1", label: "Documents", to: `${BASE_PATH}/past-consultations` },
    { icon: "\uD83D\uDEE1\uFE0F", label: "Consent centre", to: `${BASE_PATH}/consent-centre` },
    { icon: "\u2753", label: "Help", to: `${BASE_PATH}/help` },
    { icon: "\uD83D\uDD14", label: "Notifications", to: `${BASE_PATH}/home` },
  ];

  return (
    <section data-screen="P-13" style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(20px,4cqi,48px) 20px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 24 }}>
        <h1 className="pb-h1" style={{ margin: 0 }}>My care</h1>
        <button type="button" className="pb-btn pb-btn-primary" onClick={newConsultation} style={{ minHeight: 44 }}>+ New consultation</button>
      </div>

      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Loading your consultations…</p>}
      {error && !loading && (
        <div role="alert" className="pb-card" style={{ borderColor: "#f3b8b8" }}>
          <p style={{ margin: "0 0 12px", color: "var(--color-danger-text)" }}>We couldn't load your consultations.</p>
          <button type="button" className="pb-btn pb-btn-primary" onClick={load} style={{ minHeight: 44 }}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "start" }}>
          {/* Upcoming */}
          <div>
            <h2 style={{ font: "700 17px var(--font-family)", color: "var(--color-heading)", margin: "0 0 12px" }}>Upcoming consultations</h2>
            {upcoming.length === 0 ? (
              <div className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 15, color: "#3a4453" }}>You have no upcoming consultations.</div>
                <button type="button" className="pb-btn pb-btn-primary" onClick={newConsultation} style={{ alignSelf: "flex-start", minHeight: 44 }}>Start a new consultation</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {upcoming.map((a, idx) => (
                  <div key={a.reference} className="pb-card" style={{ padding: 0, overflow: "visible" }}>
                    <div style={{ display: "flex", gap: 12, padding: "16px 18px" }}>
                      <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 13px var(--font-family)" }}>
                        {initials(a.doctor.name)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ font: "600 15px var(--font-family)", color: "var(--color-heading)" }}>
                            {modeLabel(a.mode)} consultation · {a.doctor.name}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-primary)", background: "var(--color-tint)", padding: "2px 10px", borderRadius: 999 }}>
                            Confirmed
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 3 }}>
                          {timeLabel(a.slot.startsAt)} · {modeLabel(a.mode)} · 15 min · &#128100; {patientName}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: "#f6f8fa", borderTop: "1px solid var(--color-border)" }}>
                      <span style={{ flex: 1, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--color-muted)" }}>
                        <span aria-hidden="true">&#128274;</span> Opens shortly before your time
                      </span>
                      <div style={{ position: "relative" }}>
                        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => setManageOpen(manageOpen === a.reference ? null : a.reference)} style={{ minHeight: 36, padding: "0 14px" }}>
                          Manage &#9662;
                        </button>
                        {manageOpen === a.reference && (
                          <div style={{ position: "absolute", right: 0, top: 42, zIndex: 5, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 10, boxShadow: "0 8px 28px rgba(16,41,74,0.14)", minWidth: 160, overflow: "hidden" }}>
                            <button type="button" onClick={() => navigate(`${BASE_PATH}/join/confirm?ref=${a.reference}`)} style={menuItem}>Join consultation</button>
                            <button type="button" onClick={() => navigate(`${BASE_PATH}/cancel?ref=${a.reference}`)} style={{ ...menuItem, color: "var(--color-danger-text)" }}>Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {idx === 0 && (
                      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 10 }}>
                          Next steps for this consultation
                        </div>
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          <NextStep icon="&#128276;" text="We'll remind you 15 minutes before." />
                          <NextStep icon="&#128279;" text="Your link opens in My care shortly before — no app to install." />
                          <NextStep icon="&#128241;" text="Allow 5 minutes for a quick device check before you join." />
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          <div>
            <h2 style={{ font: "700 17px var(--font-family)", color: "var(--color-heading)", margin: "0 0 12px" }}>Past consultations</h2>
            {past.length === 0 ? (
              <div className="pb-card" style={{ fontSize: 14, color: "var(--color-muted)" }}>No past consultations yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {past.map((a) => (
                  <button
                    key={a.reference}
                    type="button"
                    onClick={() => navigate(`${BASE_PATH}/past-consultations`)}
                    className="pb-card"
                    style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", border: "1px solid var(--color-border)" }}
                  >
                    <span aria-hidden="true" style={{ flex: "none", width: 38, height: 38, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 12px var(--font-family)" }}>
                      {initials(a.doctor.name)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>
                          {modeLabel(a.mode)} consultation · {a.doctor.name}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: a.status === "completed" ? "var(--color-success)" : "var(--color-danger-text)", background: a.status === "completed" ? "#e3f4ea" : "#fdf0f0", padding: "2px 9px", borderRadius: 999 }}>
                          {a.status === "completed" ? "Completed" : "Cancelled"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 2 }}>{timeLabel(a.slot.startsAt)} · &#128100; {patientName}</div>
                    </div>
                    <span aria-hidden="true" style={{ color: "var(--color-muted)" }}>&#8250;</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Everything in one place */}
      <h2 style={{ font: "700 17px var(--font-family)", color: "var(--color-heading)", margin: "28px 0 12px" }}>Everything in one place</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {tiles.map((t) => (
          <button key={t.label} type="button" onClick={() => navigate(t.to)} className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", cursor: "pointer" }}>
            <span aria-hidden="true" style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ font: "600 15px var(--font-family)", color: "var(--color-heading)" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const menuItem: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 14px",
  background: "none",
  border: "none",
  cursor: "pointer",
  font: "500 14px var(--font-family)",
  color: "var(--color-heading)",
};

function NextStep({ icon, text }: { icon: string; text: string }) {
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--color-text)" }}>
      <span aria-hidden="true" style={{ color: "var(--color-primary)" }} dangerouslySetInnerHTML={{ __html: icon }} />
      <span>{text}</span>
    </li>
  );
}
