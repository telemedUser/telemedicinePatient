package com.telemedicine.videoconsultation.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Clinician-entered care plan for a consultation, persisted in the shared
 * telemedicine database. Repeating sections are stored as JSON.
 */
@Entity
@Table(name = "consultation_care_plan")
public class CarePlanEntity {

    @Id
    @Column(name = "consultation_id", nullable = false)
    private String consultationId;

    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "doctor_id")
    private String doctorId;

    @Column(name = "diagnosis_json", columnDefinition = "text")
    private String diagnosisJson;

    @Column(name = "prescriptions_json", columnDefinition = "text")
    private String prescriptionsJson;

    @Column(name = "diagnostic_tests_json", columnDefinition = "text")
    private String diagnosticTestsJson;

    @Column(name = "follow_up_json", columnDefinition = "text")
    private String followUpJson;

    @Column(name = "medical_leave_json", columnDefinition = "text")
    private String medicalLeaveJson;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getConsultationId() { return consultationId; }
    public void setConsultationId(String v) { this.consultationId = v; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String v) { this.patientId = v; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String v) { this.doctorId = v; }
    public String getDiagnosisJson() { return diagnosisJson; }
    public void setDiagnosisJson(String v) { this.diagnosisJson = v; }
    public String getPrescriptionsJson() { return prescriptionsJson; }
    public void setPrescriptionsJson(String v) { this.prescriptionsJson = v; }
    public String getDiagnosticTestsJson() { return diagnosticTestsJson; }
    public void setDiagnosticTestsJson(String v) { this.diagnosticTestsJson = v; }
    public String getFollowUpJson() { return followUpJson; }
    public void setFollowUpJson(String v) { this.followUpJson = v; }
    public String getMedicalLeaveJson() { return medicalLeaveJson; }
    public void setMedicalLeaveJson(String v) { this.medicalLeaveJson = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant v) { this.updatedAt = v; }
}