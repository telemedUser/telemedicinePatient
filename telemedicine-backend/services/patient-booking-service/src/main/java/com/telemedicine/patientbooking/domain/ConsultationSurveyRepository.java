package com.telemedicine.patientbooking.domain;

import org.springframework.data.jpa.repository.JpaRepository;

/** Store for the P-22 satisfaction survey, keyed by appointment reference. */
public interface ConsultationSurveyRepository
        extends JpaRepository<ConsultationSurveyEntity, String> {}
