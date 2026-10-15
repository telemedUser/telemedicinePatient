package com.telemedicine.patientbooking.domain;

public record MedicalHistoryRecord(
        String id,
        String label,
        String detail,
        boolean shared
) {}