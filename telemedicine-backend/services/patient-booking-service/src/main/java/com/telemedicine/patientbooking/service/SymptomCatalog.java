package com.telemedicine.patientbooking.service;

import com.telemedicine.patientbooking.domain.SymptomChip;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Symptom directory for P-04 ("What brings you in today?"). Each entry carries trigger phrases
 * (synonyms the free-text is matched against) and a set of <em>related</em> symptom ids that power
 * the "Also have any of these?" suggestions. Extraction is negation-aware: a phrase preceded by a
 * negation cue ("no", "without", "denies", "not") within a short window is NOT picked up, so
 * "No cough" does not add Cough.
 *
 * <p>This is deliberately a curated in-code catalog (not a DB table) — it is static reference data
 * read on every extract call, mirroring how the rest of {@link PatientReferenceData} is held.
 */
@Component
public class SymptomCatalog {

    /** One symptom in the directory. */
    public record Symptom(String id, String label, List<String> triggers, List<String> related) {}

    private static final List<String> NEGATIONS =
            List.of("no ", "not ", "without ", "denies ", "deny ", "negative for ", "no sign of ");

    /** Red-flag phrases that raise the emergency interrupt (kept here so P-04 has one source). */
    public static final List<String> RED_FLAGS =
            List.of(
                    "chest pain",
                    "difficulty breathing",
                    "trouble breathing",
                    "shortness of breath",
                    "severe bleeding",
                    "fainting",
                    "faint",
                    "stroke",
                    "suicidal",
                    "numbness on one side",
                    "slurred speech");

    // Catalog. Order matters only for stable display. Related ids must exist in this map.
    private final Map<String, Symptom> byId = new LinkedHashMap<>();

    public SymptomCatalog() {
        add("sym-sore-throat", "Sore throat",
                List.of("sore throat", "throat pain", "throat hurts", "scratchy throat"),
                List.of("sym-painful-swallowing", "sym-swollen-glands", "sym-hoarse-voice", "sym-fever"));
        add("sym-painful-swallowing", "Painful swallowing",
                List.of("painful to swallow", "painful swallowing", "hurts to swallow", "difficulty swallowing"),
                List.of("sym-sore-throat", "sym-swollen-glands"));
        add("sym-fever", "Fever",
                List.of("fever", "temperature", "febrile", "high temp", "38", "39", "40"),
                List.of("sym-chills", "sym-sweats", "sym-headache", "sym-fatigue"));
        add("sym-cough", "Cough",
                List.of("cough", "coughing"),
                List.of("sym-sore-throat", "sym-chest-congestion", "sym-shortness-breath", "sym-runny-nose"));
        add("sym-headache", "Headache",
                List.of("headache", "head ache", "migraine", "head hurts"),
                List.of("sym-light-sensitivity", "sym-nausea", "sym-fever", "sym-fatigue"));
        add("sym-fatigue", "Fatigue",
                List.of("fatigue", "tired", "tiredness", "exhausted", "no energy", "lethargic"),
                List.of("sym-fever", "sym-body-ache", "sym-headache"));
        add("sym-runny-nose", "Runny nose",
                List.of("runny nose", "running nose", "nasal", "congestion", "stuffy nose", "blocked nose"),
                List.of("sym-cough", "sym-sneezing", "sym-sore-throat"));
        add("sym-nausea", "Nausea",
                List.of("nausea", "nauseous", "queasy", "feel sick", "vomit", "vomiting"),
                List.of("sym-abdominal-pain", "sym-headache", "sym-fever"));
        add("sym-abdominal-pain", "Abdominal pain",
                List.of("abdominal pain", "stomach ache", "stomach pain", "belly pain", "tummy"),
                List.of("sym-nausea", "sym-diarrhea", "sym-fever"));
        add("sym-diarrhea", "Diarrhoea",
                List.of("diarrhea", "diarrhoea", "loose stool", "loose motion"),
                List.of("sym-abdominal-pain", "sym-nausea", "sym-fever"));
        add("sym-rash", "Skin rash",
                List.of("rash", "itchy skin", "hives", "skin irritation", "red spots"),
                List.of("sym-itching", "sym-fever"));
        add("sym-itching", "Itching",
                List.of("itching", "itchy", "pruritus"),
                List.of("sym-rash"));
        add("sym-body-ache", "Body ache",
                List.of("body ache", "body pain", "muscle ache", "aches and pains", "myalgia"),
                List.of("sym-fever", "sym-fatigue", "sym-chills"));

        // Secondary / "also have any of these" symptoms (less commonly typed, often suggested).
        add("sym-swollen-glands", "Swollen glands",
                List.of("swollen glands", "swollen lymph", "lump in neck"),
                List.of("sym-sore-throat", "sym-fever"));
        add("sym-hoarse-voice", "Hoarse voice",
                List.of("hoarse", "hoarse voice", "lost voice", "raspy"),
                List.of("sym-sore-throat", "sym-cough"));
        add("sym-chills", "Chills",
                List.of("chills", "shivering", "rigors"),
                List.of("sym-fever", "sym-sweats"));
        add("sym-sweats", "Sweats",
                List.of("sweats", "sweating", "night sweats"),
                List.of("sym-fever", "sym-chills"));
        add("sym-light-sensitivity", "Light sensitivity",
                List.of("light sensitivity", "sensitive to light", "photophobia"),
                List.of("sym-headache"));
        add("sym-sneezing", "Sneezing",
                List.of("sneezing", "sneeze"),
                List.of("sym-runny-nose"));
        add("sym-chest-congestion", "Chest congestion",
                List.of("chest congestion", "phlegm", "mucus", "chesty"),
                List.of("sym-cough", "sym-shortness-breath"));
        add("sym-shortness-breath", "Shortness of breath",
                List.of("shortness of breath", "short of breath", "breathless", "wheezing"),
                List.of("sym-cough", "sym-chest-congestion"));
    }

    private void add(String id, String label, List<String> triggers, List<String> related) {
        byId.put(id, new Symptom(id, label, triggers, related));
    }

    public SymptomChip chip(String id) {
        Symptom s = byId.get(id);
        return s == null ? null : new SymptomChip(s.id(), s.label());
    }

    /**
     * Auto-pick the symptoms present in the text (negation-aware), capped at 15 and in catalog
     * order so the result is stable.
     */
    public List<SymptomChip> pickUp(String text) {
        String t = normalize(text);
        List<SymptomChip> picked = new ArrayList<>();
        for (Symptom s : byId.values()) {
            if (mentioned(t, s)) {
                picked.add(new SymptomChip(s.id(), s.label()));
                if (picked.size() >= 15) {
                    break;
                }
            }
        }
        return picked;
    }

    /**
     * "Also have any of these?": the union of related symptoms for everything picked up, minus the
     * ones already picked up, capped at 8 for a tidy row.
     */
    public List<SymptomChip> related(List<SymptomChip> pickedUp) {
        Set<String> pickedIds = new LinkedHashSet<>();
        for (SymptomChip c : pickedUp) {
            pickedIds.add(c.id());
        }
        List<SymptomChip> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (SymptomChip c : pickedUp) {
            Symptom s = byId.get(c.id());
            if (s == null) {
                continue;
            }
            for (String relId : s.related()) {
                if (!pickedIds.contains(relId) && seen.add(relId)) {
                    Symptom rel = byId.get(relId);
                    if (rel != null) {
                        out.add(new SymptomChip(rel.id(), rel.label()));
                    }
                }
            }
        }
        return out.size() > 8 ? out.subList(0, 8) : out;
    }

    public boolean hasRedFlag(String text) {
        String t = normalize(text);
        return RED_FLAGS.stream().anyMatch(t::contains);
    }

    /** True when any trigger phrase appears in the text and is not negated. */
    private boolean mentioned(String normalized, Symptom s) {
        for (String trigger : s.triggers()) {
            int idx = normalized.indexOf(trigger);
            while (idx >= 0) {
                if (!isNegated(normalized, idx)) {
                    return true;
                }
                idx = normalized.indexOf(trigger, idx + trigger.length());
            }
        }
        return false;
    }

    /**
     * A match is negated if a negation cue appears within ~18 characters before it and no clause
     * break (comma / period) sits between the cue and the match — so "No cough" negates Cough but
     * "fever, no cough" still lets "fever" through and only suppresses "cough".
     */
    private boolean isNegated(String text, int matchIdx) {
        int windowStart = Math.max(0, matchIdx - 18);
        String window = text.substring(windowStart, matchIdx);
        int clauseBreak = Math.max(window.lastIndexOf('.'), window.lastIndexOf(','));
        String clause = clauseBreak >= 0 ? window.substring(clauseBreak + 1) : window;
        for (String neg : NEGATIONS) {
            if (clause.contains(neg)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String text) {
        return (text == null ? "" : text).toLowerCase(Locale.ROOT);
    }
}
