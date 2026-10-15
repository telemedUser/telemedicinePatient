import { useNavigate } from "react-router-dom";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

export function FollowUpWaitingScreen() {
  useStepMark("P-30" as never);
  const navigate = useNavigate();
  return (
    <section data-screen="P-30" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(28px,5cqi,64px) 20px 48px", textAlign: "center" }}>
      <h1 className="pb-h1">Follow-up waiting room</h1>
      <p style={{ fontSize: 15, color: "#3a4453", margin: "0 auto 24px", maxWidth: "52ch" }}>
        The live follow-up consultation is delivered by the clinical team. Integration with that experience is pending, so this is a placeholder waiting room. You will be able to join from here once the clinical journey is connected.
      </p>
      <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ minHeight: 48 }}>Go to My care</button>
    </section>
  );
}