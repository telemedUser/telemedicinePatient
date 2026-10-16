package com.telemedicine.patientbooking.service;

import com.telemedicine.patientbooking.domain.Dependent;
import com.telemedicine.patientbooking.domain.MedicalHistoryRecord;
import com.telemedicine.patientbooking.domain.SymptomChip;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Static, read-only patient reference content that is not part of the persisted booking flow:
 * the signed-in patient profile, dependents, medical history, the symptom library and red-flag
 * phrases (P-03, P-04, P-05). Kept in memory because none of it is written through the API and it
 * never needs to reach another service; the booking state that must survive and be published lives
 * in Postgres via {@link BookingService}.
 */
@Component
public class PatientReferenceData {

    public static final String VALID_EMAIL = "priya@example.in";
    public static final String VALID_PASSWORD = "correct-horse";
    public static final String NO_RECORD_EMAIL = "norecord@example.in";

    public final Map<String, Object> patientMe =
            Map.of("id", "patient-1", "name", "Priya Sharma", "ageYears", 34);

    private final List<Dependent> dependents =
            List.of(
                    new Dependent("dep-aarav", "Aarav Sharma", 7, "parent", true),
                    new Dependent("dep-ineligible", "Rohan Sharma (not covered)", 12, "parent", false));

    private final List<SymptomChip> symptomLibrary =
            List.of(
                    new SymptomChip("sym-sore-throat", "Sore throat"),
                    new SymptomChip("sym-fever", "Fever"),
                    new SymptomChip("sym-cough", "Cough"),
                    new SymptomChip("sym-headache", "Headache"),
                    new SymptomChip("sym-fatigue", "Fatigue"));

    private final List<String> redFlags =
            List.of(
                    "chest pain",
                    "difficulty breathing",
                    "trouble breathing",
                    "shortness of breath",
                    "severe bleeding",
                    "fainting",
                    "stroke",
                    "suicidal");

    private final Map<String, List<MedicalHistoryRecord>> medicalHistory =
            Map.of(
                    "patient-1",
                            List.of(
                                    new MedicalHistoryRecord(
                                            "mh-1", "Mild asthma", "Diagnosed 2015; rescue inhaler as needed.", true),
                                    new MedicalHistoryRecord(
                                            "mh-2", "Penicillin allergy", "Skin reaction recorded in 2018.", true)),
                    "dep-aarav",
                            List.of(
                                    new MedicalHistoryRecord(
                                            "mh-a1", "Atopic dermatitis", "Controlled with moisturiser.", true)),
                    "dep-ineligible", List.of());

    public List<Dependent> dependents() {
        return dependents;
    }

    public List<MedicalHistoryRecord> medicalHistory(String id) {
        return medicalHistory.getOrDefault(id, List.of());
    }

    public List<SymptomChip> extractSymptoms(String text) {
        String t = text == null ? "" : text.toLowerCase();
        List<SymptomChip> hits = new ArrayList<>();
        for (SymptomChip s : symptomLibrary) {
            String first = s.label().toLowerCase().split(" ")[0];
            if (t.contains(first)) {
                hits.add(s);
            }
        }
        if (hits.isEmpty()) {
            return symptomLibrary.subList(0, 2);
        }
        return hits.size() > 15 ? hits.subList(0, 15) : hits;
    }

    public boolean hasRedFlag(String text) {
        String t = text == null ? "" : text.toLowerCase();
        return redFlags.stream().anyMatch(t::contains);
    }
}
