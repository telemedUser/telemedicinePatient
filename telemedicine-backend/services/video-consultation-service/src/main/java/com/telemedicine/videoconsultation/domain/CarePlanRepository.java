package com.telemedicine.videoconsultation.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CarePlanRepository extends JpaRepository<CarePlanEntity, String> {}