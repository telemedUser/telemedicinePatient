package com.telemedicine.patientbooking.domain;

import com.telemedicine.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * A patient booking (P-11 create, P-13/P-37 manage). The human-facing {@code reference}
 * (e.g. {@code TM-ABC123}) is the id the frontend shows and looks appointments up by, so it is the
 * primary key. A snapshot of the chosen slot and fee is stored on the row so the appointment reads
 * the same even if the doctor's directory entry later changes.
 */
@Entity
@Table(name = "booking_appointment")
public class AppointmentEntity extends BaseEntity {

    @Column(nullable = false)
    private String status;

    @Column(name = "care_subject_id")
    private String careSubjectId;

    @Column(name = "care_subject_name")
    private String careSubjectName;

    @Column(name = "doctor_id", nullable = false)
    private String doctorId;

    @Column(name = "slot_id", nullable = false)
    private String slotId;

    @Column(name = "slot_starts_at", nullable = false)
    private String slotStartsAt;

    @Column(name = "mode", nullable = false)
    private String mode;

    @Column(columnDefinition = "text")
    private String reason;

    @Column(name = "fee_clp")
    private Integer feeClp;

    @Column(name = "booked_at", nullable = false)
    private String bookedAt;

    public AppointmentEntity() {}

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCareSubjectName() {
        return careSubjectName;
    }

    public void setCareSubjectName(String careSubjectName) {
        this.careSubjectName = careSubjectName;
    }

    public String getCareSubjectId() {
        return careSubjectId;
    }

    public void setCareSubjectId(String careSubjectId) {
        this.careSubjectId = careSubjectId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getSlotId() {
        return slotId;
    }

    public void setSlotId(String slotId) {
        this.slotId = slotId;
    }

    public String getSlotStartsAt() {
        return slotStartsAt;
    }

    public void setSlotStartsAt(String slotStartsAt) {
        this.slotStartsAt = slotStartsAt;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Integer getFeeClp() {
        return feeClp;
    }

    public void setFeeClp(Integer feeClp) {
        this.feeClp = feeClp;
    }

    public String getBookedAt() {
        return bookedAt;
    }

    public void setBookedAt(String bookedAt) {
        this.bookedAt = bookedAt;
    }
}
