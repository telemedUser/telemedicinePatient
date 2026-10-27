package com.telemedicine.patientbooking.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * The patient's post-consultation satisfaction survey (P-22). One row per appointment, keyed by the
 * booking reference. Persisted so scores can be aggregated for quality reporting; the patient and
 * doctor ids are captured but doctors only ever see aggregate scores, never who gave them.
 */
@Entity
@Table(name = "consultation_survey")
public class ConsultationSurveyEntity {

    @Id
    @Column(name = "appointment_id")
    private String appointmentId;

    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "doctor_id")
    private String doctorId;

    @Column(nullable = false)
    private int score;

    @Column(columnDefinition = "text")
    private String improvements;

    @Column(columnDefinition = "text")
    private String comment;

    @Column(name = "callback_requested", nullable = false)
    private boolean callbackRequested;

    @Column(name = "case_ref")
    private String caseRef;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    public ConsultationSurveyEntity() {}

    public ConsultationSurveyEntity(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getImprovements() {
        return improvements;
    }

    public void setImprovements(String improvements) {
        this.improvements = improvements;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public boolean isCallbackRequested() {
        return callbackRequested;
    }

    public void setCallbackRequested(boolean callbackRequested) {
        this.callbackRequested = callbackRequested;
    }

    public String getCaseRef() {
        return caseRef;
    }

    public void setCaseRef(String caseRef) {
        this.caseRef = caseRef;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }
}
