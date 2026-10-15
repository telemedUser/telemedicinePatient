import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

export function AuthorityAttestationScreen() {
  useStepMark("P-27" as never);
  const navigate = useNavigate();
  const { state, update } = useBooking();
  const [checked, setChecked] = useState(state.authorityAttestation?.granted ?? false);
  const [missing, setMissing] = useState(false);

  const subject = state.careSubject;
  const dependentName = subject?.name ?? "your dependent";
  const relationship = subject?.relationship ?? "guardian";

  function cont() {
    if (!checked) { setMissing(true); return; }
    update({ authorityAttestation: { granted: true, dependentName, relationship } });
    navigate(`${BASE_PATH}/dependent-review`);
  }

  return (
    <section data-screen="P-27" style={{ maxWidth: 620, margin: "0 auto", padding: "clamp(24px,4cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Confirm your authority</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 20px", maxWidth: "56ch" }}>
        You are booking care for a dependent. Please confirm you are authorised to act on their behalf.
      </p>

      <div className="pb-card" style={{ marginBottom: 16 }}>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", margin: 0, fontSize: 14 }}>
          <dt style={{ color: "var(--color-muted)" }}>Dependent</dt><dd style={{ margin: 0, color: "var(--color-heading)", fontWeight: 600 }}>{dependentName}</dd>
          <dt style={{ color: "var(--color-muted)" }}>Your relationship</dt><dd style={{ margin: 0, color: "var(--color-heading)", textTransform: "capitalize" }}>{relationship}</dd>
        </dl>
      </div>

      <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", padding: "14px 16px", border: "1.5px solid #c9d0d8", borderRadius: 12 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => { setChecked(e.target.checked); if (e.target.checked) setMissing(false); }}
          aria-describedby={missing ? "attest-missing" : undefined}
          style={{ width: 20, height: 20, marginTop: 2, flex: "none" }}
        />
        <span style={{ fontSize: 14, color: "#3a4453" }}>
          I confirm I am the <strong style={{ color: "var(--color-heading)" }}>{relationship}</strong> of <strong style={{ color: "var(--color-heading)" }}>{dependentName}</strong> and that I have the authority to request and consent to care on their behalf.
        </span>
      </label>
      {missing && <p id="attest-missing" role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14, marginTop: 8 }}>You must confirm your authority before continuing.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(-1)} style={{ minHeight: 48 }}>Back</button>
        <button type="button" className="pb-btn pb-btn-primary" onClick={cont} style={{ minHeight: 48, flex: "1 1 200px" }}>Continue</button>
      </div>
    </section>
  );
}