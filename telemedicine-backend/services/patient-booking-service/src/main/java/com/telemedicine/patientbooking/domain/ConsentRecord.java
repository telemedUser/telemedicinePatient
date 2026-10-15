package com.telemedicine.patientbooking.domain;

public final class ConsentRecord {
    private final String id;
    private final String label;
    private final String description;
    private boolean granted;

    public ConsentRecord(String id, String label, String description, boolean granted) {
        this.id = id;
        this.label = label;
        this.description = description;
        this.granted = granted;
    }

    public String getId() { return id; }
    public String getLabel() { return label; }
    public String getDescription() { return description; }
    public boolean isGranted() { return granted; }
    public void setGranted(boolean granted) { this.granted = granted; }
}