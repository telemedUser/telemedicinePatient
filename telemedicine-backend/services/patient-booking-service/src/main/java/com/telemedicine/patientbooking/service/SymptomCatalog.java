package com.telemedicine.patientbooking.service;

import com.telemedicine.patientbooking.domain.SymptomChip;
import com.telemedicine.patientbooking.domain.SymptomCatalogRepository;
import com.telemedicine.patientbooking.domain.SymptomEntity;
import com.telemedicine.patientbooking.domain.SymptomPhraseRepository;
import com.telemedicine.patientbooking.domain.SymptomRelatedEntity;
import com.telemedicine.patientbooking.domain.SymptomRelatedRepository;
import com.telemedicine.patientbooking.domain.SymptomTriggerEntity;
import com.telemedicine.patientbooking.domain.SymptomTriggerRepository;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Symptom directory for P-04 ("What brings you in today?"). Each entry carries trigger phrases
 * (synonyms the free-text is matched against) and a set of <em>related</em> symptom ids that power
 * the "Also have any of these?" suggestions. Extraction is negation-aware: a phrase preceded by a
 * negation cue ("no", "without", "denies", "not") within a short window is NOT picked up, so
 * "No cough" does not add Cough.
 *
 * <p>The catalog data now lives in the database (tables {@code symptom_catalog},
 * {@code symptom_trigger}, {@code symptom_related}, {@code symptom_phrase}, seeded by Flyway
 * V112) instead of a hardcoded map. It is loaded once at startup into the same in-memory
 * structures; all matching/negation logic is unchanged.
 */
@Component
public class SymptomCatalog {

    private static final Logger log = LoggerFactory.getLogger(SymptomCatalog.class);

    /** One symptom in the directory. */
    public record Symptom(String id, String label, List<String> triggers, List<String> related) {}

    private final SymptomCatalogRepository catalogRepository;
    private final SymptomTriggerRepository triggerRepository;
    private final SymptomRelatedRepository relatedRepository;
    private final SymptomPhraseRepository phraseRepository;

    /** Negation cues loaded from the DB (kind = NEGATION). */
    private volatile List<String> negations = List.of();

    /** Red-flag phrases loaded from the DB (kind = RED_FLAG). */
    private volatile List<String> redFlags = List.of();

    /** Catalog in display order. Related ids reference other entries in this map. */
    private final Map<String, Symptom> byId = new LinkedHashMap<>();

    public SymptomCatalog(
            SymptomCatalogRepository catalogRepository,
            SymptomTriggerRepository triggerRepository,
            SymptomRelatedRepository relatedRepository,
            SymptomPhraseRepository phraseRepository) {
        this.catalogRepository = catalogRepository;
        this.triggerRepository = triggerRepository;
        this.relatedRepository = relatedRepository;
        this.phraseRepository = phraseRepository;
    }

    /** Load the catalog from the database into memory once the service starts. */
    @PostConstruct
    public synchronized void load() {
        // Triggers grouped by symptom, preserving row order.
        Map<String, List<String>> triggersBySymptom = new LinkedHashMap<>();
        for (SymptomTriggerEntity t : triggerRepository.findAll()) {
            triggersBySymptom.computeIfAbsent(t.getSymptomId(), k -> new ArrayList<>()).add(t.getPhrase());
        }
        // Related ids grouped by symptom, in seq order so suggestions keep their curated order.
        Map<String, List<String>> relatedBySymptom = new LinkedHashMap<>();
        for (SymptomRelatedEntity r : relatedRepository.findAllByOrderBySeqAsc()) {
            relatedBySymptom
                    .computeIfAbsent(r.getSymptomId(), k -> new ArrayList<>())
                    .add(r.getRelatedSymptomId());
        }

        byId.clear();
        for (SymptomEntity s : catalogRepository.findAllByOrderByDisplayOrderAsc()) {
            byId.put(
                    s.getId(),
                    new Symptom(
                            s.getId(),
                            s.getLabel(),
                            triggersBySymptom.getOrDefault(s.getId(), List.of()),
                            relatedBySymptom.getOrDefault(s.getId(), List.of())));
        }

        this.redFlags = phraseRepository.findByKind("RED_FLAG").stream().map(p -> p.getPhrase()).toList();
        this.negations = phraseRepository.findByKind("NEGATION").stream().map(p -> p.getPhrase()).toList();

        log.info(
                "Loaded symptom catalog from DB: {} symptoms, {} red-flags, {} negation cues",
                byId.size(),
                redFlags.size(),
                negations.size());
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
        return redFlags.stream().anyMatch(t::contains);
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
        for (String neg : negations) {
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
