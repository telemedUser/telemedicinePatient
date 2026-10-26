-- Symptom directory for P-04 ("What brings you in today?"), moved out of the hardcoded
-- SymptomCatalog.java into the database. Four tables:
--   symptom_catalog        one row per symptom (id, label, display order)
--   symptom_trigger        synonym phrases the free text is matched against (many per symptom)
--   symptom_related        "also have any of these?" links (symptom_id -> related_symptom_id)
--   symptom_phrase         red-flag phrases and negation cues (kind = RED_FLAG | NEGATION)
-- The service loads these at startup; matching/negation logic stays in code.

CREATE TABLE IF NOT EXISTS symptom_catalog (
    id            VARCHAR(64) PRIMARY KEY,
    label         VARCHAR(128) NOT NULL,
    display_order INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS symptom_trigger (
    id         BIGSERIAL PRIMARY KEY,
    symptom_id VARCHAR(64) NOT NULL REFERENCES symptom_catalog (id) ON DELETE CASCADE,
    phrase     VARCHAR(128) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_symptom_trigger_symptom ON symptom_trigger (symptom_id);

CREATE TABLE IF NOT EXISTS symptom_related (
    seq                BIGSERIAL,
    symptom_id         VARCHAR(64) NOT NULL REFERENCES symptom_catalog (id) ON DELETE CASCADE,
    related_symptom_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (symptom_id, related_symptom_id)
);

CREATE TABLE IF NOT EXISTS symptom_phrase (
    id     BIGSERIAL PRIMARY KEY,
    kind   VARCHAR(16)  NOT NULL,   -- RED_FLAG | NEGATION
    phrase VARCHAR(128) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_symptom_phrase_kind ON symptom_phrase (kind);

-- ---------------------------------------------------------------------------
-- Seed data (ported verbatim from the former in-code catalog). Order preserved.
-- ---------------------------------------------------------------------------

INSERT INTO symptom_catalog (id, label, display_order) VALUES
    ('sym-sore-throat',        'Sore throat',          1),
    ('sym-painful-swallowing', 'Painful swallowing',   2),
    ('sym-fever',              'Fever',                3),
    ('sym-cough',              'Cough',                4),
    ('sym-headache',           'Headache',             5),
    ('sym-fatigue',            'Fatigue',              6),
    ('sym-runny-nose',         'Runny nose',           7),
    ('sym-nausea',             'Nausea',               8),
    ('sym-abdominal-pain',     'Abdominal pain',       9),
    ('sym-diarrhea',           'Diarrhoea',           10),
    ('sym-rash',               'Skin rash',           11),
    ('sym-itching',            'Itching',             12),
    ('sym-body-ache',          'Body ache',           13),
    ('sym-swollen-glands',     'Swollen glands',      14),
    ('sym-hoarse-voice',       'Hoarse voice',        15),
    ('sym-chills',             'Chills',              16),
    ('sym-sweats',             'Sweats',              17),
    ('sym-light-sensitivity',  'Light sensitivity',   18),
    ('sym-sneezing',           'Sneezing',            19),
    ('sym-chest-congestion',   'Chest congestion',    20),
    ('sym-shortness-breath',   'Shortness of breath', 21)
ON CONFLICT (id) DO NOTHING;

INSERT INTO symptom_trigger (symptom_id, phrase) VALUES
    ('sym-sore-throat','sore throat'),('sym-sore-throat','throat pain'),('sym-sore-throat','throat hurts'),('sym-sore-throat','scratchy throat'),
    ('sym-painful-swallowing','painful to swallow'),('sym-painful-swallowing','painful swallowing'),('sym-painful-swallowing','hurts to swallow'),('sym-painful-swallowing','difficulty swallowing'),
    ('sym-fever','fever'),('sym-fever','temperature'),('sym-fever','febrile'),('sym-fever','high temp'),('sym-fever','38'),('sym-fever','39'),('sym-fever','40'),
    ('sym-cough','cough'),('sym-cough','coughing'),
    ('sym-headache','headache'),('sym-headache','head ache'),('sym-headache','migraine'),('sym-headache','head hurts'),
    ('sym-fatigue','fatigue'),('sym-fatigue','tired'),('sym-fatigue','tiredness'),('sym-fatigue','exhausted'),('sym-fatigue','no energy'),('sym-fatigue','lethargic'),
    ('sym-runny-nose','runny nose'),('sym-runny-nose','running nose'),('sym-runny-nose','nasal'),('sym-runny-nose','congestion'),('sym-runny-nose','stuffy nose'),('sym-runny-nose','blocked nose'),
    ('sym-nausea','nausea'),('sym-nausea','nauseous'),('sym-nausea','queasy'),('sym-nausea','feel sick'),('sym-nausea','vomit'),('sym-nausea','vomiting'),
    ('sym-abdominal-pain','abdominal pain'),('sym-abdominal-pain','stomach ache'),('sym-abdominal-pain','stomach pain'),('sym-abdominal-pain','belly pain'),('sym-abdominal-pain','tummy'),
    ('sym-diarrhea','diarrhea'),('sym-diarrhea','diarrhoea'),('sym-diarrhea','loose stool'),('sym-diarrhea','loose motion'),
    ('sym-rash','rash'),('sym-rash','itchy skin'),('sym-rash','hives'),('sym-rash','skin irritation'),('sym-rash','red spots'),
    ('sym-itching','itching'),('sym-itching','itchy'),('sym-itching','pruritus'),
    ('sym-body-ache','body ache'),('sym-body-ache','body pain'),('sym-body-ache','muscle ache'),('sym-body-ache','aches and pains'),('sym-body-ache','myalgia'),
    ('sym-swollen-glands','swollen glands'),('sym-swollen-glands','swollen lymph'),('sym-swollen-glands','lump in neck'),
    ('sym-hoarse-voice','hoarse'),('sym-hoarse-voice','hoarse voice'),('sym-hoarse-voice','lost voice'),('sym-hoarse-voice','raspy'),
    ('sym-chills','chills'),('sym-chills','shivering'),('sym-chills','rigors'),
    ('sym-sweats','sweats'),('sym-sweats','sweating'),('sym-sweats','night sweats'),
    ('sym-light-sensitivity','light sensitivity'),('sym-light-sensitivity','sensitive to light'),('sym-light-sensitivity','photophobia'),
    ('sym-sneezing','sneezing'),('sym-sneezing','sneeze'),
    ('sym-chest-congestion','chest congestion'),('sym-chest-congestion','phlegm'),('sym-chest-congestion','mucus'),('sym-chest-congestion','chesty'),
    ('sym-shortness-breath','shortness of breath'),('sym-shortness-breath','short of breath'),('sym-shortness-breath','breathless'),('sym-shortness-breath','wheezing');

INSERT INTO symptom_related (symptom_id, related_symptom_id) VALUES
    ('sym-sore-throat','sym-painful-swallowing'),('sym-sore-throat','sym-swollen-glands'),('sym-sore-throat','sym-hoarse-voice'),('sym-sore-throat','sym-fever'),
    ('sym-painful-swallowing','sym-sore-throat'),('sym-painful-swallowing','sym-swollen-glands'),
    ('sym-fever','sym-chills'),('sym-fever','sym-sweats'),('sym-fever','sym-headache'),('sym-fever','sym-fatigue'),
    ('sym-cough','sym-sore-throat'),('sym-cough','sym-chest-congestion'),('sym-cough','sym-shortness-breath'),('sym-cough','sym-runny-nose'),
    ('sym-headache','sym-light-sensitivity'),('sym-headache','sym-nausea'),('sym-headache','sym-fever'),('sym-headache','sym-fatigue'),
    ('sym-fatigue','sym-fever'),('sym-fatigue','sym-body-ache'),('sym-fatigue','sym-headache'),
    ('sym-runny-nose','sym-cough'),('sym-runny-nose','sym-sneezing'),('sym-runny-nose','sym-sore-throat'),
    ('sym-nausea','sym-abdominal-pain'),('sym-nausea','sym-headache'),('sym-nausea','sym-fever'),
    ('sym-abdominal-pain','sym-nausea'),('sym-abdominal-pain','sym-diarrhea'),('sym-abdominal-pain','sym-fever'),
    ('sym-diarrhea','sym-abdominal-pain'),('sym-diarrhea','sym-nausea'),('sym-diarrhea','sym-fever'),
    ('sym-rash','sym-itching'),('sym-rash','sym-fever'),
    ('sym-itching','sym-rash'),
    ('sym-body-ache','sym-fever'),('sym-body-ache','sym-fatigue'),('sym-body-ache','sym-chills'),
    ('sym-swollen-glands','sym-sore-throat'),('sym-swollen-glands','sym-fever'),
    ('sym-hoarse-voice','sym-sore-throat'),('sym-hoarse-voice','sym-cough'),
    ('sym-chills','sym-fever'),('sym-chills','sym-sweats'),
    ('sym-sweats','sym-fever'),('sym-sweats','sym-chills'),
    ('sym-light-sensitivity','sym-headache'),
    ('sym-sneezing','sym-runny-nose'),
    ('sym-chest-congestion','sym-cough'),('sym-chest-congestion','sym-shortness-breath'),
    ('sym-shortness-breath','sym-cough'),('sym-shortness-breath','sym-chest-congestion')
ON CONFLICT (symptom_id, related_symptom_id) DO NOTHING;

INSERT INTO symptom_phrase (kind, phrase) VALUES
    ('RED_FLAG','chest pain'),('RED_FLAG','difficulty breathing'),('RED_FLAG','trouble breathing'),
    ('RED_FLAG','shortness of breath'),('RED_FLAG','severe bleeding'),('RED_FLAG','fainting'),
    ('RED_FLAG','faint'),('RED_FLAG','stroke'),('RED_FLAG','suicidal'),
    ('RED_FLAG','numbness on one side'),('RED_FLAG','slurred speech'),
    ('NEGATION','no '),('NEGATION','not '),('NEGATION','without '),('NEGATION','denies '),
    ('NEGATION','deny '),('NEGATION','negative for '),('NEGATION','no sign of ');
