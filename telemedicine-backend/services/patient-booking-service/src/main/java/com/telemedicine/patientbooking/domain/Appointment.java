package com.telemedicine.patientbooking.domain;

public final class Appointment {
    private final String reference;
    private String status;
    private final String careSubjectId;
    private final Doctor doctor;
    private final Slot slot;
    private final String mode;
    private final String reason;
    private final Integer feeClp;
    private final String createdAt;

    public Appointment(String reference, String status, String careSubjectId, Doctor doctor,
                       Slot slot, String mode, String reason, Integer feeClp, String createdAt) {
        this.reference = reference;
        this.status = status;
        this.careSubjectId = careSubjectId;
        this.doctor = doctor;
        this.slot = slot;
        this.mode = mode;
        this.reason = reason;
        this.feeClp = feeClp;
        this.createdAt = createdAt;
    }

    public String getReference() { return reference; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCareSubjectId() { return careSubjectId; }
    public Doctor getDoctor() { return doctor; }
    public Slot getSlot() { return slot; }
    public String getMode() { return mode; }
    public String getReason() { return reason; }
    public Integer getFeeClp() { return feeClp; }
    public String getCreatedAt() { return createdAt; }
}