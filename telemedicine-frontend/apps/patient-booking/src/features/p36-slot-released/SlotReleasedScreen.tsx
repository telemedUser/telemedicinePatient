import { useNavigate } from "react-router-dom";
import { stepUrl } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

export function SlotReleasedScreen() {
  useStepMark("P-36" as never);
  const navigate = useNavigate();
  return (
    <section data-screen="P-36" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(28px,5cqi,64px) 20px 48px", textAlign: "center" }}>
      <h1 className="pb-h1">Your held time was released</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 auto 24px", maxWidth: "48ch" }}>
        We could not keep your slot reserved long enough to finish booking. The time has been released so others can use it. Pick a new time to continue.
      </p>
      <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(stepUrl("P-07"))} style={{ minHeight: 48 }}>Pick a new time</button>
    </section>
  );
}