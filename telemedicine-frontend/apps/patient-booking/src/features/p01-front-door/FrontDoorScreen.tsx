import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import { HowItWorks } from "./HowItWorks";
import { EmergencyNotice } from "./EmergencyNotice";

export function FrontDoorScreen() {
  useStepMark("P-01");
  const { goNext } = useWizard();

  return (
    <section
      data-screen="P-01"
      style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(28px,5cqi,64px) 20px 48px" }}
    >
      <h1 className="pb-h1" style={{ maxWidth: "20ch" }}>
        Talk to a doctor today
      </h1>
      <p style={{ fontSize: 18, color: "var(--color-muted)", maxWidth: "52ch", margin: "0 0 28px" }}>
        Video and phone consultations with our doctors.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 40 }}>
        <button
          type="button"
          className="pb-btn pb-btn-primary"
          onClick={goNext}
          style={{ flex: "1 1 200px", minHeight: 52 }}
        >
          Get care now
        </button>
        <button
          type="button"
          className="pb-btn pb-btn-secondary"
          onClick={goNext}
          style={{ flex: "1 1 200px", minHeight: 52 }}
        >
          I already have an appointment
        </button>
      </div>

      <HowItWorks />
      <div style={{ height: 32 }} />
      <EmergencyNotice />
    </section>
  );
}
