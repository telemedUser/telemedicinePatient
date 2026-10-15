import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { ConsentRecord } from "@/shared/types/booking";

export function WithdrawConsentScreen() {
  useStepMark("P-38" as never);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void apiFetch("/consents")
      .then((r) => r.json())
      .then((d: { consents: ConsentRecord[] }) => setConsent(d.consents.find((c) => c.id === id) ?? null))
      .catch(() => {});
  }, [id]);

  async function withdraw() {
    setBusy(true);
    setError(false);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000));
    try {
      const req = apiFetch(`/consents/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granted: false }),
      });
      const res = (await Promise.race([req, timeout])) as Response;
      if (!res.ok) throw new Error();
      setWithdrawn(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-screen="P-38" style={{ maxWidth: 600, margin: "0 auto", padding: "clamp(24px,4cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Withdraw a consent</h1>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 16px" }}>
        You are about to withdraw: <strong style={{ color: "var(--color-heading)" }}>{consent?.label ?? id}</strong>
      </p>

      <div role="note" className="pb-card" style={{ background: "#fff8ec", borderColor: "#f0d9a8", marginBottom: 16, fontSize: 14, color: "#5a4a1e" }}>
        Withdrawing this consent is recorded in your medical record and cannot be removed from the audit history.
      </div>

      {withdrawn ? (
        <div role="status" className="pb-card" style={{ borderColor: "#bfe3cd", background: "#f1faf4", marginBottom: 16 }}>
          <p style={{ margin: 0, color: "#2a7d4f", fontWeight: 600 }}>This consent has been withdrawn.</p>
        </div>
      ) : (
        <>
          {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14 }}>We could not withdraw that consent. It remains as it was. Please try again.</p>}
          <p style={{ fontSize: 15, color: "#3a4453" }}>Are you sure you want to withdraw this consent?</p>
        </>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        {!withdrawn && (
          <button type="button" className="pb-btn pb-btn-primary" onClick={withdraw} disabled={busy} style={{ minHeight: 48, flex: "1 1 200px", background: "var(--color-danger)", borderColor: "var(--color-danger)" }}>
            {busy ? "Withdrawing..." : "Yes, withdraw consent"}
          </button>
        )}
        <button type="button" className="pb-btn pb-btn-secondary" onClick={() => navigate(`${BASE_PATH}/consent-centre`)} disabled={busy} style={{ minHeight: 48 }}>
          {withdrawn ? "Back to Consent centre" : "Cancel"}
        </button>
      </div>
    </section>
  );
}