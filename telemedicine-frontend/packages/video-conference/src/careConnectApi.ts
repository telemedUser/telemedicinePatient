import type { CarePlan, PatientContext, VideoConfig } from "./types";

async function request<T>(apiBase: string, path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** REST client for the CareConnect backend (patient context + care plan). */
export function createCareConnectApi(config: VideoConfig) {
  const { apiBase } = config;
  return {
    getContext: (patientId: string) =>
      request<PatientContext>(apiBase, `/api/patients/${encodeURIComponent(patientId)}/context`),
    putContext: (patientId: string, context: PatientContext) =>
      request<PatientContext>(apiBase, `/api/patients/${encodeURIComponent(patientId)}/context`, {
        method: "POST",
        body: JSON.stringify(context),
      }),
    getCarePlan: (consultationId: string) =>
      request<CarePlan>(apiBase, `/api/consultations/${encodeURIComponent(consultationId)}/care-plan`),
    saveCarePlan: (consultationId: string, plan: CarePlan) =>
      request<CarePlan>(apiBase, `/api/consultations/${encodeURIComponent(consultationId)}/care-plan`, {
        method: "PUT",
        body: JSON.stringify(plan),
      }),
    finalizeCarePlan: (consultationId: string) =>
      request<CarePlan>(apiBase, `/api/consultations/${encodeURIComponent(consultationId)}/care-plan/finalize`, {
        method: "POST",
      }),
  };
}

export type CareConnectApi = ReturnType<typeof createCareConnectApi>;