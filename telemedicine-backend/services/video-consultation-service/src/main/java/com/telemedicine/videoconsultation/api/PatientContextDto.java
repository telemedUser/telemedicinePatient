package com.telemedicine.videoconsultation.api;

import java.util.ArrayList;
import java.util.List;

/** Wire shape for patient context, matching the frontend video library. */
public class PatientContextDto {
    public String patientId;
    public String consultationId;
    public String reasonForVisit;
    public List<Allergy> allergies = new ArrayList<>();
    public List<String> conditions = new ArrayList<>();
    public List<String> medications = new ArrayList<>();
    public List<String> medicalHistory = new ArrayList<>();
    public List<Symptom> symptoms = new ArrayList<>();
    public List<QuickCheck> quickChecks = new ArrayList<>();

    public static class Allergy { public String name; public String reaction; }
    public static class Symptom { public String name; public String duration; public String severity; }
    public static class QuickCheck { public String question; public String answer; }
}