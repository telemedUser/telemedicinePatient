import express from "express";
import cors from "cors";
import {
  VALID_EMAIL,
  VALID_PASSWORD,
  NO_RECORD_EMAIL,
  PATIENT_ME,
  DEPENDENTS,
  MEDICAL_HISTORY,
  extractSymptoms,
  hasRedFlag,
} from "./data.js";
import { problem } from "./problem.js";
import { selectProvider } from "./triage/MockTriageProvider.js";
import { listDoctors, getDoctor, getSlots, SPECIALTIES } from "./doctors.js";
import { createAppointment, listAppointments, cancelAppointment } from "./appointments.js";
import { getConsents, setConsent } from "./consents.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  const id = req.header("x-correlation-id") || "-";
  console.log(`[api] ${req.method} ${req.path} cid=${id}`);
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

/* ---- P-01..P-05 (existing) ---- */

app.post("/api/auth/sign-in", (req, res) => {
  const { email, password } = req.body ?? {};
  if (email === NO_RECORD_EMAIL) return res.json({ userId: "no-record-user", hasRecord: false });
  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    return res.json({ userId: PATIENT_ME.id, hasRecord: true });
  }
  return problem(res, 401, "Unauthorized", "Email or password doesn't match.");
});

app.post("/api/auth/claveunica", (_req, res) => res.json({ userId: PATIENT_ME.id, hasRecord: true }));
app.get("/api/patients/me", (_req, res) => res.json(PATIENT_ME));
app.get("/api/patients/me/dependents", (_req, res) => res.json(DEPENDENTS));

app.post("/api/symptoms/extract", (req, res) => {
  const text = req.body?.text ?? "";
  res.json({ chips: extractSymptoms(text), redFlag: hasRedFlag(text) });
});

app.get("/api/patients/:id/medical-history", (req, res) => {
  res.json({ records: MEDICAL_HISTORY[req.params.id] ?? [] });
});

/* ---- P-06 Triage ---- */

app.post("/api/triage/start", (_req, res) => {
  const provider = selectProvider();
  res.json(provider.startTriage());
});

app.post("/api/triage/answer", (req, res) => {
  const provider = selectProvider();
  const { sessionId, questionId, answer } = req.body ?? {};
  if (!sessionId) return problem(res, 400, "Bad Request", "sessionId is required.");
  const result = provider.submitAnswer(sessionId, { questionId, answer });
  if (result.error === "unknown-session") {
    return problem(res, 404, "Not Found", "Triage session not found or expired.");
  }
  res.json(result);
});

app.get("/api/triage/result/:sessionId", (req, res) => {
  const provider = selectProvider();
  const result = provider.buildResult(req.params.sessionId);
  if (!result) return problem(res, 404, "Not Found", "Triage session not found or expired.");
  res.json(result);
});

/* ---- P-07 / P-08 Doctors + slots ---- */

app.get("/api/specialties", (_req, res) => res.json({ specialties: SPECIALTIES }));

app.get("/api/doctors", (req, res) => {
  const { specialty, sort } = req.query;
  res.json({ doctors: listDoctors({ specialty, sort }) });
});

app.get("/api/doctors/:id", (req, res) => {
  const doctor = getDoctor(req.params.id);
  if (!doctor) return problem(res, 404, "Not Found", "Doctor not found.");
  res.json(doctor);
});

app.get("/api/doctors/:id/slots", (req, res) => {
  const slots = getSlots(req.params.id);
  if (!slots) return problem(res, 404, "Not Found", "Doctor not found.");
  res.json({ slots });
});

/* ---- P-09 Cover quote (fixed fee = selected doctor price) ---- */

app.get("/api/cover/quote", (req, res) => {
  const { doctorId } = req.query;
  const doctor = doctorId ? getDoctor(String(doctorId)) : null;
  const feeClp = doctor ? doctor.priceClp : 18000;
  res.json({
    feeClp,
    currency: "CLP",
    note: "Nothing is charged until you confirm on the next screen.",
  });
});

/* ---- P-11 Create appointment (after mock payment) ---- */

app.post("/api/appointments", (req, res) => {
  const { careSubjectId, doctorId, slotId, mode, reason } = req.body ?? {};
  const doctor = doctorId ? getDoctor(String(doctorId)) : null;
  if (!doctor) return problem(res, 400, "Bad Request", "A valid doctorId is required.");
  const slots = getSlots(doctor.id) ?? [];
  const slot = slots.find((s) => s.id === slotId) ?? null;
  if (!slot) return problem(res, 400, "Bad Request", "A valid slotId is required.");
  const appointment = createAppointment({
    careSubjectId,
    doctor,
    slot,
    mode,
    reason,
    feeClp: doctor.priceClp,
  });
  res.status(201).json(appointment);
});

/* ---- P-13 / P-37 Manage appointments ---- */

app.get("/api/appointments", (req, res) => {
  const { status } = req.query;
  res.json({ appointments: listAppointments(status ? String(status) : undefined) });
});

app.post("/api/appointments/:reference/cancel", (req, res) => {
  const appt = cancelAppointment(req.params.reference);
  if (!appt) return problem(res, 404, "Not Found", "Appointment not found.");
  res.json(appt);
});

/* ---- P-23 Consent centre ---- */

app.get("/api/consents", (_req, res) => res.json({ consents: getConsents() }));

app.patch("/api/consents/:id", (req, res) => {
  const updated = setConsent(req.params.id, req.body?.granted);
  if (!updated) return problem(res, 404, "Not Found", "Consent not found.");
  res.json(updated);
});

/* ---- error fallback ---- */
app.use((err, _req, res, _next) => {
  console.error("[api] error", err);
  problem(res, 500, "Internal Server Error", "Something went wrong.");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`patient-booking-api listening on http://localhost:${PORT}`);
});