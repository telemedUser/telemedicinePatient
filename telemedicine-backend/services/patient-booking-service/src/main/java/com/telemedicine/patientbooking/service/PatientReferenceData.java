package com.telemedicine.patientbooking.service;

import com.telemedicine.patientbooking.domain.Dependent;
import com.telemedicine.patientbooking.domain.MedicalHistoryRecord;
import com.telemedicine.patientbooking.domain.SymptomChip;
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

    private final SymptomCatalog symptomCatalog;

    public PatientReferenceData(SymptomCatalog symptomCatalog) {
        this.symptomCatalog = symptomCatalog;
    }

    public final Map<String, Object> patientMe =
            Map.of("id", "patient-1", "name", "Priya Sharma", "ageYears", 34);

    private final List<Dependent> dependents =
            List.of(
                    new Dependent("dep-aarav", "Aarav Sharma", 7, "parent", true),
                    new Dependent("dep-ineligible", "Rohan Sharma (not covered)", 12, "parent", false));

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

    /** Best-effort age for a care subject (the signed-in patient or a dependent). 0 when unknown. */
    public int ageOf(String careSubjectId) {
        if (careSubjectId == null || "patient-1".equals(careSubjectId)) {
            Object age = patientMe.get("ageYears");
            return age instanceof Integer i ? i : 0;
        }
        return dependents.stream()
                .filter(d -> careSubjectId.equals(d.id()))
                .map(Dependent::ageYears)
                .findFirst()
                .orElse(0);
    }

    /** Symptoms auto-detected in the text ("Symptoms we picked up"), negation-aware. */
    public List<SymptomChip> extractSymptoms(String text) {
        return symptomCatalog.pickUp(text);
    }

    /** "Also have any of these?": symptoms related to those picked up, excluding the picked ones. */
    public List<SymptomChip> relatedSymptoms(List<SymptomChip> pickedUp) {
        return symptomCatalog.related(pickedUp);
    }

    public boolean hasRedFlag(String text) {
        return symptomCatalog.hasRedFlag(text);
    }
}
