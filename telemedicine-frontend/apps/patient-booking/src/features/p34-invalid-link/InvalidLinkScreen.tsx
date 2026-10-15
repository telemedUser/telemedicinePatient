import { useNavigate } from "react-router-dom";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

export function InvalidLinkScreen() {
  useStepMark("P-34" as never);
  const navigate = useNavigate();
  return (
    <section data-screen="P-34" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(28px,5cqi,64px) 20px 48px", textAlign: "center" }}>
      <div aria-hidden="true" style={{ fontSize: 44, marginBottom: 8 }}>⚠️</div>
      <h1 className="pb-h1">This link is expired or invalid</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 auto 24px", maxWidth: "48ch" }}>
        The consultation link you followed is no longer valid. You can look up your appointment by reference, or get help.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/find-appointment`)} style={{ minHeight: 48 }}>Find my appointment</button>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(`${BASE_PATH}/help`)} style={{ minHeight: 48 }}>Get help</button>
      </div>
    </section>
  );
}