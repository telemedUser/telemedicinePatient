// In-memory data store for the patient-booking API.
// Mirrors the frontend MSW fixtures so behaviour is identical.

export const VALID_EMAIL = "valentina@example.cl";
export const VALID_PASSWORD = "correct-horse";
export const NO_RECORD_EMAIL = "norecord@example.cl";

export const PATIENT_ME = {
  id: "patient-1",
  name: "Valentina Rojas Mendoza",
  ageYears: 34,
};

export const DEPENDENTS = [
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

const SYMPTOM_LIBRARY = [
  { id: "sym-sore-throat", label: "Sore throat" },
  { id: "sym-fever", label: "Fever" },
  { id: "sym-cough", label: "Cough" },
  { id: "sym-headache", label: "Headache" },
  { id: "sym-fatigue", label: "Fatigue" },
];

const RED_FLAG_PHRASES = [
  "chest pain",
  "difficulty breathing",
  "trouble breathing",
  "shortness of breath",
  "severe bleeding",
  "fainting",
  "stroke",
  "suicidal",
];

export function extractSymptoms(text) {
  const t = (text || "").toLowerCase();
  const hits = SYMPTOM_LIBRARY.filter((s) =>
    t.includes(s.label.toLowerCase().split(" ")[0]),
  );
  return hits.length > 0 ? hits.slice(0, 15) : SYMPTOM_LIBRARY.slice(0, 2);
}

export function hasRedFlag(text) {
  const t = (text || "").toLowerCase();
  return RED_FLAG_PHRASES.some((p) => t.includes(p));
}

export const MEDICAL_HISTORY = {
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