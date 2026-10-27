import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Frown, PhoneCall } from "lucide-react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";

/** Improvement chips offered to detractors/passives. */
const IMPROVEMENTS = [
  "Shorter wait",
  "Better video quality",
  "More time with the doctor",
  "Clearer next steps",
  "Easier joining",
  "Faster documents",
];

interface SurveyResult {
  score: number;
  caseRef?: string | null;
  callbackRequested: boolean;
}

function timeLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Next working day (skips Sat/Sun) label, e.g. "Monday 14 Sep, 18:00". */
function nextWorkingDayLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }) + ", 18:00";
}

export function ConsultationSurveyScreen() {
  useStepMark("P-22" as never);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state } = useBooking();
  const ref = params.get("ref") || state.appointmentRef || "CONS-DEMO";

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<SurveyResult | null>(null);
  const [callbackChoice, setCallbackChoice] = useState<"callme" | "nothanks" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void apiFetch(`/appointments/${ref}`).then((r) => (r.ok ? r.json() : null)).then((a) => setAppt(a)).catch(() => {});
  }, [ref]);

  const doctorName = appt?.doctor?.name ?? state.selectedDoctor?.name ?? "your doctor";
  const start = appt?.slot?.startsAt ?? state.selectedSlot?.startsAt;
  const firstName = (state.careSubject?.name ?? "").trim().split(/\s+/)[0] || "";
  const subLine = `Video consultation with ${doctorName}${start ? ` · today ${timeLabel(start)}` : ""}.`;

  const toggleChip = (c: string) =>
    setChips((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  // Persist the survey. Called on "Send feedback" (base submit) and again when a detractor picks a
  // call-back choice (re-persists with the flag). Last write wins on the same appointment row.
  const persist = async (callbackRequested: boolean): Promise<string | null> => {
    const res = await apiFetch(`/consultations/${ref}/survey`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, improvements: chips, comment, callbackRequested }),
    });
    const data = res.ok ? await res.json() : null;
    return data?.caseRef ?? null;
  };

  const sendFeedback = async () => {
    if (score == null) return;
    setSubmitting(true);
    try {
      const caseRef = await persist(false);
      setResult({ score, caseRef, callbackRequested: false });
    } catch {
      setResult({ score, caseRef: null, callbackRequested: false });
    } finally {
      setSubmitting(false);
    }
  };

  const chooseCallback = async (wantsCall: boolean) => {
    setCallbackChoice(wantsCall ? "callme" : "nothanks");
    try {
      const caseRef = await persist(wantsCall);
      setResult((r) => (r ? { ...r, caseRef: caseRef ?? r.caseRef, callbackRequested: wantsCall } : r));
    } catch {
      /* keep the optimistic choice; it's already shown */
    }
  };

  const Header = (
    <>
      <h1 className="pb-h1" style={{ margin: 0, fontSize: 38 }}>How did it go?</h1>
      <p style={{ margin: "8px 0 20px", color: "var(--color-muted)", fontSize: 15 }}>{subLine}</p>
    </>
  );

  // ---- Result state (after Send feedback) ----
  if (result) {
    const promoter = result.score > 7;
    return (
      <section data-screen="P-22" style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(16px,3cqi,48px) 20px 48px" }}>
        {Header}
        <div className="pb-card" style={{ marginBottom: 18, borderColor: promoter ? "var(--color-border)" : "#f0d9b8" }}>
          {promoter ? (
            <>
              <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: "50%", background: "#e3f4ea", color: "#1b7f4c", marginBottom: 14 }}>
                <Heart size={26} fill="currentColor" />
              </span>
              <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "var(--color-heading)" }}>
                Thanks{firstName ? `, ${firstName}` : ""} — {result.score}/10
              </h2>
              <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 15, lineHeight: 1.6 }}>
                Your feedback goes to Connected Care's clinical quality team. Doctors see only aggregated scores, never who gave them.
              </p>
            </>
          ) : (
            <>
              <h2 style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 10, fontSize: 20, color: "var(--color-heading)" }}>
                <Frown size={22} color="var(--color-warning)" /> We're sorry it wasn't better — {result.score}/10
              </h2>
              <p style={{ margin: "0 0 14px", color: "var(--color-muted)", fontSize: 14, lineHeight: 1.6 }}>
                A member of Connected Care's patient experience team can call you within one working day to understand what went wrong and put it right.
              </p>
              {callbackChoice === "callme" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#e3f4ea", color: "#1b7f4c", borderRadius: 10, padding: "12px 14px", fontSize: 14, fontWeight: 600 }}>
                  <PhoneCall size={18} /> We'll call you by {nextWorkingDayLabel()}. Ref {result.caseRef ?? "—"}.
                </div>
              ) : callbackChoice === "nothanks" ? (
                <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 14 }}>
                  Understood. Your feedback is still logged for the quality team (ref {result.caseRef ?? "—"}).
                </p>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="pb-btn pb-btn-primary" onClick={() => void chooseCallback(true)} style={{ minHeight: 44 }}>
                    Yes, call me
                  </button>
                  <button type="button" className="pb-btn pb-btn-secondary" onClick={() => void chooseCallback(false)} style={{ minHeight: 44 }}>
                    No thanks
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ minHeight: 48, padding: "0 28px" }}>
            Back to My care
          </button>
          <button type="button" onClick={() => navigate(`${BASE_PATH}/consultation-summary?ref=${encodeURIComponent(ref)}`)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: 14, fontFamily: "var(--font-family)" }}>
            See my documents
          </button>
        </div>
      </section>
    );
  }

  // ---- Rating / feedback state ----
  return (
    <section data-screen="P-22" style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(16px,3cqi,48px) 20px 48px" }}>
      {Header}
      <div className="pb-card">
        <h2 style={{ margin: "0 0 14px", fontSize: 16, color: "var(--color-heading)" }}>
          How likely are you to recommend Connected Care video consultations to a friend?
        </h2>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              aria-pressed={score === n}
              style={{
                width: 48, height: 48, flex: "0 0 auto", borderRadius: 10, cursor: "pointer",
                font: "700 15px var(--font-family)",
                border: score === n ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: score === n ? "var(--color-primary)" : "#fff",
                color: score === n ? "#fff" : "var(--color-heading)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--color-muted)" }}>
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>

        {score != null && (
          <>
            <h3 style={{ margin: "20px 0 10px", fontSize: 14, color: "var(--color-heading)" }}>
              What would have made it a 9 or 10? <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(optional)</span>
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {IMPROVEMENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChip(c)}
                  aria-pressed={chips.includes(c)}
                  style={{
                    padding: "8px 14px", borderRadius: 999, cursor: "pointer", font: "600 13px var(--font-family)",
                    border: chips.includes(c) ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: chips.includes(c) ? "var(--color-tint)" : "#fff",
                    color: chips.includes(c) ? "var(--color-primary)" : "var(--color-heading)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <h3 style={{ margin: "18px 0 4px", fontSize: 14, color: "var(--color-heading)" }}>Anything else?</h3>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-muted)" }}>
              Read by Connected Care's quality team, not by your doctor.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional"
              rows={3}
              style={{ width: "100%", padding: 12, border: "1px solid var(--color-border)", borderRadius: 10, font: "14px var(--font-family)", resize: "vertical" }}
            />

            <button
              type="button"
              className="pb-btn pb-btn-primary"
              disabled={submitting}
              onClick={() => void sendFeedback()}
              style={{ width: "100%", minHeight: 50, marginTop: 16 }}
            >
              Send feedback
            </button>
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: 14, textDecoration: "underline", fontFamily: "var(--font-family)", padding: 0 }}>
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
