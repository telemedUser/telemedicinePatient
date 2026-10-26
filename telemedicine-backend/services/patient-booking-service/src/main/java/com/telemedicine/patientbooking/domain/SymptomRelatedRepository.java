package com.telemedicine.patientbooking.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SymptomRelatedRepository
        extends JpaRepository<SymptomRelatedEntity, SymptomRelatedEntity.Key> {
    List<SymptomRelatedEntity> findAllByOrderBySeqAsc();
}
