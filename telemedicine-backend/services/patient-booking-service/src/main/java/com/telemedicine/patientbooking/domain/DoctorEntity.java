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

    @Column(name = "years_experience")
    private int yearsExperience;

    /** Short "Treats …" conditions line shown on the P-07 card. */
    @Column(columnDefinition = "text")
    private String treats;

    @Column(name = "clinic")
    private String clinic;

    /** Comma-separated consultation modes offered, e.g. {@code "video,audio"}. */
    @Column(name = "modes")
    private String modes;

    @Column(name = "duration_min", nullable = false)
    private int durationMin = 15;

    @Column(name = "recommended", nullable = false)
    private boolean recommended;

    @Column(name = "in_network", nullable = false)
    private boolean inNetwork = true;

    /** Consultation hours free text, e.g. {@code "Mon–Fri 09:00–13:00 · 15:00–19:00; Sat 09:00–13:00"}. */
    @Column(name = "hours")
    private String hours;

    /** Rating breakdown percentages as CSV 5★..1★, e.g. {@code "78,16,4,1,1"}. */
    @Column(name = "rating_breakdown")
    private String ratingBreakdown;

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

    public int getYearsExperience() {
        return yearsExperience;
    }

    public void setYearsExperience(int yearsExperience) {
        this.yearsExperience = yearsExperience;
    }

    public String getTreats() {
        return treats;
    }

    public void setTreats(String treats) {
        this.treats = treats;
    }

    public String getClinic() {
        return clinic;
    }

    public void setClinic(String clinic) {
        this.clinic = clinic;
    }

    public String getModes() {
        return modes;
    }

    public void setModes(String modes) {
        this.modes = modes;
    }

    public int getDurationMin() {
        return durationMin;
    }

    public void setDurationMin(int durationMin) {
        this.durationMin = durationMin;
    }

    public boolean isRecommended() {
        return recommended;
    }

    public void setRecommended(boolean recommended) {
        this.recommended = recommended;
    }

    public boolean isInNetwork() {
        return inNetwork;
    }

    public void setInNetwork(boolean inNetwork) {
        this.inNetwork = inNetwork;
    }

    public String getHours() {
        return hours;
    }

    public void setHours(String hours) {
        this.hours = hours;
    }

    public String getRatingBreakdown() {
        return ratingBreakdown;
    }

    public void setRatingBreakdown(String ratingBreakdown) {
        this.ratingBreakdown = ratingBreakdown;
    }
}
