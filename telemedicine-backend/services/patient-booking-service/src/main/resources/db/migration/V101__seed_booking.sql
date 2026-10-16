-- Seed the patient booking directory with Indian doctors, the consent centre and two past
-- appointments (one completed, one cancelled) so the "past appointments" view has data without a
-- live booking. Idempotent via ON CONFLICT so re-running against an existing DB is harmless.

INSERT INTO booking_doctor
    (id, name, specialty, rating, reviews, next_availability, mode, price_clp, languages, bio, created_at, version)
VALUES
    ('doc-khanna', 'Dr. Arjun Khanna', 'General Physician', 4.8, 212, 'Today', 'video', 800,
     'en,hi', 'General physician with 12 years of experience in primary and acute care.', NOW(), 0),
    ('doc-nair', 'Dr. Meera Nair', 'General Physician', 4.6, 158, 'Tomorrow', 'video', 700,
     'en,hi,ml', 'Family medicine specialist focused on respiratory and ENT conditions.', NOW(), 0),
    ('doc-reddy', 'Dr. Vikram Reddy', 'Dermatology', 4.9, 301, 'Today', 'video', 1200,
     'en,hi,te', 'Dermatologist specialising in skin lesions, acne and allergic reactions.', NOW(), 0),
    ('doc-iyer', 'Dr. Lakshmi Iyer', 'Pediatrics', 4.7, 189, 'Today', 'video', 1000,
     'en,hi,ta', 'Pediatrician focused on children''s acute illness and preventive care.', NOW(), 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_consent (id, label, description, granted, created_at, version)
VALUES
    ('platform-tc', 'Platform terms & conditions',
     'Required to use the telemedicine service.', TRUE, NOW(), 0),
    ('clinical-informed', 'Clinical informed consent',
     'You agree to receive care via video consultation.', TRUE, NOW(), 0),
    ('data-sharing', 'Share data for this episode',
     'Share your symptoms and history with the treating doctor.', TRUE, NOW(), 0)
ON CONFLICT (id) DO NOTHING;

-- Two seeded past appointments (fixed references so re-runs are stable).
INSERT INTO booking_appointment
    (id, status, care_subject_id, doctor_id, slot_id, slot_starts_at, mode, reason, fee_clp, booked_at, created_at, version)
VALUES
    ('TM-PAST01', 'completed', 'patient-1', 'doc-khanna', 'seed-completed-slot',
     '2026-09-29T09:00:00Z', 'video', 'Follow-up on asthma symptoms', 800, '2026-09-29T09:00:00Z', NOW(), 0),
    ('TM-PAST02', 'cancelled', 'patient-1', 'doc-reddy', 'seed-cancelled-slot',
     '2026-09-13T09:00:00Z', 'video', 'Skin rash review', 1200, '2026-09-13T09:00:00Z', NOW(), 0)
ON CONFLICT (id) DO NOTHING;
