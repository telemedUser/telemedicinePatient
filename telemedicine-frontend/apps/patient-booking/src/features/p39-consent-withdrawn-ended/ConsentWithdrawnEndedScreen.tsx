import { useNavigate } from "react-router-dom";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

export function ConsentWithdrawnEndedScreen() {
  useStepMark("P-39" as never);
  const navigate = useNavigate();
  return (
    <section data-screen="P-39" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(28px,5cqi,64px) 20px 48px", textAlign: "center" }}>
      <h1 className="pb-h1">Consultation ended</h1>
      <p style={{ fontSize: 15, color: "#3a4453", margin: "0 auto 24px", maxWidth: "52ch" }}>
        This consultation ended because a required consent was withdrawn. Your record has been updated. You can start a new consultation whenever you are ready.
      </p>
      <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ minHeight: 48 }}>Go to My care</button>
    </section>
  );
}