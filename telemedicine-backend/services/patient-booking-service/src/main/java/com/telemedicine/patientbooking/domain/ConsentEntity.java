package com.telemedicine.patientbooking.domain;

import com.telemedicine.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Consent-centre toggle (P-23). The id is a stable slug such as {@code platform-tc}. */
@Entity
@Table(name = "booking_consent")
public class ConsentEntity extends BaseEntity {

    @Column(nullable = false)
    private String label;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private boolean granted;

    protected ConsentEntity() {}

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isGranted() {
        return granted;
    }

    public void setGranted(boolean granted) {
        this.granted = granted;
    }
}
