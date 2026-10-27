import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PhoneOff, FileText, Activity, Loader2, CheckCircle2, Bell, X } from "lucide-react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";

/** The four documents the patient expects, in display order. */
type DocKind = "prescription" | "medicalLeave" | "summary" | "receipt";
const DOC_LABELS: Record<DocKind, string> = {
  prescription: "Prescription",
  medicalLeave: "Medical leave certificate",
  summary: "Consultation summary",
  receipt: "Receipt",
};

interface DocumentsResponse {
  appointmentId: string;
  status: "PENDING" | "ISSUED";
  documentCount: number;
  hasPrescription: boolean;
  hasMedicalLeave: boolean;
  hasSummary: boolean;
  prescriptionNumber?: string | null;
  medicalLeaveNumber?: string | null;
  issuedAt?: string | null;
  plan?: unknown;
}

function timeLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const POLL_MS = 4000;

export function ConsultationSummaryScreen() {
  useStepMark("P-19" as never);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state } = useBooking();
  const ref = params.get("ref") || state.appointmentRef || "CONS-DEMO";

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [rated, setRated] = useState<boolean | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastShownRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Appointment facts for the header (doctor, time range), and whether the patient already rated.
  useEffect(() => {
    void apiFetch(`/appointments/${ref}`).then((r) => (r.ok ? r.json() : null)).then((a) => setAppt(a)).catch(() => {});
    void apiFetch(`/consultations/${ref}/survey`).then((r) => (r.ok ? r.json() : null)).then((s) => setRated(Boolean(s?.submitted))).catch(() => setRated(false));
  }, [ref]);

  // Poll the documents read model until the physician's close event has been projected (status ISSUED).
  useEffect(() => {
    const poll = () => {
      void apiFetch(`/consultations/${ref}/documents`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: DocumentsResponse | null) => {
          if (d) setDocs(d);
          if (d && d.status === "ISSUED" && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        })
        .catch(() => {});
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ref]);

  const ready = docs?.status === "ISSUED";

  // Raise the "documents ready" toast once, when they first become ready — but only if the patient
  // hasn't already rated this consultation (don't nag a returning, already-rated patient).
  useEffect(() => {
    if (ready && rated === false && !toastShownRef.current) {
      toastShownRef.current = true;
      setShowToast(true);
      const t = window.setTimeout(() => setShowToast(false), 8000);
      return () => window.clearTimeout(t);
    }
  }, [ready, rated]);
  const doctorName = appt?.doctor?.name ?? state.selectedDoctor?.name ?? "your doctor";
  const shortDoctor = doctorName.replace(/^(Dr\.?|Dra\.?)\s*/i, "Dr. ");
  const start = appt?.slot?.startsAt ?? state.selectedSlot?.startsAt;
  const mode = (appt?.mode ?? state.selectedMode ?? "video") === "audio" ? "audio" : "video";
  const metaLine = [
    start ? `${timeLabel(start)}` : null,
    `with ${shortDoctor}`,
    mode,
  ].filter(Boolean).join(" · ");

  // Which of the four documents is present (receipt is always issued; others per the care plan).
  const present: Record<DocKind, boolean> = {
    prescription: docs?.hasPrescription ?? false,
    medicalLeave: docs?.hasMedicalLeave ?? false,
    summary: docs?.hasSummary ?? true,
    receipt: true,
  };
  const kinds: DocKind[] = ["prescription", "medicalLeave", "summary", "receipt"];
  const shown = ready ? kinds.filter((k) => present[k]) : kinds;

  return (
    <section data-screen="P-19" style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(16px,3cqi,40px) 20px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 56, height: 56, borderRadius: "50%", background: "#e3f4ea", color: "#1b7f4c", display: "grid", placeItems: "center" }}>
          <PhoneOff size={26} />
        </span>
        <div>
          <h1 className="pb-h1" style={{ margin: 0, fontSize: 30 }}>Consultation ended</h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-muted)", fontSize: 14 }}>{metaLine}</p>
        </div>
      </div>

      {/* Documents card */}
      <div className="pb-card" style={{ marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, color: "var(--color-heading)" }}>
          {ready ? "Your documents are ready" : `${shortDoctor} is finishing your documents`}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shown.map((k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {ready ? (
                <CheckCircle2 size={18} color="var(--color-success)" style={{ flex: "none" }} />
              ) : (
                <Loader2 size={18} color="var(--color-muted)" style={{ flex: "none", animation: "pbspin 1s linear infinite" }} />
              )}
              <span style={{ flex: 1, fontWeight: 600, color: "var(--color-heading)" }}>{DOC_LABELS[k]}</span>
              <span style={{ fontSize: 13, color: ready ? "var(--color-success)" : "var(--color-muted)" }}>
                {ready ? "Ready" : "Preparing…"}
              </span>
            </div>
          ))}
        </div>
        {!ready && (
          <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--color-muted)" }}>
            Usually within 5 minutes. We'll notify you — you can close this page.
          </p>
        )}
        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            className={ready ? "pb-btn pb-btn-primary" : "pb-btn pb-btn-secondary"}
            onClick={() => navigate(`${BASE_PATH}/consultation-details?ref=${encodeURIComponent(ref)}`)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44 }}
          >
            <FileText size={18} /> View consultation details
          </button>
        </div>
      </div>

      {/* Vitals card (static demo readings for now) */}
      <div className="pb-card" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Activity size={18} color="var(--color-primary)" />
          <h2 style={{ margin: 0, fontSize: 16, color: "var(--color-heading)" }}>Your vitals</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: "var(--color-heading)" }}>
              At intake <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>· 15:47</span>
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ color: "var(--color-heading)" }}>96 bpm · 19 /min · 121/78 · stress normal</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: "var(--color-heading)" }}>
              During the call <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>· 16:50</span>
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ color: "var(--color-heading)" }}>92 bpm · 18 /min · 118/76 · stress normal</span>
          </div>
        </div>
      </div>

      {/* Footer actions — prompt to rate only when not already rated. */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {rated ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "600 14px var(--font-family)", color: "var(--color-success)" }}>
            <CheckCircle2 size={18} /> Thanks for rating this consultation
          </span>
        ) : (
          <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/consultation-survey?ref=${encodeURIComponent(ref)}`)} style={{ minHeight: 48, padding: "0 28px" }}>
            Rate this consultation
          </button>
        )}
        <button type="button" onClick={() => navigate(`${BASE_PATH}/home`)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: 14, fontFamily: "var(--font-family)" }}>
          Back to My care
        </button>
      </div>

      {/* Documents-ready toast (top-right), raised once documents flip to ready. */}
      {showToast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 5000, width: 340, maxWidth: "calc(100vw - 32px)", display: "flex", alignItems: "flex-start", gap: 10, background: "#10294a", color: "#fff", borderRadius: 12, padding: "13px 14px", boxShadow: "0 8px 28px rgba(16,41,74,0.24)" }}>
          <Bell size={18} color="#9fb4cc" style={{ flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 13.5px var(--font-family)" }}>Your documents are ready</div>
            <div style={{ marginTop: 3, fontSize: 12.5, lineHeight: 1.45, color: "#c9d6e6" }}>
              Prescription, medical leave, summary and receipt are in Documents.
            </div>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setShowToast(false)} style={{ flex: "none", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
            <X size={16} color="#9fb4cc" />
          </button>
        </div>
      )}
    </section>
  );
}
