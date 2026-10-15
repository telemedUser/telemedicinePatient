import { useCallback, useEffect } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { MedicalHistoryRecord } from "@/shared/types/booking";
import { MedicalHistoryRow } from "./MedicalHistoryRow";
import { AddMissingField } from "./AddMissingField";

export function MedicalHistoryScreen() {
  useStepMark("P-05");
  const { state, updateHistory } = useBooking();
  const { goNext, goBack } = useWizard();
  const history = state.history;
  const subjectId = state.careSubject?.id;

  const load = useCallback(() => {
    if (!subjectId) return;
    updateHistory({ status: "loading" });
    void (async () => {
      try {
        const res = await apiFetch(`/patients/${subjectId}/medical-history`);
        if (!res.ok) throw new Error("history failed");
        const data = (await res.json()) as { records: MedicalHistoryRecord[] };
        if (data.records.length === 0) {
          updateHistory({ status: "empty", records: [] });
        } else {
          updateHistory({ status: "loaded", records: data.records });
        }
      } catch {
        updateHistory({ status: "error" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  function toggleShare(id: string, shared: boolean) {
    updateHistory({
      records: history.records.map((r) => (r.id === id ? { ...r, shared } : r)),
    });
  }
  function saveCorrection(id: string, text: string) {
    updateHistory({
      records: history.records.map((r) => (r.id === id ? { ...r, correction: text } : r)),
    });
  }

  const resolved = history.status === "loaded" || history.status === "empty";

  function confirm() {
    updateHistory({ confirmed: true });
    goNext();
  }

  return (
    <section data-screen="P-05" style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <h1 className="pb-h1">Confirm your medical history</h1>
      <p style={{ fontSize: 16, color: "var(--color-muted)", margin: "0 0 20px" }}>
        Review what we have on file and share what's relevant with your doctor.
      </p>

      {history.status === "loading" && (
        <p role="status" style={{ color: "var(--color-muted)" }}>Loading your medical history…</p>
      )}

      {history.status === "error" && (
        <div role="alert" className="pb-card" style={{ borderColor: "#f3b8b8" }}>
          <p style={{ margin: "0 0 12px", color: "var(--color-danger-text)" }}>
            We couldn't load your medical history.
          </p>
          <button type="button" className="pb-btn pb-btn-primary" onClick={load} style={{ minHeight: 44 }}>
            Retry
          </button>
        </div>
      )}

      {history.status === "empty" && (
        <p className="pb-card" style={{ color: "#3a4453" }}>
          No medical history records are on file. You can add anything relevant below.
        </p>
      )}

      {history.status === "loaded" && (
        <ul aria-label="Medical history" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {history.records.map((r) => (
            <MedicalHistoryRow
              key={r.id}
              record={r}
              onToggleShare={toggleShare}
              onSaveCorrection={saveCorrection}
            />
          ))}
        </ul>
      )}

      {resolved && (
        <AddMissingField
          value={history.addMissing}
          onChange={(v) => updateHistory({ addMissing: v })}
        />
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <button
          type="button"
          className="pb-btn pb-btn-primary"
          onClick={confirm}
          disabled={!resolved}
          style={{ flex: "1 1 200px", minHeight: 52 }}
        >
          {history.confirmed ? "Confirmed" : "Confirm and continue"}
        </button>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>
          Back
        </button>
      </div>

      {history.confirmed && (
        <p role="status" style={{ marginTop: 16, color: "var(--color-success)" }}>
          Medical history confirmed. This is the end of the current booking steps (P-01 to P-05).
        </p>
      )}
    </section>
  );
}
