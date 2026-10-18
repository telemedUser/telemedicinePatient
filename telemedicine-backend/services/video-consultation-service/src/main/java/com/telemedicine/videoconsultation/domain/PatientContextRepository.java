package com.telemedicine.videoconsultation.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientContextRepository extends JpaRepository<PatientContextEntity, String> {}