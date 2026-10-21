import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { ConsultStepper } from "./ConsultStepper";

interface GivenConsent {
  id: string;
  label: string;
  givenAt: string;
  channel: string;
}

export function ConsentsRecapScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state } = useBooking();
  const ref = params.get("ref") || state.appointmentRef || "CONS-DEMO";
  const [consents, setConsents] = useState<GivenConsent[]>([]);

  useEffect(() => {
    void apiFetch(`/consultations/${ref}/consents`)
      .then((r) => r.json())
      .then((d: { consents: GivenConsent[] }) => setConsents(d.consents))
      .catch(() => setConsents([]));
  }, [ref]);

  return (
    <section data-screen="P-15" style={{ padding: "clamp(16px,3cqi,40px) 0 48px" }}>
      <ConsultStepper current={1} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px" }}>
        <h1 className="pb-h1" style={{ marginTop: 8 }}>Your consents</h1>
        <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 16px" }}>
          You gave these when you booked. <strong style={{ color: "var(--color-success)" }}>Nothing new to accept.</strong>
        </p>

        <div className="pb-card" style={{ padding: 0, overflow: "hidden" }}>
          {consents.map((c, i) => (
            <div key={c.id} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: i < consents.length - 1 ? "1px solid var(--color-border)" : "none" }}>
              <span aria-hidden="true" style={{ flex: "none", width: 22, height: 22, borderRadius: "50%", background: "var(--color-success)", color: "#fff", display: "grid", placeItems: "center", fontSize: 13 }}>&#10003;</span>
              <div>
                <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>{c.label}</div>
                <div style={{ fontSize: 13, color: "var(--color-muted)" }}>Given {c.givenAt} &middot; {c.channel}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginTop: 20 }}>
          <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/join/device-check?ref=${encodeURIComponent(ref)}`)} style={{ minHeight: 52, flex: "1 1 240px" }}>
            Continue to device check
          </button>
          <button type="button" onClick={() => navigate(`${BASE_PATH}/consent-centre`)} style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer" }}>Open Consent centre</button>
        </div>
      </div>
    </section>
  );
}
