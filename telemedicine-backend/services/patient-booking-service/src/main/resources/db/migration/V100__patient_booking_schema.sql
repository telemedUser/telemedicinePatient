-- Patient booking service schema (PRD patient journey P-02 → P-37).
-- Doctors, appointments and consents are persisted so bookings survive restarts and can be
-- published to the physician worklist. All three tables use the shared BaseEntity shape: a string
-- `id` primary key plus auditing columns (created_at / updated_at / created_by / last_modified_by /
-- version). Slots are generated deterministically in code and are not stored.
--
-- Monetary columns keep the legacy name `*_clp` because the frontend reads those JSON keys; the
-- values are now INR and the API reports currency "INR".

CREATE TABLE IF NOT EXISTS booking_doctor (
    id                VARCHAR(128) PRIMARY KEY,
    name              VARCHAR(256) NOT NULL,
    specialty         VARCHAR(128) NOT NULL,
    rating            DOUBLE PRECISION NOT NULL DEFAULT 0,
    reviews           INT          NOT NULL DEFAULT 0,
    next_availability VARCHAR(64),
    mode              VARCHAR(32)  NOT NULL DEFAULT 'video',
    price_clp         INT          NOT NULL DEFAULT 0,
    languages         VARCHAR(256),                       -- comma-separated ISO codes
    bio               TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    created_by        VARCHAR(128),
    last_modified_by  VARCHAR(128),
    version           BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_booking_doctor_specialty ON booking_doctor (specialty);

CREATE TABLE IF NOT EXISTS booking_appointment (
    id               VARCHAR(128) PRIMARY KEY,            -- human reference, e.g. TM-ABC123
    status           VARCHAR(32)  NOT NULL DEFAULT 'confirmed',
    care_subject_id  VARCHAR(128),
    doctor_id        VARCHAR(128) NOT NULL,
    slot_id          VARCHAR(128) NOT NULL,
    slot_starts_at   VARCHAR(64)  NOT NULL,
    mode             VARCHAR(32)  NOT NULL DEFAULT 'video',
    reason           TEXT,
    fee_clp          INT,
    booked_at        VARCHAR(64)  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ,
    created_by       VARCHAR(128),
    last_modified_by VARCHAR(128),
    version          BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_booking_appointment_status ON booking_appointment (status);

CREATE TABLE IF NOT EXISTS booking_consent (
    id               VARCHAR(128) PRIMARY KEY,            -- stable slug, e.g. platform-tc
    label            VARCHAR(256) NOT NULL,
    description      TEXT,
    granted          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ,
    created_by       VARCHAR(128),
    last_modified_by VARCHAR(128),
    version          BIGINT       NOT NULL DEFAULT 0
);
