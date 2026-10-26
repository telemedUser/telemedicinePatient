package com.telemedicine.patientbooking.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SymptomPhraseRepository extends JpaRepository<SymptomPhraseEntity, Long> {
    List<SymptomPhraseEntity> findByKind(String kind);
}
