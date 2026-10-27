package com.telemedicine.patientbooking.domain;

import org.springframework.data.jpa.repository.JpaRepository;

/** Store for the ConsultationDocumentsIssued projection, keyed by appointment reference. */
public interface ConsultationDocumentsRepository
        extends JpaRepository<ConsultationDocumentsEntity, String> {}
