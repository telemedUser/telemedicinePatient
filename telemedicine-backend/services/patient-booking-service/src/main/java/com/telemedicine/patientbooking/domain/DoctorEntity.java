package com.telemedicine.patientbooking.domain;

import com.telemedicine.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * A bookable doctor offered to the patient (P-07 / P-08). Backed by Postgres so bookings and the
 * directory survive restarts and are shared across instances. Languages are stored as a simple
 * comma-separated list to keep the row flat; the API still exposes them as an array.
 */
@Entity
@Table(name = "booking_doctor")
public class DoctorEntity extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String specialty;

    @Column(nullable = false)
    private double rating;

    @Column(nullable = false)
    private int reviews;

    @Column(name = "next_availability")
    private String nextAvailability;

    @Column(nullable = false)
    private String mode;

    @Column(name = "price_clp", nullable = false)
    private int priceClp;

    /** Comma-separated ISO language codes, e.g. {@code "en,hi"}. */
    @Column(name = "languages")
    private String languages;

    @Column(columnDefinition = "text")
    private String bio;

    protected DoctorEntity() {}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public int getReviews() {
        return reviews;
    }

    public void setReviews(int reviews) {
        this.reviews = reviews;
    }

    public String getNextAvailability() {
        return nextAvailability;
    }

    public void setNextAvailability(String nextAvailability) {
        this.nextAvailability = nextAvailability;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public int getPriceClp() {
        return priceClp;
    }

    public void setPriceClp(int priceClp) {
        this.priceClp = priceClp;
    }

    public String getLanguages() {
        return languages;
    }

    public void setLanguages(String languages) {
        this.languages = languages;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }
}
