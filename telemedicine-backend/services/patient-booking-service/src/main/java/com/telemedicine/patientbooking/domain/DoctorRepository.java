package com.telemedicine.patientbooking.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorRepository extends JpaRepository<DoctorEntity, String> {

    List<DoctorEntity> findBySpecialty(String specialty);
}
