import { useNavigate } from "react-router-dom";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

const FAQS = [
  { q: "How do I join my video consultation?", a: "Open the appointment from My care and select Join. A link is also available from Find my appointment." },
  { q: "Can I book for a family member?", a: "Yes. On \"Who needs care?\" choose the dependent. You'll confirm your authority to act for them before the booking is made." },
  { q: "When am I charged?", a: "Nothing is charged until you confirm on the payment step. You can review the fee before paying." },
  { q: "How do I cancel?", a: "Open the appointment from My care and select Cancel. You can cancel up until the consultation starts." },
];

export function HelpScreen() {
  useStepMark("P-24" as never);
  const navigate = useNavigate();
  return (
    <section data-screen="P-24" style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(20px,4cqi,48px) 20px 48px" }}>
      <button type="button" className="pb-btn" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ background: "transparent", color: "var(--color-primary)", marginBottom: 12 }}>← My care</button>
      <h1 className="pb-h1">Help</h1>

      <h2 style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)", margin: "24px 0 12px" }}>Frequently asked questions</h2>
      <ul aria-label="Frequently asked questions" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {FAQS.map((f) => (
          <li key={f.q} className="pb-card">
            <div style={{ font: "600 15px var(--font-family)", color: "var(--color-heading)", marginBottom: 4 }}>{f.q}</div>
            <div style={{ fontSize: 14, color: "var(--color-muted)" }}>{f.a}</div>
          </li>
        ))}
      </ul>

      <h2 style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)", margin: "28px 0 12px" }}>Contact us</h2>
      <div className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 14, color: "#3a4453" }}>Support team: <a href="mailto:support@telemedicine.example" style={{ color: "var(--color-primary)" }}>support@telemedicine.example</a></div>
        <div style={{ fontSize: 14, color: "#3a4453" }}>Phone: <a href="tel:+56000000000" style={{ color: "var(--color-primary)" }}>+56 00 000 0000</a> (Mon-Fri, 9:00-18:00)</div>
      </div>

      <div role="note" className="pb-card" style={{ marginTop: 20, borderColor: "#f3b8b8", background: "#fff5f5" }}>
        <div style={{ font: "700 15px var(--font-family)", color: "var(--color-danger-text)", marginBottom: 4 }}>In an emergency</div>
        <div style={{ fontSize: 14, color: "#3a4453" }}>
          If this is a medical emergency, call <a href="tel:131" style={{ color: "var(--color-danger-text)", fontWeight: 700 }}>131 (SAMU)</a> now.
        </div>
      </div>
    </section>
  );
}