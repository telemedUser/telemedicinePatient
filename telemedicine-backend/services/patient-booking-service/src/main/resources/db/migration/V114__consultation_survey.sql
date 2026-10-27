-- Patient satisfaction survey (P-22, "How did it go?"). One row per appointment, keyed by the
-- booking reference. Stores the NPS score, the optional improvement chips and free-text comment,
-- the detractor call-back choice and the generated case reference. Captures the patient and doctor
-- so the data can be aggregated later (doctors see only aggregate scores, never who gave them).

CREATE TABLE IF NOT EXISTS consultation_survey (
    appointment_id       VARCHAR(128) PRIMARY KEY,   -- booking reference, e.g. TM-ABC123
    patient_id           VARCHAR(128),
    doctor_id            VARCHAR(128),
    score                INT          NOT NULL,       -- NPS 0..10
    improvements         TEXT,                        -- comma-separated chip labels
    comment              TEXT,
    callback_requested   BOOLEAN      NOT NULL DEFAULT FALSE,
    case_ref             VARCHAR(64),                 -- quality-team case reference, e.g. CX-4471
    submitted_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
