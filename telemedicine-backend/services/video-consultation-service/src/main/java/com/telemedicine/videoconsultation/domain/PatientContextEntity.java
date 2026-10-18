package com.telemedicine.videoconsultation.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Patient clinical context for a consultation, persisted in the shared
 * telemedicine database. The structured lists (allergies, symptoms,
 * quick-checks, history) are stored as JSON so the upstream booking/triage
 * payload can be ingested verbatim.
 */
@Entity
@Table(name = "consultation_patient_context")
public class PatientContextEntity {

    @Id
    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "consultation_id")
    private String consultationId;

    @Column(name = "reason_for_visit", length = 2000)
    private String reasonForVisit;

    @Column(name = "allergies_json", columnDefinition = "text")
    private String allergiesJson;

    @Column(name = "conditions_json", columnDefinition = "text")
    private String conditionsJson;

    @Column(name = "medications_json", columnDefinition = "text")
    private String medicationsJson;

    @Column(name = "medical_history_json", columnDefinition = "text")
    private String medicalHistoryJson;

    @Column(name = "symptoms_json", columnDefinition = "text")
    private String symptomsJson;

    @Column(name = "quick_checks_json", columnDefinition = "text")
    private String quickChecksJson;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getPatientId() { return patientId; }
    public void setPatientId(String v) { this.patientId = v; }
    public String getConsultationId() { return consultationId; }
    public void setConsultationId(String v) { this.consultationId = v; }
    public String getReasonForVisit() { return reasonForVisit; }
    public void setReasonForVisit(String v) { this.reasonForVisit = v; }
    public String getAllergiesJson() { return allergiesJson; }
    public void setAllergiesJson(String v) { this.allergiesJson = v; }
    public String getConditionsJson() { return conditionsJson; }
    public void setConditionsJson(String v) { this.conditionsJson = v; }
    public String getMedicationsJson() { return medicationsJson; }
    public void setMedicationsJson(String v) { this.medicationsJson = v; }
    public String getMedicalHistoryJson() { return medicalHistoryJson; }
    public void setMedicalHistoryJson(String v) { this.medicalHistoryJson = v; }
    public String getSymptomsJson() { return symptomsJson; }
    public void setSymptomsJson(String v) { this.symptomsJson = v; }
    public String getQuickChecksJson() { return quickChecksJson; }
    public void setQuickChecksJson(String v) { this.quickChecksJson = v; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant v) { this.updatedAt = v; }
}