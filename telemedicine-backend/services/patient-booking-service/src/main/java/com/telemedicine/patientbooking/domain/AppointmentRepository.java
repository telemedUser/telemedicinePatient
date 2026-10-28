package com.telemedicine.patientbooking.domain;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<AppointmentEntity, String> {

    List<AppointmentEntity> findByStatus(String status);

    /** Appointments for a set of care subjects (the signed-in patient + their dependents). */
    List<AppointmentEntity> findByCareSubjectIdIn(Collection<String> careSubjectIds);

    List<AppointmentEntity> findByCareSubjectIdInAndStatus(
            Collection<String> careSubjectIds, String status);
}
