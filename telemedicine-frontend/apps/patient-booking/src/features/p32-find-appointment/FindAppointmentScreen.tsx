import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";

export function FindAppointmentScreen() {
  useStepMark("P-32" as never);
  const navigate = useNavigate();
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [required, setRequired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setRequired(false);
    setNotFound(false);
    setError(false);
    const value = ref.trim();
    if (!value) { setRequired(true); return; }
    setBusy(true);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000));
    try {
      const res = await Promise.race([apiFetch(`/appointments/${encodeURIComponent(value)}`), timeout]) as Response;
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error();
      navigate(`${BASE_PATH}/consultation-link?ref=${encodeURIComponent(value)}`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-screen="P-32" style={{ maxWidth: 560, margin: "0 auto", padding: "clamp(28px,5cqi,64px) 20px 48px" }}>
      <h1 className="pb-h1">Find my appointment</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 24px", maxWidth: "52ch" }}>
        Enter the appointment reference from your confirmation (for example TM-ABC123) to view your consultation.
      </p>
      <form onSubmit={find} noValidate>
        <label htmlFor="appt-ref" style={{ display: "block", font: "600 14px var(--font-family)", color: "var(--color-heading)", marginBottom: 6 }}>Appointment reference</label>
        <input
          id="appt-ref"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          aria-invalid={required}
          aria-describedby={required ? "ref-required" : undefined}
          placeholder="TM-ABC123"
          style={{ width: "100%", minHeight: 48, padding: "0 14px", borderRadius: 10, border: "1.5px solid #c9d0d8", font: "500 16px var(--font-family)", boxSizing: "border-box" }}
        />
        {required && <p id="ref-required" role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14, marginTop: 8 }}>Please enter an appointment reference.</p>}
        {notFound && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14, marginTop: 8 }}>No appointment matches that reference. Check the reference and try again.</p>}
        {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14, marginTop: 8 }}>Something went wrong looking that up. Please try again.</p>}
        <button type="submit" className="pb-btn pb-btn-primary" disabled={busy} style={{ minHeight: 48, marginTop: 20, width: "100%" }}>
          {busy ? "Searching..." : "Find appointment"}
        </button>
      </form>
    </section>
  );
}