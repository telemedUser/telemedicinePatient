import { useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { TriageQuestion, TriageResult } from "@/shared/types/booking";

/** Map the triage urgency code to a patient-facing label. */
function urgencyLabel(u?: string): string {
  if (u === "urgent") return "As soon as possible";
  if (u === "routine") return "Routine";
  return "Same day";
}

export function TriageScreen() {
  useStepMark("P-06");
  const { state, update } = useBooking();
  const { goNext } = useWizard();
  const triage = state.triage;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  function setTriage(patch: Partial<typeof triage>) {
    update({ triage: { ...triage, ...patch } });
  }

  async function start() {
    setBusy(true);
    setError(false);
    try {
      // Send the P-04 symptom context so the AI tailors the quick-check questions.
      const context = {
        symptomText: state.symptomText ?? "",
        symptoms: (state.selectedSymptoms ?? []).map((s) => s.label),
        duration: state.duration ?? "",
        severity: state.severity ?? 0,
      };
      const res = await apiFetch("/triage/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(context),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { sessionId: string; question: TriageQuestion };
      setTriage({ phase: "question", sessionId: data.sessionId, question: data.question });
    } catch {
      setTriage({ phase: "skipped" });
    } finally {
      setBusy(false);
    }
  }

  async function answer(value: "yes" | "no" | "skip") {
    if (!triage.sessionId || !triage.question) return;
    setBusy(true);
    try {
      const res = await apiFetch("/triage/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: triage.sessionId, questionId: triage.question.id, answer: value }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { question?: TriageQuestion; done?: boolean };
      if (data.done) {
        const rr = await apiFetch(`/triage/result/${triage.sessionId}`);
        const result = (await rr.json()) as TriageResult;
        setTriage({ phase: "result", question: null, result });
      } else if (data.question) {
        setTriage({ question: data.question });
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function skipAll() {
    setTriage({ phase: "skipped" });
  }

  return (
    <section data-screen="P-06" style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}>
      <div style={{ font: "600 13px var(--font-family)", color: "#0068ac", marginBottom: 8 }}>Step 3 of 3 · Quick check</div>
      <h1 className="pb-h1">Quick check</h1>

      {triage.phase === "disclosure" && (
        <div className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)" }}>Up to 3 quick questions</div>
          <div style={{ fontSize: 15, color: "#3a4453" }}>Your answers help suggest the right doctor and how soon to be seen.</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "#3a4453" }}>
            <li>✓ The questions are AI-assisted, based on what you told us.</li>
            <li>✓ Your answers go only to your doctor — never used to train AI models.</li>
            <li>✓ A doctor makes every decision.</li>
          </ul>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" className="pb-btn pb-btn-primary" onClick={start} disabled={busy} style={{ flex: "1 1 180px", minHeight: 52 }}>
              Allow the quick check
            </button>
            <button type="button" className="pb-btn pb-btn-secondary" onClick={skipAll} style={{ flex: "1 1 120px", minHeight: 52 }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {triage.phase === "question" && triage.question && (
        <div className="pb-card">
          <div aria-label="Question progress" style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {Array.from({ length: triage.question.total }).map((_, i) => (
              <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < triage.question!.number ? "var(--color-primary)" : "#e1e4e8" }} />
            ))}
          </div>
          <div style={{ font: "600 13px var(--font-family)", color: "var(--color-muted)", marginBottom: 6 }}>
            Question {triage.question.number} of {triage.question.total}
          </div>
          <div style={{ font: "600 22px var(--font-family)", color: "var(--color-heading)", marginBottom: 20 }}>{triage.question.text}</div>
          {error && <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14 }}>Something went wrong. Please try again.</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" className="pb-btn pb-btn-secondary" onClick={() => answer("yes")} disabled={busy} style={{ flex: "1 1 140px", minHeight: 56 }}>Yes</button>
            <button type="button" className="pb-btn pb-btn-secondary" onClick={() => answer("no")} disabled={busy} style={{ flex: "1 1 140px", minHeight: 56 }}>No</button>
          </div>
          <button type="button" className="pb-btn" onClick={() => answer("skip")} style={{ marginTop: 14, background: "transparent", color: "var(--color-primary)" }}>Skip the rest</button>
        </div>
      )}

      {triage.phase === "result" && triage.result && (
        <div className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ font: "700 22px var(--font-family)", color: "var(--color-heading)" }}>
            {triage.result.recommendedSpecialty} · {urgencyLabel(triage.result.urgency)}
          </div>
          {triage.result.videoRecommended && <div style={{ color: "#0068ac", fontWeight: 600 }}>▶ Video recommended</div>}
          {triage.result.rationale && <div style={{ fontSize: 14.5, color: "#3a4453", lineHeight: 1.6 }}>{triage.result.rationale}</div>}
          {triage.result.noEmergencySigns
            ? <div style={{ color: "#14683d", fontWeight: 600 }}>✓ No emergency signs reported</div>
            : <div style={{ color: "var(--color-danger-text)", fontWeight: 600 }}>⚠ You reported a possible emergency sign — see the advice below.</div>}
          <div style={{ background: "#f6f5f2", borderRadius: 12, padding: "4px 14px" }}>
            {triage.result.answers.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: i < triage.result!.answers.length - 1 ? "1px solid #e6e5e1" : "none", fontSize: 14, color: "#3a4453" }}>
                <span>{a.q}</span><span style={{ fontWeight: 700, color: "var(--color-heading)" }}>{a.a}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" className="pb-btn pb-btn-primary" onClick={goNext} style={{ flex: "1 1 180px", minHeight: 52 }}>Use this</button>
            <button type="button" className="pb-btn pb-btn-secondary" onClick={goNext} style={{ flex: "1 1 160px", minHeight: 52 }}>Choose differently</button>
          </div>
        </div>
      )}

      {triage.phase === "skipped" && (
        <div className="pb-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ font: "700 18px var(--font-family)", color: "var(--color-heading)" }}>No problem</div>
          <div style={{ fontSize: 15, color: "#3a4453" }}>You can browse all available doctors and choose who you'd like to see.</div>
          <button type="button" className="pb-btn pb-btn-primary" onClick={goNext} style={{ alignSelf: "flex-start", minHeight: 52 }}>See all available doctors</button>
        </div>
      )}

      <div role="note" style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fdf0f0", border: "1px solid #f3c7c7", borderRadius: 14, padding: "14px 16px", marginTop: 24 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 36, height: 36, borderRadius: "50%", background: "var(--color-danger)", color: "#fff", display: "grid", placeItems: "center" }}>!</span>
        <div style={{ fontSize: 15, color: "var(--color-text)" }}>
          <strong style={{ color: "var(--color-danger-text)" }}>In an emergency</strong> call <a href="tel:131" style={{ fontWeight: 700, color: "var(--color-danger-text)" }}>131 (SAMU)</a> — whatever this check says.
        </div>
      </div>
    </section>
  );
}