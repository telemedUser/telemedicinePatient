-- Populate the richer doctor directory (P-07 cards + P-08 profile). Updates the 4 existing doctors
-- with the new fields and adds more so the directory reads like the prototype's "12 doctors".
-- Indian names, INR fees, video+audio modes. ASCII-only to avoid encoding issues.

UPDATE booking_doctor SET years_experience = 12, treats = 'sore throat, tonsillitis and respiratory infections',
    clinic = 'Connected Care Clinic', modes = 'video,audio', duration_min = 15, recommended = TRUE,
    in_network = TRUE, hours = 'Mon-Fri 09:00-13:00, 15:00-19:00; Sat 09:00-13:00',
    rating_breakdown = '78,16,4,1,1' WHERE id = 'doc-khanna';
UPDATE booking_doctor SET years_experience = 8, treats = 'flu and colds, headache and migraine',
    clinic = 'Connected Care Clinic', modes = 'video,audio', duration_min = 15, recommended = FALSE,
    in_network = TRUE, hours = 'Mon-Fri 10:00-18:00', rating_breakdown = '82,12,4,1,1' WHERE id = 'doc-nair';
UPDATE booking_doctor SET years_experience = 15, treats = 'skin rashes, acne and allergic reactions',
    clinic = 'Connected Care Clinic', modes = 'video,audio', duration_min = 15, recommended = FALSE,
    in_network = TRUE, hours = 'Mon-Fri 09:00-17:00', rating_breakdown = '85,11,2,1,1' WHERE id = 'doc-reddy';
UPDATE booking_doctor SET years_experience = 10, treats = 'children acute illness and preventive care',
    clinic = 'Connected Care Clinic', modes = 'video,audio', duration_min = 15, recommended = FALSE,
    in_network = TRUE, hours = 'Mon-Fri 09:00-15:00', rating_breakdown = '80,14,4,1,1' WHERE id = 'doc-iyer';

INSERT INTO booking_doctor
    (id, name, specialty, rating, reviews, next_availability, mode, price_clp, languages, bio,
     years_experience, treats, clinic, modes, duration_min, recommended, in_network, hours, rating_breakdown,
     created_at, version)
VALUES
    ('doc-menon', 'Dr. Arjun Menon', 'Internal Medicine', 4.7, 541, 'Today', 'video', 900,
     'en,hi,ml', 'Internist focused on chronic disease and complex presentations.',
     15, 'high blood pressure, diabetes and fatigue', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Mon-Fri 09:00-18:00', '79,15,4,1,1', NOW(), 0),
    ('doc-kaur', 'Dr. Simran Kaur', 'General Physician', 4.8, 263, 'Today', 'video', 750,
     'en,hi,pa', 'Family physician with a focus on women and preventive health.',
     9, 'fever, urinary infections and general check-ups', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Mon-Sat 08:00-14:00', '81,13,4,1,1', NOW(), 0),
    ('doc-pillai', 'Dr. Rajesh Pillai', 'ENT', 4.6, 174, 'Tomorrow', 'video', 1100,
     'en,ta', 'ENT specialist treating throat, ear and sinus conditions.',
     13, 'sore throat, ear pain and sinusitis', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Tue-Sat 10:00-17:00', '77,17,4,1,1', NOW(), 0),
    ('doc-bose', 'Dr. Ananya Bose', 'Dermatology', 4.9, 388, 'Today', 'video', 1300,
     'en,hi,bn', 'Dermatologist for skin, hair and allergy concerns.',
     11, 'eczema, acne and hair loss', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Mon-Fri 11:00-19:00', '86,10,2,1,1', NOW(), 0),
    ('doc-rao', 'Dr. Kiran Rao', 'Pediatrics', 4.7, 221, 'Today', 'video', 950,
     'en,hi,te', 'Paediatrician for infants and children.',
     14, 'fever, cough and childhood infections', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Mon-Sat 09:00-16:00', '80,15,3,1,1', NOW(), 0),
    ('doc-shah', 'Dr. Neha Shah', 'General Physician', 4.5, 142, 'Tomorrow', 'video', 700,
     'en,hi,gu', 'General physician for everyday acute care.',
     7, 'colds, allergies and minor injuries', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Mon-Fri 12:00-20:00', '74,18,5,2,1', NOW(), 0),
    ('doc-das', 'Dr. Ritu Das', 'Internal Medicine', 4.8, 309, 'Today', 'video', 1000,
     'en,hi,bn', 'Internist with interest in metabolic health.',
     16, 'diabetes, thyroid and blood pressure', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Mon-Fri 08:00-15:00', '83,12,3,1,1', NOW(), 0),
    ('doc-verma', 'Dr. Sameer Verma', 'General Physician', 4.6, 198, 'Today', 'video', 800,
     'en,hi', 'General physician for acute and follow-up care.',
     10, 'fever, body ache and fatigue', 'Connected Care Clinic', 'video,audio', 15, FALSE, TRUE,
     'Mon-Sat 10:00-18:00', '78,16,4,1,1', NOW(), 0)
ON CONFLICT (id) DO NOTHING;
