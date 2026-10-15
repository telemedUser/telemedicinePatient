package com.telemedicine.patientbooking.domain;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * A large, HIERARCHICAL, non-AI symptom directory.
 *
 * Structure:
 *  - Each symptom belongs to a body-system CATEGORY (e.g. "ENT & respiratory").
 *  - Each symptom may declare RELATED symptom ids (clinically associated).
 *
 * Matching is deterministic and word-wise against the patient's free-text:
 *  - match(text)        -> symptoms picked up from the text (auto-selected on P-04).
 *  - suggestions(text)  -> "Also have any of these?" = symptoms RELATED to the
 *                          picked-up ones (explicit relations first, then
 *                          same-category siblings), excluding already-matched.
 */
@Component
public class SymptomDirectory {

    /** id, label, body-system category, match keywords, and related symptom ids. */
    public record Entry(String id, String label, String category,
                        List<String> keywords, List<String> related) {}

    private final List<Entry> directory = buildDirectory();
    private final Map<String, Entry> byId = new LinkedHashMap<>();

    public SymptomDirectory() {
        for (Entry e : directory) byId.put(e.id(), e);
    }

    public List<Entry> all() { return directory; }

    /**
     * Word-wise filter: the symptoms whose keywords appear in the text.
     * Handles the "no cough" negation so it does not also match "cough".
     */
    public List<SymptomChip> match(String text) {
        String norm = normalise(text);
        if (norm.isBlank()) return List.of();
        Set<String> tokens = new LinkedHashSet<>(Arrays.asList(norm.split("\\s+")));
        String padded = " " + norm + " ";

        Map<String, SymptomChip> hits = new LinkedHashMap<>();
        for (Entry e : directory) {
            for (String kw : e.keywords()) {
                String k = kw.trim().toLowerCase();
                boolean matched = k.contains(" ")
                        ? padded.contains(" " + k + " ")
                        : matchesToken(tokens, k);
                if (matched) {
                    hits.putIfAbsent(e.id(), new SymptomChip(e.id(), e.label()));
                    break;
                }
            }
        }
        // Negation handling: if the text says "no cough" (or similar), drop the
        // positive cough chip so we only keep the explicit "No cough" symptom.
        applyNegation(padded, hits, "sym-cough", "sym-no-cough",
                new String[]{"no cough", "without cough", "denies cough", "no coughing"});
        return new ArrayList<>(hits.values());
    }

    /**
     * Hierarchical suggestions: symptoms related to what was picked up.
     * Order: explicit related links of matched symptoms, then same-category
     * siblings, excluding anything already matched. Deterministic, no AI.
     */
    public List<SymptomChip> suggestions(String text, int limit) {
        List<SymptomChip> matched = match(text);
        if (matched.isEmpty()) return List.of();

        Set<String> matchedIds = new LinkedHashSet<>();
        matched.forEach(m -> matchedIds.add(m.id()));

        Map<String, SymptomChip> out = new LinkedHashMap<>();

        // 1) explicit related links (clinically associated), in match order
        for (SymptomChip m : matched) {
            Entry e = byId.get(m.id());
            if (e == null) continue;
            for (String relId : e.related()) {
                Entry rel = byId.get(relId);
                if (rel != null && !matchedIds.contains(relId) && !out.containsKey(relId)) {
                    out.put(relId, new SymptomChip(rel.id(), rel.label()));
                    if (out.size() >= limit) return new ArrayList<>(out.values());
                }
            }
        }

        // 2) same-category siblings of the matched symptoms
        Set<String> matchedCategories = new LinkedHashSet<>();
        for (SymptomChip m : matched) {
            Entry e = byId.get(m.id());
            if (e != null) matchedCategories.add(e.category());
        }
        for (Entry e : directory) {
            if (out.size() >= limit) break;
            if (matchedCategories.contains(e.category())
                    && !matchedIds.contains(e.id())
                    && !out.containsKey(e.id())
                    && !"sym-no-cough".equals(e.id())) {
                out.put(e.id(), new SymptomChip(e.id(), e.label()));
            }
        }
        return new ArrayList<>(out.values());
    }

    /**
     * Single-word keyword match that is stem/prefix aware so partial words
     * still match (e.g. typing "sleep" matches the keyword "sleepless", and
     * "nause" matches "nausea"). Exact match always counts; for tokens and
     * keywords of 4+ chars, a shared prefix of 4+ chars counts as a match.
     */
    private boolean matchesToken(Set<String> tokens, String keyword) {
        for (String tok : tokens) {
            if (tok.equals(keyword)) return true;
            if (keyword.length() >= 4 && tok.length() >= 4) {
                if (tok.startsWith(keyword) || keyword.startsWith(tok)) return true;
                int n = Math.min(5, Math.min(tok.length(), keyword.length()));
                if (tok.substring(0, n).equals(keyword.substring(0, n))) return true;
            }
        }
        return false;
    }

    private void applyNegation(String padded, Map<String, SymptomChip> hits,
                               String positiveId, String negativeId, String[] negationPhrases) {
        for (String neg : negationPhrases) {
            if (padded.contains(" " + neg + " ")) {
                hits.remove(positiveId);
                Entry negEntry = byId.get(negativeId);
                if (negEntry != null) hits.putIfAbsent(negativeId, new SymptomChip(negEntry.id(), negEntry.label()));
                return;
            }
        }
    }

    private String normalise(String text) {
        if (text == null) return "";
        String n = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
        n = n.replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
        return n;
    }

    private List<Entry> buildDirectory() {
        List<Entry> d = new ArrayList<>();
        String GEN = "General & systemic";
        String ENT = "ENT & respiratory";
        String NEU = "Neurological";
        String GI = "Gastrointestinal";
        String MSK = "Musculoskeletal";
        String SKIN = "Skin";
        String EYE = "Eyes";
        String URO = "Urinary";
        String MH = "Mental health";

        // --- General / systemic ---
        d.add(new Entry("sym-fever", "Fever", GEN, List.of("fever","feverish","high temperature","temperature","pyrexia","38","39","40"), List.of("sym-chills","sym-sweats","sym-body-aches","sym-fatigue")));
        d.add(new Entry("sym-chills", "Chills", GEN, List.of("chills","shivering","shivers","rigors"), List.of("sym-fever","sym-sweats")));
        d.add(new Entry("sym-sweats", "Sweats", GEN, List.of("sweats","sweating","night sweats","perspiration"), List.of("sym-fever","sym-chills")));
        d.add(new Entry("sym-fatigue", "Fatigue", GEN, List.of("fatigue","tired","tiredness","exhausted","exhaustion","lethargy","no energy","weak","weakness"), List.of("sym-malaise","sym-fever")));
        d.add(new Entry("sym-malaise", "Feeling unwell", GEN, List.of("malaise","unwell","run down","under the weather"), List.of("sym-fatigue","sym-fever")));
        d.add(new Entry("sym-weight-loss", "Weight loss", GEN, List.of("weight loss","losing weight","lost weight"), List.of("sym-appetite-loss","sym-fatigue")));
        d.add(new Entry("sym-appetite-loss", "Loss of appetite", GEN, List.of("loss of appetite","no appetite","not hungry","appetite"), List.of("sym-nausea","sym-weight-loss")));
        // --- ENT / respiratory ---
        d.add(new Entry("sym-sore-throat", "Sore throat", ENT, List.of("sore throat","throat pain","throat hurts","scratchy throat"), List.of("sym-painful-swallowing","sym-swollen-glands","sym-hoarse-voice","sym-fever")));
        d.add(new Entry("sym-painful-swallowing", "Painful swallowing", ENT, List.of("painful to swallow","painful swallowing","hurts to swallow","difficulty swallowing","trouble swallowing","swallow","swallowing"), List.of("sym-sore-throat","sym-swollen-glands")));
        d.add(new Entry("sym-hoarse-voice", "Hoarse voice", ENT, List.of("hoarse","hoarse voice","lost my voice","voice"), List.of("sym-sore-throat","sym-cough")));
        d.add(new Entry("sym-swollen-glands", "Swollen glands", ENT, List.of("swollen glands","swollen lymph","lymph nodes","glands"), List.of("sym-sore-throat","sym-fever")));
        d.add(new Entry("sym-cough", "Cough", ENT, List.of("cough","coughing","dry cough","productive cough"), List.of("sym-sore-throat","sym-shortness-breath","sym-runny-nose")));
        d.add(new Entry("sym-no-cough", "No cough", ENT, List.of("no cough"), List.of()));
        d.add(new Entry("sym-runny-nose", "Runny nose", ENT, List.of("runny nose","nasal","congestion","congested","blocked nose","stuffy nose"), List.of("sym-sneezing","sym-sore-throat","sym-cough")));
        d.add(new Entry("sym-sneezing", "Sneezing", ENT, List.of("sneezing","sneeze"), List.of("sym-runny-nose")));
        d.add(new Entry("sym-shortness-breath", "Shortness of breath", ENT, List.of("shortness of breath","short of breath","breathless","breathlessness","cant breathe","difficulty breathing","hard to breathe","wheezing","wheeze"), List.of("sym-chest-pain","sym-cough")));
        d.add(new Entry("sym-chest-pain", "Chest pain", ENT, List.of("chest pain","chest tightness","tight chest","chest pressure"), List.of("sym-shortness-breath")));
        d.add(new Entry("sym-ear-pain", "Ear pain", ENT, List.of("ear pain","earache","ear ache","ear"), List.of("sym-sore-throat","sym-fever")));
        // --- Neurological ---
        d.add(new Entry("sym-headache", "Headache", NEU, List.of("headache","head ache","head pain","migraine"), List.of("sym-light-sensitivity","sym-dizziness","sym-neck-pain","sym-fever")));
        d.add(new Entry("sym-dizziness", "Dizziness", NEU, List.of("dizziness","dizzy","lightheaded","light headed","vertigo"), List.of("sym-headache","sym-fainting","sym-nausea")));
        d.add(new Entry("sym-light-sensitivity", "Light sensitivity", NEU, List.of("light sensitivity","sensitive to light","photophobia","bright light"), List.of("sym-headache","sym-neck-pain")));
        d.add(new Entry("sym-confusion", "Confusion", NEU, List.of("confusion","confused","disoriented"), List.of("sym-fever","sym-headache")));
        d.add(new Entry("sym-fainting", "Fainting", NEU, List.of("fainting","fainted","faint","passed out","blackout"), List.of("sym-dizziness")));
        d.add(new Entry("sym-numbness", "Numbness", NEU, List.of("numbness","numb","tingling","pins and needles"), List.of("sym-dizziness")));
        // --- Gastrointestinal ---
        d.add(new Entry("sym-nausea", "Nausea", GI, List.of("nausea","nauseous","feel sick","queasy"), List.of("sym-vomiting","sym-appetite-loss","sym-abdominal-pain")));
        d.add(new Entry("sym-vomiting", "Vomiting", GI, List.of("vomiting","vomit","throwing up","threw up","being sick"), List.of("sym-nausea","sym-diarrhoea","sym-abdominal-pain")));
        d.add(new Entry("sym-diarrhoea", "Diarrhoea", GI, List.of("diarrhoea","diarrhea","loose stool","loose stools","runny stool"), List.of("sym-abdominal-pain","sym-vomiting")));
        d.add(new Entry("sym-constipation", "Constipation", GI, List.of("constipation","constipated","cant poop"), List.of("sym-abdominal-pain","sym-bloating")));
        d.add(new Entry("sym-abdominal-pain", "Abdominal pain", GI, List.of("abdominal pain","stomach pain","stomach ache","tummy pain","belly pain","cramps","stomach"), List.of("sym-nausea","sym-bloating","sym-diarrhoea")));
        d.add(new Entry("sym-bloating", "Bloating", GI, List.of("bloating","bloated"), List.of("sym-abdominal-pain","sym-heartburn")));
        d.add(new Entry("sym-heartburn", "Heartburn", GI, List.of("heartburn","acid reflux","reflux","indigestion"), List.of("sym-abdominal-pain","sym-nausea")));
        // --- Musculoskeletal ---
        d.add(new Entry("sym-body-aches", "Body aches", MSK, List.of("body aches","body ache","aching","muscle aches","muscle pain","myalgia","aches"), List.of("sym-fever","sym-fatigue","sym-joint-pain")));
        d.add(new Entry("sym-joint-pain", "Joint pain", MSK, List.of("joint pain","joints","arthralgia"), List.of("sym-body-aches","sym-swelling")));
        d.add(new Entry("sym-back-pain", "Back pain", MSK, List.of("back pain","backache","lower back"), List.of("sym-body-aches")));
        d.add(new Entry("sym-neck-pain", "Neck pain", MSK, List.of("neck pain","stiff neck","neck stiffness","neck"), List.of("sym-headache","sym-light-sensitivity")));
        // --- Skin ---
        d.add(new Entry("sym-rash", "Rash", SKIN, List.of("rash","hives","red spots","skin irritation"), List.of("sym-itching","sym-swelling")));
        d.add(new Entry("sym-itching", "Itching", SKIN, List.of("itching","itchy","itch"), List.of("sym-rash")));
        d.add(new Entry("sym-swelling", "Swelling", SKIN, List.of("swelling","swollen","inflamed"), List.of("sym-rash","sym-joint-pain")));
        // --- Eyes ---
        d.add(new Entry("sym-eye-redness", "Eye redness", EYE, List.of("red eye","red eyes","eye redness","bloodshot"), List.of("sym-blurred-vision")));
        d.add(new Entry("sym-blurred-vision", "Blurred vision", EYE, List.of("blurred vision","blurry vision","vision","cant see clearly"), List.of("sym-headache","sym-eye-redness")));
        // --- Urinary ---
        d.add(new Entry("sym-painful-urination", "Painful urination", URO, List.of("painful urination","burning urination","burning when i pee","dysuria"), List.of("sym-frequent-urination","sym-fever")));
        d.add(new Entry("sym-frequent-urination", "Frequent urination", URO, List.of("frequent urination","peeing a lot","urinating often"), List.of("sym-painful-urination")));
        // --- Mental health ---
        d.add(new Entry("sym-anxiety", "Anxiety", MH, List.of("anxiety","anxious","panic","worried"), List.of("sym-insomnia","sym-low-mood")));
        d.add(new Entry("sym-low-mood", "Low mood", MH, List.of("low mood","depressed","depression","sad","hopeless"), List.of("sym-insomnia","sym-anxiety","sym-fatigue")));
        d.add(new Entry("sym-insomnia", "Trouble sleeping", MH, List.of("insomnia","sleep","sleeping","cant sleep","trouble sleeping","sleepless","not sleeping","poor sleep"), List.of("sym-anxiety","sym-fatigue","sym-low-mood")));
        return d;
    }
}