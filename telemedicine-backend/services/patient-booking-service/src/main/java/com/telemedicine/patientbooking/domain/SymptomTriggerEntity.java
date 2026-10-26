package com.telemedicine.patientbooking.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A trigger phrase a symptom is matched against (table {@code symptom_trigger}). */
@Entity
@Table(name = "symptom_trigger")
public class SymptomTriggerEntity {

    @Id
    private Long id;

    @Column(name = "symptom_id", nullable = false)
    private String symptomId;

    @Column(nullable = false)
    private String phrase;

    protected SymptomTriggerEntity() {}

    public Long getId() {
        return id;
    }

    public String getSymptomId() {
        return symptomId;
    }

    public String getPhrase() {
        return phrase;
    }
}
