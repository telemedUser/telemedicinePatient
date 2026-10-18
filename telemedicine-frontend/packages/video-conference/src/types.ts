// Shared types for the video-conference library (ported from CareConnect).

export type CallRole = "doctor" | "patient";

export interface Allergy { name: string; reaction?: string; }
export interface SymptomItem { name: string; duration?: string; severity?: string; }
export interface QuickCheck { question: string; answer: string; }

export interface PatientContext {
  consultationId?: string;
  reasonForVisit?: string;
  allergies?: Allergy[];
  conditions?: string[];
  medications?: string[];
  medicalHistory?: string[];
  symptoms?: SymptomItem[];
  quickChecks?: QuickCheck[];
}

export interface DiagnosisItem { code?: string; name?: string; notes?: string; }
export interface PrescriptionItem {
  medicationName?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string;
}
export interface FollowUp { enabled: boolean; date?: string | null; instructions?: string; }
export interface MedicalLeave { enabled: boolean; startDate?: string | null; endDate?: string | null; reason?: string; }

export interface CarePlan {
  consultationId: string;
  patientId: string;
  doctorId?: string;
  diagnosis: DiagnosisItem[];
  prescriptions: PrescriptionItem[];
  diagnosticTests: string[];
  followUp: FollowUp;
  medicalLeave: MedicalLeave;
  status: "DRAFT" | "FINALIZED";
  aiAssistantEnabled?: boolean;
}

/** Runtime configuration for the CareConnect backend (REST + WebSocket signaling). */
export interface VideoConfig {
  /** Base URL of the CareConnect backend, e.g. http://localhost:8130 */
  apiBase: string;
  /** WebSocket signaling URL, e.g. ws://localhost:8130/ws */
  wsUrl: string;
}