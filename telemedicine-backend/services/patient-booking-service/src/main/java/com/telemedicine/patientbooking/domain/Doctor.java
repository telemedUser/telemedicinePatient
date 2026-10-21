package com.telemedicine.patientbooking.domain;

import java.util.List;

public record Doctor(
        String id,
        String name,
        String specialty,
        double rating,
        int reviews,
        String nextAvailability,
        String mode,
        int priceClp,
        List<String> languages,
        String bio,
        int yearsExperience,
        String treats,
        String clinic,
        List<String> modes,
        int durationMin,
        boolean recommended,
        boolean inNetwork,
        String hours,
        List<Integer> ratingBreakdown
) {}
