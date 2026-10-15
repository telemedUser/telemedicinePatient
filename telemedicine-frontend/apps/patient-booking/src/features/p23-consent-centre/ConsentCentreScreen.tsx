import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { ConsentRecord } from "@/shared/types/booking";

export function ConsentCentreScreen() {
  useStepMark("P-23" as never);
  const navigate = useNavigate();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch("/consents")
      .then((r) => r.json())
      .then((d: { consents: ConsentRecord[] }) => setConsents(d.consents))
      .catch(() => setError("Could not load consents."))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(c: ConsentRecord) {
    const next = !c.granted;
    // optimistic update
    setConsents((prev) => prev.map((x) => (x.id === c.id ? { ...x, granted: next } : x)));
    try {
      const res = await apiFetch(`/consents/${c.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granted: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // revert on error
      setConsents((prev) => prev.map((x) => (x.id === c.id ? { ...x, granted: c.granted } : x)));
      setError("Could not update that consent. Please try again.");
    }
  }

  return (
    <section data-screen="P-23" style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(20px,4cqi,48px) 20px 48px" }}>
      <button type="button" className="pb-btn" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ background: "transparent", color: "var(--color-primary)", marginBottom: 12 }}>← My care</button>
      <h1 className="pb-h1">Consent centre</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 20px", maxWidth: "60ch" }}>
        Change what you've agreed to for upcoming care. Past consultations are kept as part of your medical record and can't be changed here.
      </p>

      {loading && <p role="status" style={{ color: "var(--color-muted)" }}>Loading your consents…</p>}
      {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14 }}>{error}</p>}

      {!loading && (
        <ul aria-label="Consents" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {consents.map((c) => (
            <li key={c.id} className="pb-card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "600 16px var(--font-family)", color: "var(--color-heading)" }}>{c.label}</div>
                <div style={{ fontSize: 14, color: "var(--color-muted)" }}>{c.description}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={c.granted}
                aria-label={`${c.label}: ${c.granted ? "granted" : "withdrawn"}`}
                onClick={() => toggle(c)}
                style={{ flex: "none", width: 52, height: 30, borderRadius: 999, border: 0, cursor: "pointer", background: c.granted ? "var(--color-primary)" : "#c9d0d8", position: "relative" }}
              >
                <span aria-hidden="true" style={{ position: "absolute", top: 3, left: c.granted ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}