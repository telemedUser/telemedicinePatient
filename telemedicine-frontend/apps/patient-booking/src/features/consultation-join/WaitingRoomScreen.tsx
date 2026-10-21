import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import type { Appointment } from "@/shared/types/booking";

function initials(name?: string) {
  return (name ?? "").replace(/^(Dr\.?|Dra\.?)\s*/i, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
function timeLabel(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WaitingRoomScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state } = useBooking();
  const ref = params.get("ref") || state.appointmentRef || "CONS-DEMO";

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [doctorReady, setDoctorReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void apiFetch(`/appointments/${ref}`).then((r) => (r.ok ? r.json() : null)).then((a) => setAppt(a)).catch(() => {});
  }, [ref]);

  useEffect(() => {
    const poll = () => {
      void apiFetch(`/consultations/${ref}/status`)
        .then((r) => r.json())
        .then((d: { doctorReady?: boolean }) => { if (d.doctorReady) setDoctorReady(true); })
        .catch(() => {});
    };
    poll();
    pollRef.current = setInterval(poll, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ref]);

  const doctorName = appt?.doctor?.name ?? "your doctor";
  const shortName = doctorName.replace(/^(Dr\.?|Dra\.?)\s*/i, "Dr. ").split(" ").slice(0, 2).join(" ");
  const mode = appt?.mode === "audio" ? "Audio" : "Video";

  function join() {
    navigate(`${BASE_PATH}/consultation-video?ref=${encodeURIComponent(ref)}`);
  }

  return (
    <section data-screen="P-17" style={{ maxWidth: 1020, margin: "0 auto", padding: "clamp(16px,3cqi,40px) 20px 48px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
        <h1 className="pb-h1" style={{ margin: 0 }}>{shortName} will let you in</h1>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--color-success)", background: "#e3f4ea", padding: "5px 12px", borderRadius: 999 }}>
          &#10003; You're ready
        </span>
      </div>

      {/* Appointment card */}
      <div className="pb-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, padding: "16px 18px" }}>
          <span aria-hidden="true" style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 15px var(--font-family)" }}>
            {initials(appt?.doctor?.name)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 16px var(--font-family)", color: "var(--color-heading)" }}>{appt?.doctor?.name ?? "—"}</div>
            <div style={{ fontSize: 13, color: "var(--color-muted)" }}>{appt?.doctor?.specialty}{appt?.doctor?.clinic ? ` · ${appt.doctor.clinic}` : ""}</div>
            <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
              Scheduled {timeLabel(appt?.slot?.startsAt)} · {mode} · 15 min
            </div>
          </div>
          <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 5, height: 28, fontSize: 12, fontWeight: 600, color: "var(--color-primary)", background: "var(--color-tint)", padding: "0 12px", borderRadius: 999 }}>
            &#128197; On time
          </span>
        </div>
        <div style={{ padding: "0 18px 16px" }}>
          {doctorReady ? (
            <button type="button" className="pb-btn pb-btn-primary" onClick={join} style={{ width: "100%", minHeight: 52 }}>
              &#128249; Join the consultation
            </button>
          ) : (
            <div style={{ width: "100%", minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#eef1f4", borderRadius: 12, color: "var(--color-muted)", fontWeight: 600 }}>
              &#8987; The doctor will let you in
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
        {/* Messages */}
        <div className="pb-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, font: "600 15px var(--font-family)", color: "var(--color-heading)", marginBottom: 6 }}>
            &#128172; Messages from the clinic
          </div>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 12px" }}>No messages yet. If the doctor is delayed, you'll see it here first.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input aria-label="Message the clinic" placeholder="Message the clinic" style={{ flex: 1, height: 42, padding: "0 12px", border: "1px solid var(--color-border)", borderRadius: 999, font: "14px var(--font-family)" }} />
            <button type="button" aria-label="Send" style={{ flex: "none", width: 42, height: 42, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer" }}>&#10148;</button>
          </div>
        </div>

        {/* While you wait */}
        <div className="pb-card">
          <div style={{ font: "600 15px var(--font-family)", color: "var(--color-heading)", marginBottom: 10 }}>While you wait</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Find a quiet, private spot with good light.",
              "Keep your medicines and any recent test results to hand.",
              "Keep this page open — we'll alert you when the doctor joins.",
            ].map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--color-text)" }}>
                <span aria-hidden="true" style={{ color: "var(--color-primary)" }}>&#8226;</span>{t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 }}>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(`${BASE_PATH}/join/device-check?ref=${encodeURIComponent(ref)}`)} style={{ minHeight: 42 }}>&#128421; Re-run device check</button>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(`${BASE_PATH}/help`)} style={{ minHeight: 42 }}>&#10067; Get help</button>
      </div>
    </section>
  );
}
