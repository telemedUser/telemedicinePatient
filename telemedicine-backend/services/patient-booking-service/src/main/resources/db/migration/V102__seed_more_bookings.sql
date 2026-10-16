-- Additional mock bookings so the patient "my appointments" view shows a mix of states
-- (an upcoming confirmed visit plus more history). Fixed references keep re-runs stable.
-- Idempotent via ON CONFLICT.

INSERT INTO booking_appointment
    (id, status, care_subject_id, doctor_id, slot_id, slot_starts_at, mode, reason, fee_clp, booked_at, created_at, version)
VALUES
    ('TM-UPC001', 'confirmed', 'patient-1', 'doc-nair', 'doc-nair-s1',
     '2026-10-18T11:00:00Z', 'video', 'Recurring sore throat and cough', 700,
     '2026-10-13T08:00:00Z', NOW(), 0),
    ('TM-UPC002', 'confirmed', 'dep-aarav', 'doc-iyer', 'doc-iyer-s1',
     '2026-10-19T15:00:00Z', 'video', 'Child routine check and rash', 1000,
     '2026-10-13T08:05:00Z', NOW(), 0),
    ('TM-PAST03', 'completed', 'patient-1', 'doc-reddy', 'seed-completed-slot-2',
     '2026-08-20T10:00:00Z', 'video', 'Acne follow-up', 1200,
     '2026-08-20T10:00:00Z', NOW(), 0)
ON CONFLICT (id) DO NOTHING;
