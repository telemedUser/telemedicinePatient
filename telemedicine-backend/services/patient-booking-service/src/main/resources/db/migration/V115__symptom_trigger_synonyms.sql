-- Broaden P-04 symptom detection: patients often type a single bare word (e.g. "stomach") or a
-- colloquial phrase rather than the fuller phrase ("stomach ache") seeded in V112, so short inputs
-- matched nothing and the "Symptoms we picked up" panel never appeared.
--
-- Matching is a plain case-insensitive substring test (SymptomCatalog.mentioned), so triggers must
-- be long/distinctive enough not to collide inside unrelated words. We therefore add only phrases
-- that are safe as substrings (avoiding ultra-short tokens like "hot"/"head"/"cold"). No new
-- symptoms or related-links are needed; the V112 suggestion graph already covers these symptoms.

INSERT INTO symptom_trigger (symptom_id, phrase) VALUES
    -- Abdominal / stomach.
    ('sym-abdominal-pain','stomach'),('sym-abdominal-pain','stomachache'),
    ('sym-abdominal-pain','tummy ache'),('sym-abdominal-pain','tummy pain'),
    ('sym-abdominal-pain','abdomen'),('sym-abdominal-pain','stomach cramps'),('sym-abdominal-pain','gastric'),
    -- Nausea / vomiting colloquial.
    ('sym-nausea','throwing up'),('sym-nausea','throw up'),('sym-nausea','puking'),('sym-nausea','sick to my stomach'),
    -- Fever colloquial.
    ('sym-fever','high temperature'),('sym-fever','running a temperature'),('sym-fever','burning up'),
    -- Cough.
    ('sym-cough','dry cough'),('sym-cough','wet cough'),
    -- Cold / congestion.
    ('sym-runny-nose','common cold'),('sym-runny-nose','stuffy'),('sym-runny-nose','blocked nose'),
    -- Diarrhoea common spellings/phrases.
    ('sym-diarrhea','loose motions'),('sym-diarrhea','upset stomach'),('sym-diarrhea','runny stool'),
    -- Body ache colloquial.
    ('sym-body-ache','sore muscles'),('sym-body-ache','joint pain'),
    -- Fatigue colloquial.
    ('sym-fatigue','weakness'),('sym-fatigue','worn out'),
    -- Rash / itching.
    ('sym-rash','skin rash'),
    -- Shortness of breath colloquial.
    ('sym-shortness-breath','cant breathe'),('sym-shortness-breath','hard to breathe'),('sym-shortness-breath','out of breath');
