import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { VideoCall, ChatPanel, resolveVideoConfig } from "@telemedicine/video-conference";
import "@telemedicine/video-conference/styles.css";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

/**
 * Patient-side video consultation. Joins the CareConnect room keyed by the
 * appointment reference so the patient and physician meet in the same room.
 * Room id comes from ?ref= or the booking state's appointmentRef.
 */
export function VideoConsultationScreen() {
  useStepMark("P-18" as never);
  const navigate = useNavigate();
  const { state } = useBooking();
  const [params] = useSearchParams();

  const roomId = params.get("ref") || state.appointmentRef || "CONS-DEMO";
  const patientId = state.careSubject?.id || state.auth.userId || "PAT-1001";
  const config = useMemo(() => resolveVideoConfig(), []);

  return (
    <section data-screen="patient-video" data-patient={patientId} style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(16px,3cqi,32px) 20px 40px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <h1 className="pb-h1" style={{ margin: 0 }}>Your video consultation</h1>
        <span style={{ fontSize: 14, color: "var(--color-muted)" }}>Room {roomId}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20, alignItems: "start" }}>
        <VideoCall roomId={roomId} role="patient" wsUrl={config.wsUrl} />
        <aside className="pb-card" style={{ padding: 0, overflow: "hidden", height: 460, display: "flex", flexDirection: "column" }}>
          <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)", padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
            Chat with your doctor
          </div>
          <ChatPanel roomId={roomId} role="patient" wsUrl={config.wsUrl} />
        </aside>
      </div>

      <div style={{ marginTop: 20 }}>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ minHeight: 44 }}>
          Back to My care
        </button>
      </div>
    </section>
  );
}