import { useNavigate } from "react-router-dom";
import { useBooking } from "@/shared/state/BookingProvider";
import { stepUrl } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import { WIZARD_ORDER, STEP_PATHS, createInitialBookingState, type WizardStep } from "@/shared/types/booking";

const STEP_LABELS: Record<WizardStep, string> = {
  "P-01": "Front door",
  "P-02": "Sign in",
  "P-03": "Who needs care",
  "P-04": "Reason",
  "P-05": "Medical history",
  "P-06": "Quick check",
  "P-07": "Doctors",
  "P-08": "Choose a time",
  "P-09": "Cover and cost",
  "P-10": "Review",
  "P-11": "Payment",
  "P-12": "Confirmed",
};

export function WelcomeBackScreen() {
  useStepMark("P-35" as never);
  const { state, update } = useBooking();
  const navigate = useNavigate();
  const furthestIdx = WIZARD_ORDER.indexOf(state.furthestStep);
  const name = state.careSubject?.name?.split(" ")[0] ?? "there";
  const slotHeld = Boolean(state.selectedDoctor && state.selectedSlot && !state.appointmentRef);

  function resume() {
    navigate(stepUrl(state.furthestStep));
  }
  function startOver() {
    const fresh = createInitialBookingState();
    update({ ...fresh, auth: state.auth });
    navigate(stepUrl("P-01"));
  }

  return (
    <section data-screen="P-35" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(24px,5cqi,64px) 20px 48px" }}>
      <h1 className="pb-h1">Welcome back, {name}</h1>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 20px" }}>Pick up where you left off.</p>

      {slotHeld && (
        <div role="status" style={{ display: "flex", gap: 12, alignItems: "center", background: "#e3f4ea", border: "1px solid #bfe3cc", borderRadius: 14, padding: "14px 16px", marginBottom: 16, color: "#14683d" }}>
          <strong>Your slot with {state.selectedDoctor?.name} is held.</strong>
        </div>
      )}

      <div className="pb-card" style={{ marginBottom: 20 }}>
        <ol aria-label="Booking progress" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {WIZARD_ORDER.map((s, i) => {
            const done = i < furthestIdx;
            const current = i === furthestIdx;
            return (
              <li key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: current ? "var(--color-heading)" : "#5b6675", fontWeight: current ? 700 : 400 }}>
                <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", background: done ? "var(--color-success)" : current ? "var(--color-primary)" : "#e1e4e8", color: "#fff", fontSize: 12 }}>{done ? "✓" : i + 1}</span>
                {STEP_LABELS[s]} ({STEP_PATHS[s]})
              </li>
            );
          })}
        </ol>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button type="button" className="pb-btn pb-btn-primary" onClick={resume} style={{ flex: "1 1 200px", minHeight: 52 }}>Resume</button>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={startOver} style={{ minHeight: 52 }}>Start over</button>
      </div>
    </section>
  );
}