import type {
  Dependent,
  MedicalHistoryRecord,
  SymptomChip,
} from "@/shared/types/booking";

export const VALID_EMAIL = "valentina@example.cl";
export const VALID_PASSWORD = "correct-horse";
export const NO_RECORD_EMAIL = "norecord@example.cl";

export const PATIENT_ME = {
  id: "patient-1",
  name: "Valentina Rojas Mendoza",
  ageYears: 34,
};

export const DEPENDENTS: Dependent[] = [
  {
    id: "dep-emilia",
    name: "Emilia Vergara Rojas",
    ageYears: 7,
    relationship: "parent",
    eligible: true,
  },
  {
    id: "dep-ineligible",
    name: "Tomás Rojas (sin cobertura)",
    ageYears: 12,
    relationship: "parent",
    eligible: false,
  },
];

const SYMPTOM_LIBRARY: SymptomChip[] = [
  { id: "sym-sore-throat", label: "Sore throat" },
  { id: "sym-fever", label: "Fever" },
  { id: "sym-cough", label: "Cough" },
  { id: "sym-headache", label: "Headache" },
  { id: "sym-fatigue", label: "Fatigue" },
];

export function extractSymptoms(text: string): SymptomChip[] {
  const t = text.toLowerCase();
  const hits = SYMPTOM_LIBRARY.filter((s) =>
    t.includes(s.label.toLowerCase().split(" ")[0]),
  );
  // Always return at least a couple of candidates so the UI has chips to show.
  return hits.length > 0 ? hits.slice(0, 15) : SYMPTOM_LIBRARY.slice(0, 2);
}

export const MEDICAL_HISTORY: Record<string, MedicalHistoryRecord[]> = {
  "patient-1": [
    {
      id: "mh-1",
      label: "Asma leve",
      detail: "Diagnosticada en 2015; inhalador de rescate según necesidad.",
      shared: true,
    },
    {
      id: "mh-2",
      label: "Alergia a la penicilina",
      detail: "Reacción cutánea registrada en 2018.",
      shared: true,
    },
  ],
  "dep-emilia": [
    {
      id: "mh-e1",
      label: "Dermatitis atópica",
      detail: "Controlada con crema hidratante.",
      shared: true,
    },
  ],
  "dep-ineligible": [],
};

// --- Final-batch fixtures (doctors, slots, appointments, consents) ---
import type { Doctor, Slot, Appointment, ConsentRecord } from "@/shared/types/booking";

export const DOCTOR_FUENTES: Doctor = {
  id: "doc-fuentes",
  name: "Dr. Andres Fuentes Silva",
  specialty: "General Physician",
  rating: 4.8,
  reviews: 212,
  nextAvailability: "Today",
  mode: "video",
  priceClp: 18000,
  languages: ["es", "en"],
  bio: "General physician with 12 years of experience in primary and acute care.",
};

export const DOCTOR_RIVAS: Doctor = {
  id: "doc-rivas",
  name: "Dr. Felipe Rivas Castro",
  specialty: "Dermatology",
  rating: 4.9,
  reviews: 301,
  nextAvailability: "Today",
  mode: "video",
  priceClp: 25000,
  languages: ["es", "en"],
  bio: "Dermatologist specialising in skin lesions, acne and allergic reactions.",
};

export const SLOT_FUENTES: Slot = {
  id: "doc-fuentes-s1",
  startsAt: "2026-10-20T09:00:00Z",
  mode: "video",
};

export const PAST_COMPLETED: Appointment = {
  reference: "TM-PAST01",
  status: "completed",
  doctor: DOCTOR_FUENTES,
  slot: { id: "seed-completed-slot", startsAt: "2026-09-30T09:00:00Z", mode: "video" },
  mode: "video",
  feeClp: 18000,
  createdAt: "2026-09-30T09:00:00Z",
};

export const PAST_CANCELLED: Appointment = {
  reference: "TM-PAST02",
  status: "cancelled",
  doctor: DOCTOR_RIVAS,
  slot: { id: "seed-cancelled-slot", startsAt: "2026-09-14T09:00:00Z", mode: "video" },
  mode: "video",
  feeClp: 25000,
  createdAt: "2026-09-14T09:00:00Z",
};

export const CONSENTS: ConsentRecord[] = [
  { id: "platform-tc", label: "Platform terms & conditions", description: "Required to use the telemedicine service.", granted: true },
  { id: "clinical-informed", label: "Clinical informed consent", description: "You agree to receive care via video consultation.", granted: true },
  { id: "data-sharing", label: "Share data for this episode", description: "Share your symptoms and history with the treating doctor.", granted: true },
];