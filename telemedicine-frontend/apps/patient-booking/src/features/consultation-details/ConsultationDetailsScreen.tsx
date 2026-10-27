import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, Eye, Download, ChevronDown, ShieldCheck, LifeBuoy, Bell, ClipboardList, Pill, CalendarCheck, Receipt } from "lucide-react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { Appointment } from "@/shared/types/booking";
import { type CarePlanData, type DocKind, type DocsContext, viewDoc, downloadDoc, downloadAll, buildDocLines } from "./consultationDocs";

interface DocumentsResponse {
  status: "PENDING" | "ISSUED";
  hasPrescription: boolean;
  hasMedicalLeave: boolean;
  hasSummary: boolean;
  prescriptionNumber?: string | null;
  medicalLeaveNumber?: string | null;
  issuedAt?: string | null;
  plan?: CarePlanData | null;
}

function timeLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

const DOC_META: { kind: DocKind; label: string; icon: typeof Pill; sub: (d: DocumentsResponse, ctx: DocsContext) => string }[] = [
  { kind: "prescription", label: "Prescription", icon: Pill, sub: (d) => {
      const meds = d.plan?.prescriptions ?? [];
      const names = meds.map((m) => `${m.name}${m.strength ? ` ${m.strength}` : ""}`).join(" + ");
      return names ? `${names} · PDF` : "PDF";
    } },
  { kind: "medicalLeave", label: "Medical leave", icon: CalendarCheck, sub: (d) => {
      const ml = d.plan?.medicalLeave;
      if (!ml?.enabled) return "PDF";
      return `${dayLabel(ml.startDate)}–${dayLabel(ml.endDate)} · PDF`;
    } },
  { kind: "summary", label: "Consultation summary", icon: ClipboardList, sub: () => "Diagnosis, advice and follow-up · PDF" },
  { kind: "receipt", label: "Receipt", icon: Receipt, sub: (_d, ctx) => `${ctx.feeLabel ?? ""} · PDF` },
];

function Collapsible({ icon: Icon, title, count, children, action }: { icon: typeof ShieldCheck; title: string; count: number; children?: React.ReactNode; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pb-card" style={{ marginBottom: 14, padding: 0 }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", font: "600 15px var(--font-family)", color: "var(--color-heading)" }}>
        <Icon size={18} color="var(--color-primary)" />
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", background: "#eef1f4", borderRadius: 999, padding: "2px 9px" }}>{count}</span>
        {action}
        <ChevronDown size={18} color="var(--color-muted)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && children && <div style={{ padding: "0 18px 16px" }}>{children}</div>}
    </div>
  );
}

export function ConsultationDetailsScreen() {
  useStepMark("P-20" as never);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state } = useBooking();
  const ref = params.get("ref") || state.appointmentRef || "CONS-DEMO";

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [rated, setRated] = useState<boolean | null>(null);

  useEffect(() => {
    void apiFetch(`/appointments/${ref}`).then((r) => (r.ok ? r.json() : null)).then(setAppt).catch(() => {});
    void apiFetch(`/consultations/${ref}/documents`).then((r) => (r.ok ? r.json() : null)).then(setDocs).catch(() => {});
    void apiFetch(`/consultations/${ref}/survey`).then((r) => (r.ok ? r.json() : null)).then((s) => setRated(Boolean(s?.submitted))).catch(() => setRated(false));
  }, [ref]);

  const doctorName = appt?.doctor?.name ?? state.selectedDoctor?.name ?? "your doctor";
  const shortDoctor = doctorName.replace(/^(Dr\.?|Dra\.?)\s*/i, "Dr. ");
  const start = appt?.slot?.startsAt ?? state.selectedSlot?.startsAt;
  const mode = (appt?.mode ?? state.selectedMode ?? "video") === "audio" ? "audio" : "video";
  const feeLabel = appt?.feeClp != null ? `₹${appt.feeClp}` : state.coverQuote?.feeClp != null ? `₹${state.coverQuote.feeClp}` : undefined;
  const primary = docs?.plan?.diagnoses?.find((d) => d.primary) ?? docs?.plan?.diagnoses?.[0];
  const closed = docs?.status === "ISSUED";

  const ctx: DocsContext = useMemo(() => ({
    plan: docs?.plan ?? null,
    prescriptionNumber: docs?.prescriptionNumber,
    medicalLeaveNumber: docs?.medicalLeaveNumber,
    issuedAt: docs?.issuedAt,
    reference: ref,
    patientName: state.careSubject?.name ?? "Patient",
    doctorName: shortDoctor,
    doctorSpecialty: appt?.doctor?.specialty,
    mode,
    feeLabel,
  }), [docs, ref, state.careSubject, shortDoctor, appt, mode, feeLabel]);

  const outcome = [
    primary ? `${primary.title}` : null,
    (docs?.plan?.prescriptions?.length ?? 0) > 0 ? `${docs!.plan!.prescriptions!.length} medicine${docs!.plan!.prescriptions!.length === 1 ? "" : "s"}` : null,
    docs?.plan?.medicalLeave?.enabled ? "medical leave" : null,
  ].filter(Boolean).join(" · ") || "—";

  return (
    <section data-screen="P-20" style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(16px,3cqi,40px) 20px 48px" }}>
      <button type="button" onClick={() => navigate(`${BASE_PATH}/consultation-summary?ref=${encodeURIComponent(ref)}`)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", font: "600 14px var(--font-family)", marginBottom: 14 }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <span style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center", font: "700 14px var(--font-family)" }}>
          {(state.careSubject?.name ?? "P").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="pb-h1" style={{ margin: 0, fontSize: 24 }}>Video consultation · {shortDoctor}</h1>
            {closed && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-success)", background: "#e3f4ea", padding: "3px 10px", borderRadius: 999 }}>✓ Completed</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 3 }}>
            {state.careSubject?.name ?? "Patient"} · {dayLabel(start)} · {timeLabel(start)} · {mode === "audio" ? "Audio" : "Video"}
          </div>
        </div>
      </div>

      {/* Rate banner — only if not yet rated */}
      {rated === false && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--color-tint)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>How was your consultation?</div>
            <div style={{ fontSize: 13, color: "var(--color-primary)" }}>Two quick questions — it helps us and {shortDoctor}.</div>
          </div>
          <button type="button" className="pb-btn pb-btn-primary" onClick={() => navigate(`${BASE_PATH}/consultation-survey?ref=${encodeURIComponent(ref)}`)} style={{ minHeight: 40 }}>Rate it</button>
        </div>
      )}

      {/* Summary */}
      <div className="pb-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <ClipboardList size={18} color="var(--color-primary)" />
          <h2 style={{ margin: 0, fontSize: 16, color: "var(--color-heading)" }}>Summary</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <Field label="Doctor" value={`${shortDoctor}${appt?.doctor?.specialty ? ` · ${appt.doctor.specialty}` : ""}`} />
          <Field label="Reason" value={appt?.reason ?? "—"} />
          <Field label="Outcome" value={outcome} />
          <Field label="Cost" value={feeLabel ?? "—"} />
          <Field label="Reference" value={ref} />
        </div>
        {docs?.plan?.summary?.instructions && (
          <div style={{ marginTop: 14, background: "var(--color-bg-muted, #f6f8fa)", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, color: "var(--color-muted)", lineHeight: 1.6 }}>
            {docs.plan.summary.instructions}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="pb-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <FileText size={18} color="var(--color-primary)" />
          <h2 style={{ margin: 0, flex: 1, fontSize: 16, color: "var(--color-heading)" }}>Documents <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", background: "#eef1f4", borderRadius: 999, padding: "2px 9px" }}>{DOC_META.filter((m) => buildDocLines(m.kind, ctx)).length}</span></h2>
          <button type="button" onClick={() => downloadAll(ctx)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", font: "600 13px var(--font-family)" }}>
            <Download size={15} /> Download all
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {DOC_META.map((m, i) => {
            const available = Boolean(docs && buildDocLines(m.kind, ctx));
            if (!available) return null;
            const Ico = m.icon;
            return (
              <div key={m.kind} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--color-border)" }}>
                <span style={{ flex: "none", width: 34, height: 34, borderRadius: 8, background: "var(--color-tint)", color: "#0068ac", display: "grid", placeItems: "center" }}><Ico size={17} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>{m.label}</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-muted)" }}>{docs ? m.sub(docs, ctx) : "PDF"}</div>
                </div>
                <button type="button" aria-label={`View ${m.label}`} onClick={() => viewDoc(m.kind, ctx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", display: "flex", padding: 6 }}><Eye size={18} /></button>
                <button type="button" aria-label={`Download ${m.label}`} onClick={() => downloadDoc(m.kind, ctx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", display: "flex", padding: 6 }}><Download size={18} /></button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consents / Help / Notifications */}
      <Collapsible icon={ShieldCheck} title="Consents" count={5}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--color-muted)", lineHeight: 1.8 }}>
          <li>Platform terms</li><li>Privacy notice</li><li>Clinical informed consent</li>
          <li>Share eligibility data for insurance</li><li>Telemetry during the call</li>
        </ul>
      </Collapsible>
      <Collapsible icon={LifeBuoy} title="Help" count={0} action={<span className="pb-btn pb-btn-secondary" style={{ minHeight: 34, padding: "0 14px", fontSize: 13, pointerEvents: "none" }}>Get help</span>}>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--color-muted)" }}>No help requests for this consultation.</p>
      </Collapsible>
      <Collapsible icon={Bell} title="Notifications" count={4}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--color-muted)", lineHeight: 1.8 }}>
          <li>Documents ready</li><li>Prescription issued</li><li>Medical leave issued</li><li>Consultation summary available</li>
        </ul>
      </Collapsible>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-muted)" }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--color-heading)", marginTop: 4, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
