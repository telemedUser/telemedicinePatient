package com.telemedicine.patientbooking.domain;

public record Dependent(
        String id,
        String name,
        int ageYears,
        String relationship,
        boolean eligible
) {}