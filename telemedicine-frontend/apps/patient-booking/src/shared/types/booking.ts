export type WizardStep =
  | "P-01"
  | "P-02"
  | "P-03"
  | "P-04"
  | "P-05"
  | "P-06"
  | "P-07"
  | "P-08"
  | "P-09"
  | "P-10"
  | "P-11"
  | "P-12";

export const WIZARD_ORDER: readonly WizardStep[] = [
  "P-01",
  "P-02",
  "P-03",
  "P-04",
  "P-05",
  "P-06",
  "P-07",
  "P-08",
  "P-09",
  "P-10",
  "P-11",
  "P-12",
] as const;

export const STEP_PATHS: Record<WizardStep, string> = {
  "P-01": "front-door",
  "P-02": "sign-in",
  "P-03": "who-needs-care",
  "P-04": "reason",
  "P-05": "medical-history",
  "P-06": "triage",
  "P-07": "doctors",
  "P-08": "doctor",
  "P-09": "cover",
  "P-10": "review",
  "P-11": "payment",
  "P-12": "confirmed",
};

export type Relationship =
  | "self"
  | "parent"
  | "guardian"
  | "spouse"
  | "caregiver";

export interface Dependent {
  id: string;
  name: string;
  ageYears: number;
  relationship: Exclude<Relationship, "self">;
  eligible: boolean;
}

export interface CareSubject {
  kind: "self" | "dependent";
  id: string;
  name: string;
  ageYears: number;
  relationship: Relationship;
}

export interface SymptomChip {
  id: string;
  label: string;
}

export type DurationValue =
  | "under-24h"
  | "1-3-days"
  | "4-7-days"
  | "1-2-weeks"
  | "over-2-weeks";

export type SeverityWord = "Mild" | "Moderate" | "Severe" | "Worst possible";

export type ScanStatus = "pending" | "scanning" | "clean" | "rejected";
export type FileCategory = "photo" | "lab-report" | "prescription" | "other";

export type AllowedMime =
  | "image/jpeg"
  | "image/png"
  | "image/heic"
  | "application/pdf";

export interface UploadedFile {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
  category: FileCategory;
  scanStatus: ScanStatus;
}

export interface Measurements {
  weightKg?: number;
  heightCm?: number;
}

export interface MedicalHistoryRecord {
  id: string;
  label: string;
  detail: string;
  shared: boolean;
  correction?: string;
}

export interface AuthStateSnapshot {
  status: "authenticated" | "unauthenticated";
  userId: string | null;
}

export type HistoryStatus = "idle" | "loading" | "loaded" | "empty" | "error";

export type ConsultationMode = "video" | "audio";

export interface TriageQuestion {
  id: string;
  text: string;
  number: number;
  total: number;
}

export interface TriageAnswerRow {
  q: string;
  a: string;
}

export interface TriageResult {
  recommendedSpecialty: string;
  videoRecommended: boolean;
  noEmergencySigns: boolean;
  urgency?: string;
  /** One short patient-facing sentence from the AI triage. */
  rationale?: string;
  answers: TriageAnswerRow[];
}

export type TriagePhase = "disclosure" | "question" | "result" | "skipped";

export interface TriageState {
  phase: TriagePhase;
  sessionId: string | null;
  question: TriageQuestion | null;
  result: TriageResult | null;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews?: number;
  nextAvailability: string;
  mode: ConsultationMode;
  priceClp: number;
  languages?: string[];
  bio?: string;
  yearsExperience?: number;
  treats?: string;
  clinic?: string;
  modes?: ConsultationMode[];
  durationMin?: number;
  recommended?: boolean;
  inNetwork?: boolean;
  hours?: string;
  ratingBreakdown?: number[];
}

export interface Slot {
  id: string;
  startsAt: string;
  mode: ConsultationMode;
}

export interface CoverQuote {
  feeClp: number;
  currency: string;
  note: string;
  consultationFee?: number;
  voucher?: number;
  voucherRef?: string;
  total?: number;
}

export type AppointmentStatus = "confirmed" | "cancelled" | "completed";

export interface AuthorityAttestation {
  granted: boolean;
  dependentName: string;
  relationship: string;
}

export interface ConsentRecord {
  id: string;
  label: string;
  description: string;
  granted: boolean;
}

export interface Appointment {
  reference: string;
  status: AppointmentStatus;
  doctor: Doctor;
  slot: Slot;
  mode: ConsultationMode;
  feeClp: number;
  /** The visit reason captured at booking (P-04), echoed by GET /appointments/{ref}. */
  reason?: string;
  createdAt?: string;
}

export interface BookingState {
  currentStep: WizardStep;
  furthestStep: WizardStep;
  auth: AuthStateSnapshot;
  careSubject: CareSubject | null;
  symptomText: string;
  selectedSymptoms: SymptomChip[];
  availableSymptoms: SymptomChip[];
  duration: DurationValue | null;
  severity: number;
  files: UploadedFile[];
  measurements: Measurements;
  history: {
    status: HistoryStatus;
    records: MedicalHistoryRecord[];
    addMissing: string;
    confirmed: boolean;
  };
  triage: TriageState;
  specialtyFilter: string;
  selectedDoctor: Doctor | null;
  selectedSlot: Slot | null;
  selectedMode: ConsultationMode;
  coverQuote: CoverQuote | null;
  appointmentRef: string | null;
  authorityAttestation: AuthorityAttestation | null;
}

export function createInitialBookingState(): BookingState {
  return {
    currentStep: "P-01",
    furthestStep: "P-01",
    auth: { status: "unauthenticated", userId: null },
    careSubject: null,
    symptomText: "",
    selectedSymptoms: [],
    availableSymptoms: [],
    duration: "1-3-days",
    severity: 0,
    files: [],
    measurements: {},
    history: { status: "idle", records: [], addMissing: "", confirmed: false },
    triage: { phase: "disclosure", sessionId: null, question: null, result: null },
    specialtyFilter: "all",
    selectedDoctor: null,
    selectedSlot: null,
    selectedMode: "video",
    coverQuote: null,
    appointmentRef: null,
    authorityAttestation: null,
  };
}
