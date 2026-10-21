-- P-07 / P-08 richer doctor directory + P-13 patient name on the booking.
-- New doctor columns back the prototype's doctor cards and profile (years of experience, the
-- "Treats ..." line, clinic, offered modes video/audio, consultation duration, a "recommended"
-- flag, in-network flag, consultation hours and a rating breakdown). care_subject_name lets the
-- physician worklist show the real patient name.

ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS years_experience INT NOT NULL DEFAULT 0;
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS treats TEXT;
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS clinic VARCHAR(256);
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS modes VARCHAR(64) DEFAULT 'video,audio';
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS duration_min INT NOT NULL DEFAULT 15;
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS recommended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS in_network BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS hours VARCHAR(256);
ALTER TABLE booking_doctor ADD COLUMN IF NOT EXISTS rating_breakdown VARCHAR(64);

ALTER TABLE booking_appointment ADD COLUMN IF NOT EXISTS care_subject_name VARCHAR(256);
