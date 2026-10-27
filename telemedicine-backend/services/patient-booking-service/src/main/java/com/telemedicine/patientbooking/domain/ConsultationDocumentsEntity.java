package com.telemedicine.patientbooking.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Read model projected from the physician service's {@code ConsultationDocumentsIssued} event.
 * Keyed by the appointment reference (the booking {@code TM-...} value the patient app holds), so
 * the patient's post-consultation screen (P-19) can show "your documents are ready" and render the
 * document detail without calling back into the physician domain. Written only by the Kafka
 * consumer; not audited (no BaseEntity) because there is no acting user on an event projection.
 */
@Entity
@Table(name = "consultation_documents")
public class ConsultationDocumentsEntity {

    @Id
    @Column(name = "appointment_id")
    private String appointmentId;

    @Column(nullable = false)
    private String status = "ISSUED";

    @Column(name = "document_count", nullable = false)
    private int documentCount;

    @Column(name = "has_prescription", nullable = false)
    private boolean hasPrescription;

    @Column(name = "has_medical_leave", nullable = false)
    private boolean hasMedicalLeave;

    @Column(name = "has_summary", nullable = false)
    private boolean hasSummary;

    @Column(name = "prescription_number")
    private String prescriptionNumber;

    @Column(name = "medical_leave_number")
    private String medicalLeaveNumber;

    @Column(name = "documents_json", columnDefinition = "text")
    private String documentsJson;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt = Instant.now();

    public ConsultationDocumentsEntity() {}

    public ConsultationDocumentsEntity(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getDocumentCount() {
        return documentCount;
    }

    public void setDocumentCount(int documentCount) {
        this.documentCount = documentCount;
    }

    public boolean isHasPrescription() {
        return hasPrescription;
    }

    public void setHasPrescription(boolean hasPrescription) {
        this.hasPrescription = hasPrescription;
    }

    public boolean isHasMedicalLeave() {
        return hasMedicalLeave;
    }

    public void setHasMedicalLeave(boolean hasMedicalLeave) {
        this.hasMedicalLeave = hasMedicalLeave;
    }

    public boolean isHasSummary() {
        return hasSummary;
    }

    public void setHasSummary(boolean hasSummary) {
        this.hasSummary = hasSummary;
    }

    public String getPrescriptionNumber() {
        return prescriptionNumber;
    }

    public void setPrescriptionNumber(String prescriptionNumber) {
        this.prescriptionNumber = prescriptionNumber;
    }

    public String getMedicalLeaveNumber() {
        return medicalLeaveNumber;
    }

    public void setMedicalLeaveNumber(String medicalLeaveNumber) {
        this.medicalLeaveNumber = medicalLeaveNumber;
    }

    public String getDocumentsJson() {
        return documentsJson;
    }

    public void setDocumentsJson(String documentsJson) {
        this.documentsJson = documentsJson;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(Instant receivedAt) {
        this.receivedAt = receivedAt;
    }
}
