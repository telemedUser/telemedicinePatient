import { http, HttpResponse, delay } from "msw";
import {
  DEPENDENTS,
  extractSymptoms,
  MEDICAL_HISTORY,
  NO_RECORD_EMAIL,
  PATIENT_ME,
  VALID_EMAIL,
  VALID_PASSWORD,
  PAST_COMPLETED,
  PAST_CANCELLED,
  CONSENTS,
  DOCTOR_FUENTES,
  SLOT_FUENTES,
} from "../fixtures";
import type { Appointment, ConsentRecord } from "@/shared/types/booking";
import { matchRedFlag } from "@/shared/state/redFlag";

export const handlers = [
  http.post("/api/auth/sign-in", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === NO_RECORD_EMAIL) {
      return HttpResponse.json({ userId: "no-record-user", hasRecord: false });
    }
    if (body.email === VALID_EMAIL && body.password === VALID_PASSWORD) {
      return HttpResponse.json({ userId: PATIENT_ME.id, hasRecord: true });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  http.post("/api/auth/claveunica", async () => {
    return HttpResponse.json({ userId: PATIENT_ME.id, hasRecord: true });
  }),

  http.get("/api/patients/me", () => HttpResponse.json(PATIENT_ME)),

  http.get("/api/patients/me/dependents", () => HttpResponse.json(DEPENDENTS)),

  http.post("/api/symptoms/extract", async ({ request }) => {
    const body = (await request.json()) as { text: string };
    const chips = extractSymptoms(body.text ?? "");
    const redFlag = matchRedFlag(body.text ?? "") !== null;
    return HttpResponse.json({ chips, redFlag });
  }),

  http.get("/api/patients/:id/medical-history", ({ params }) => {
    const id = String(params.id);
    const records = MEDICAL_HISTORY[id] ?? [];
    return HttpResponse.json({ records });
  }),

  // --- Final-batch endpoints ---
  http.get("/api/appointments", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let all: Appointment[] = [...mockAppointments];
    if (status) all = all.filter((a) => a.status === status);
    return HttpResponse.json({ appointments: all });
  }),

  http.get("/api/appointments/:reference", ({ params }) => {
    const ref = String(params.reference);
    const found = mockAppointments.find((a) => a.reference === ref);
    if (!found) {
      return HttpResponse.json(
        { title: "Not Found", status: 404, detail: "Appointment not found." },
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  http.post("/api/appointments", async ({ request }) => {
    const body = (await request.json()) as { careSubjectId?: string; mode?: string };
    const created: Appointment = {
      reference: "TM-NEW001",
      status: "confirmed",
      doctor: DOCTOR_FUENTES,
      slot: SLOT_FUENTES,
      mode: (body.mode as Appointment["mode"]) ?? "video",
      feeClp: DOCTOR_FUENTES.priceClp,
      createdAt: new Date().toISOString(),
    };
    mockAppointments.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/consents", () => HttpResponse.json({ consents: mockConsents })),

  http.patch("/api/consents/:id", async ({ params, request }) => {
    const id = String(params.id);
    const body = (await request.json()) as { granted: boolean };
    const rec = mockConsents.find((c) => c.id === id);
    if (!rec) {
      return HttpResponse.json(
        { title: "Not Found", status: 404, detail: "Consent not found." },
        { status: 404 },
      );
    }
    rec.granted = body.granted;
    return HttpResponse.json(rec);
  }),
];

// Stateful in-memory stores for the final-batch mocks (reset per test file via resetMockStores()).
let mockAppointments: Appointment[] = [{ ...PAST_COMPLETED }, { ...PAST_CANCELLED }];
let mockConsents: ConsentRecord[] = CONSENTS.map((c) => ({ ...c }));

export function resetMockStores() {
  mockAppointments = [{ ...PAST_COMPLETED }, { ...PAST_CANCELLED }];
  mockConsents = CONSENTS.map((c) => ({ ...c }));
}

// Named error-scenario handlers tests can swap in via server.use(...).
export const errorHandlers = {
  symptomsFail: http.post("/api/symptoms/extract", async () => {
    await delay(10);
    return new HttpResponse(null, { status: 500 });
  }),
  historyFail: http.get("/api/patients/:id/medical-history", async () => {
    await delay(10);
    return new HttpResponse(null, { status: 500 });
  }),
  historyEmpty: http.get("/api/patients/:id/medical-history", () =>
    HttpResponse.json({ records: [] }),
  ),
};
