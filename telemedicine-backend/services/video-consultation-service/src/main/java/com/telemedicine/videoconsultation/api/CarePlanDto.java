package com.telemedicine.videoconsultation.api;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Wire shape for the care plan, matching the frontend video library. */
public class CarePlanDto {
    public String consultationId;
    public String patientId;
    public String doctorId;
    public List<Diagnosis> diagnosis = new ArrayList<>();
    public List<Prescription> prescriptions = new ArrayList<>();
    public List<String> diagnosticTests = new ArrayList<>();
    public FollowUp followUp = new FollowUp();
    public MedicalLeave medicalLeave = new MedicalLeave();
    public String status = "DRAFT";
    public Instant updatedAt;

    public static class Diagnosis { public String code; public String name; public String notes; }
    public static class Prescription {
        public String medicationName; public String dosage; public String frequency;
        public String duration; public String instructions;
    }
    public static class FollowUp { public boolean enabled; public String date; public String instructions; }
    public static class MedicalLeave {
        public boolean enabled; public String startDate; public String endDate; public String reason;
    }
}