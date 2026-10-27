-- Read model for the patient's post-consultation screen (P-19). Projected from the physician
-- service's ConsultationDocumentsIssued Kafka event, keyed by the appointment reference (the same
-- TM-... value the patient app holds). The rich document detail rides in a JSON text column; the
-- flat columns drive the "documents ready" checklist (prescription / medical leave / summary /
-- receipt) without parsing the JSON.

CREATE TABLE IF NOT EXISTS consultation_documents (
    appointment_id       VARCHAR(128) PRIMARY KEY,   -- booking reference, e.g. TM-ABC123
    status               VARCHAR(32)  NOT NULL DEFAULT 'ISSUED',
    document_count       INT          NOT NULL DEFAULT 0,
    has_prescription     BOOLEAN      NOT NULL DEFAULT FALSE,
    has_medical_leave    BOOLEAN      NOT NULL DEFAULT FALSE,
    has_summary          BOOLEAN      NOT NULL DEFAULT FALSE,
    prescription_number  VARCHAR(64),
    medical_leave_number VARCHAR(64),
    documents_json       TEXT,                        -- serialized care-plan document detail
    issued_at            TIMESTAMPTZ,
    received_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
