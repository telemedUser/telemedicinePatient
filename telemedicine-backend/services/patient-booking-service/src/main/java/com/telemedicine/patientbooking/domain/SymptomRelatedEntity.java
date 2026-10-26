package com.telemedicine.patientbooking.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/**
 * A "also have any of these?" link from one symptom to a related symptom
 * (table {@code symptom_related}, composite key).
 */
@Entity
@Table(name = "symptom_related")
@IdClass(SymptomRelatedEntity.Key.class)
public class SymptomRelatedEntity {

    @Id
    @Column(name = "symptom_id")
    private String symptomId;

    @Id
    @Column(name = "related_symptom_id")
    private String relatedSymptomId;

    /** Insert order, so the "also have any of these?" suggestions keep their curated order. */
    @Column(name = "seq")
    private Long seq;

    protected SymptomRelatedEntity() {}

    public String getSymptomId() {
        return symptomId;
    }

    public String getRelatedSymptomId() {
        return relatedSymptomId;
    }

    public Long getSeq() {
        return seq;
    }

    /** Composite primary key. */
    public static class Key implements Serializable {
        private String symptomId;
        private String relatedSymptomId;

        public Key() {}

        public Key(String symptomId, String relatedSymptomId) {
            this.symptomId = symptomId;
            this.relatedSymptomId = relatedSymptomId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Key key)) {
                return false;
            }
            return Objects.equals(symptomId, key.symptomId)
                    && Objects.equals(relatedSymptomId, key.relatedSymptomId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(symptomId, relatedSymptomId);
        }
    }
}
