package com.telemedicine.patientbooking.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A red-flag phrase or negation cue (table {@code symptom_phrase}, kind = RED_FLAG | NEGATION). */
@Entity
@Table(name = "symptom_phrase")
public class SymptomPhraseEntity {

    @Id
    private Long id;

    @Column(nullable = false)
    private String kind;

    @Column(nullable = false)
    private String phrase;

    protected SymptomPhraseEntity() {}

    public Long getId() {
        return id;
    }

    public String getKind() {
        return kind;
    }

    public String getPhrase() {
        return phrase;
    }
}
