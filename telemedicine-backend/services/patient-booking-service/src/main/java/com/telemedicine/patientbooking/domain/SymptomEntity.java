package com.telemedicine.patientbooking.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A symptom in the P-04 catalog (table {@code symptom_catalog}). */
@Entity
@Table(name = "symptom_catalog")
public class SymptomEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String label;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected SymptomEntity() {}

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }
}
