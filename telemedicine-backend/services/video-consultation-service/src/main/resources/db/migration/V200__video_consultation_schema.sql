-- Video consultation tables in the shared telemedicine database.
-- consultation_id is the appointment reference, linking a consultation to the
-- booking created by patient-booking-service.

CREATE TABLE IF NOT EXISTS consultation_patient_context (
    patient_id           VARCHAR(64)  PRIMARY KEY,
    consultation_id      VARCHAR(64),
    reason_for_visit     VARCHAR(2000),
    allergies_json       TEXT,
    conditions_json      TEXT,
    medications_json     TEXT,
    medical_history_json TEXT,
    symptoms_json        TEXT,
    quick_checks_json    TEXT,
    updated_at           TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultation_care_plan (
    consultation_id       VARCHAR(64) PRIMARY KEY,
    patient_id            VARCHAR(64),
    doctor_id             VARCHAR(64),
    diagnosis_json        TEXT,
    prescriptions_json    TEXT,
    diagnostic_tests_json TEXT,
    follow_up_json        TEXT,
    medical_leave_json    TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    updated_at            TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_plan_patient ON consultation_care_plan (patient_id);
CREATE INDEX IF NOT EXISTS idx_context_consultation ON consultation_patient_context (consultation_id);