import { useEffect, useMemo, useState } from "react";
import { Activity, MessageCircle, ClipboardList, Save, CheckCircle2, AlertTriangle, Stethoscope } from "lucide-react";
import {
  VideoCall, ChatPanel, createCareConnectApi, resolveVideoConfig,
  type PatientContext, type CarePlan,
} from "@telemedicine/video-conference";
import "@telemedicine/video-conference/styles.css";

type Tab = "Context" | "Chat" | "Care plan";

const emptyPlan = (consultationId: string, patientId: string): CarePlan => ({
  consultationId, patientId, doctorId: "DOC-1001",
  diagnosis: [{ code: "", name: "", notes: "" }],
  prescriptions: [{ medicationName: "", dosage: "", frequency: "", duration: "", instructions: "" }],
  diagnosticTests: [],
  followUp: { enabled: false, date: null, instructions: "" },
  medicalLeave: { enabled: false, startDate: null, endDate: null, reason: "" },
  status: "DRAFT",
});

export function App() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "CONS-DEMO";
  const patientId = params.get("patient") || "PAT-1001";

  const config = useMemo(() => resolveVideoConfig(), []);
  const api = useMemo(() => createCareConnectApi(config), [config]);

  const [tab, setTab] = useState<Tab>("Context");
  const [context, setContext] = useState<PatientContext | null>(null);
  const [ctxError, setCtxError] = useState("");
  const [plan, setPlan] = useState<CarePlan>(emptyPlan(roomId, patientId));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.getContext(patientId).then(setContext).catch((e) => setCtxError(e.message));
    api.getCarePlan(roomId).then((p) => setPlan((prev) => ({ ...prev, ...p }))).catch(() => {});
  }, [api, patientId, roomId]);

  const setDiag = (k: keyof CarePlan["diagnosis"][number], v: string) =>
    setPlan((p) => ({ ...p, diagnosis: [{ ...(p.diagnosis[0] ?? {}), [k]: v }] }));
  const setRx = (k: keyof CarePlan["prescriptions"][number], v: string) =>
    setPlan((p) => ({ ...p, prescriptions: [{ ...(p.prescriptions[0] ?? {}), [k]: v }] }));

  const save = async (finalize: boolean) => {
    setSaving(true); setStatus("");
    try {
      let result = await api.saveCarePlan(roomId, { ...plan, consultationId: roomId, patientId, status: finalize ? "FINALIZED" : "DRAFT" });
      if (finalize) result = await api.finalizeCarePlan(roomId);
      setPlan(result);
      setStatus(finalize ? "Finalized" : "Draft saved");
    } catch (e) {
      setStatus("Error: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const diag = plan.diagnosis[0] ?? {};
  const rx = plan.prescriptions[0] ?? {};

  return (
    <div className="phys-app">
      <header className="phys-topbar">
        <div className="phys-brand"><Stethoscope size={20} /><b>CareConnect</b><span>· Doctor workspace</span></div>
        <div className="phys-room">Patient {patientId} · Room {roomId}</div>
      </header>

      <main className="phys-workspace">
        <section className="phys-video">
          <VideoCall roomId={roomId} role="doctor" wsUrl={config.wsUrl} />
        </section>

        <aside className="phys-panel">
          <nav className="phys-tabs">
            {(["Context", "Chat", "Care plan"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {t === "Context" ? <Activity size={16} /> : t === "Chat" ? <MessageCircle size={16} /> : <ClipboardList size={16} />} {t}
              </button>
            ))}
          </nav>

          {tab === "Context" && (
            <div className="phys-scroll">
              {ctxError && <div className="phys-notice">Could not load context: {ctxError}</div>}
              {context?.allergies?.length ? (
                <div className="phys-allergy"><AlertTriangle size={16} /><div><b>Allergy alert</b><div>{context.allergies.map((a) => `${a.name}${a.reaction ? ` — ${a.reaction}` : ""}`).join(", ")}</div></div></div>
              ) : null}
              <section className="phys-section"><h3>Reason for visit</h3><p>{context?.reasonForVisit || "No reason supplied yet."}</p>
                {context?.symptoms?.length ? <div className="phys-chips">{context.symptoms.map((s, i) => <span key={i}>{s.name}{s.duration ? ` · ${s.duration}` : ""}{s.severity ? ` · ${s.severity}` : ""}</span>)}</div> : null}
              </section>
              <section className="phys-section"><h3>Quick check</h3>
                {context?.quickChecks?.length ? context.quickChecks.map((q, i) => <div className="phys-kv" key={i}><span>{q.question}</span><b>{q.answer}</b></div>) : <p className="muted">No quick-check data.</p>}
              </section>
              <section className="phys-section"><h3>History</h3>
                <div className="phys-kv"><span>Conditions</span><b>{context?.conditions?.join(", ") || "Not provided"}</b></div>
                <div className="phys-kv"><span>Medications</span><b>{context?.medications?.join(", ") || "Not provided"}</b></div>
                <div className="phys-kv"><span>Medical history</span><b>{context?.medicalHistory?.join(", ") || "Not provided"}</b></div>
              </section>
            </div>
          )}

          {tab === "Chat" && <ChatPanel roomId={roomId} role="doctor" wsUrl={config.wsUrl} />}

          {tab === "Care plan" && (
            <div className="phys-scroll">
              <div className="phys-card"><h3>Diagnosis</h3>
                <label>ICD-10 code<input value={diag.code ?? ""} onChange={(e) => setDiag("code", e.target.value)} placeholder="e.g. J02.9" /></label>
                <label>Diagnosis<input value={diag.name ?? ""} onChange={(e) => setDiag("name", e.target.value)} placeholder="Confirmed diagnosis" /></label>
                <label>Notes<textarea value={diag.notes ?? ""} onChange={(e) => setDiag("notes", e.target.value)} rows={2} /></label>
              </div>
              <div className="phys-card"><h3>Prescription</h3>
                <label>Medication<input value={rx.medicationName ?? ""} onChange={(e) => setRx("medicationName", e.target.value)} /></label>
                <label>Dosage<input value={rx.dosage ?? ""} onChange={(e) => setRx("dosage", e.target.value)} placeholder="e.g. 500 mg" /></label>
                <label>Frequency<input value={rx.frequency ?? ""} onChange={(e) => setRx("frequency", e.target.value)} placeholder="e.g. twice daily" /></label>
                <label>Duration<input value={rx.duration ?? ""} onChange={(e) => setRx("duration", e.target.value)} placeholder="e.g. 5 days" /></label>
              </div>
              <div className="phys-actions">
                <span className="muted">Status: {plan.status}{status ? ` · ${status}` : ""}</span>
                <div>
                  <button className="outline" onClick={() => save(false)} disabled={saving}><Save size={15} /> Save draft</button>
                  <button className="primary" onClick={() => save(true)} disabled={saving}><CheckCircle2 size={15} /> Finalize</button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}