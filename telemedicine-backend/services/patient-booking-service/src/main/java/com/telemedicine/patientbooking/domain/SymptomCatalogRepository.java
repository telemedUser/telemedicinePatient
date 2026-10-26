package com.telemedicine.patientbooking.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Catalog rows, ordered for stable display. */
public interface SymptomCatalogRepository extends JpaRepository<SymptomEntity, String> {
    List<SymptomEntity> findAllByOrderByDisplayOrderAsc();
}
