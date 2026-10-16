-- Booking records matching the physician worklist demo rows (TM-DEMO01..06), so the physician
-- "View details" screen shows the reason / doctor / slot / fee the patient submitted at booking.
-- The references and care-subject names mirror V104__demo_worklist_mix.sql in the physician service.
-- Idempotent via ON CONFLICT.

INSERT INTO booking_appointment
    (id, status, care_subject_id, doctor_id, slot_id, slot_starts_at, mode, reason, fee_clp, booked_at, created_at, version)
VALUES
    ('TM-DEMO01', 'completed', 'Aarav Sharma', 'doc-khanna', 'doc-khanna-s1',
     '2026-10-16T09:00:00Z', 'video', 'Fever and body ache for three days', 800,
     '2026-10-16T08:30:00Z', NOW(), 0),
    ('TM-DEMO02', 'confirmed', 'Priya Nair', 'doc-nair', 'doc-nair-s1',
     '2026-10-16T11:00:00Z', 'video', 'Follow-up on throat infection and persistent cough', 700,
     '2026-10-16T08:35:00Z', NOW(), 0),
    ('TM-DEMO03', 'confirmed', 'Vikram Reddy', 'doc-reddy', 'doc-reddy-s1',
     '2026-10-16T12:30:00Z', 'audio', 'Itchy skin rash spreading on both forearms', 1200,
     '2026-10-16T08:40:00Z', NOW(), 0),
    ('TM-DEMO04', 'confirmed', 'Meera Iyer', 'doc-iyer', 'doc-iyer-s1',
     '2026-10-16T14:00:00Z', 'video', 'Child has mild fever and reduced appetite', 1000,
     '2026-10-16T08:45:00Z', NOW(), 0),
    ('TM-DEMO05', 'confirmed', 'Rohan Verma', 'doc-khanna', 'doc-khanna-s2',
     '2026-10-16T15:00:00Z', 'video', 'Follow-up review of blood pressure medication', 800,
     '2026-10-16T08:50:00Z', NOW(), 0),
    ('TM-DEMO06', 'confirmed', 'Sanjay Gupta', 'doc-khanna', 'doc-khanna-s3',
     '2026-10-16T16:00:00Z', 'video', 'Chest pain and shortness of breath since this morning', 800,
     '2026-10-16T08:55:00Z', NOW(), 0)
ON CONFLICT (id) DO NOTHING;
