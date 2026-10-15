import { useNavigate } from "react-router-dom";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

const STAGES = [
  "Identity check",
  "Consents",
  "Device check",
  "Waiting room",
  "Video call",
  "Documents",
  "Survey",
];

export function ConsultationDayStub() {
  useStepMark("P-14" as never);
  const navigate = useNavigate();
  return (
    <section data-screen="consultation-day-stub" style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(24px,4cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Consultation day</h1>
      <p style={{ fontSize: 15, color: "#3a4453", margin: "0 0 20px", maxWidth: "60ch" }}>
        The live consultation experience, covering identity check, consents, device check, waiting room, video call, documents, and survey, is delivered by the clinical team. Integration with that journey is pending.
      </p>

      <div data-integration-seam="P-14..P-22" role="note" className="pb-card" style={{ borderStyle: "dashed", borderColor: "var(--color-primary)", background: "#f2f8fd", marginBottom: 20 }}>
        <div style={{ font: "700 14px var(--font-family)", color: "var(--color-primary)", marginBottom: 8, letterSpacing: ".02em" }}>
          INTEGRATION SEAM &middot; prototype screens P-14 through P-22
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: "#3a4453" }}>
          {STAGES.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>

      <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ minHeight: 48 }}>Back to My care</button>
    </section>
  );
}