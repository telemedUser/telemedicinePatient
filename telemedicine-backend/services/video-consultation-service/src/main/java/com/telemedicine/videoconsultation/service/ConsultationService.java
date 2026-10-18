package com.telemedicine.videoconsultation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.telemedicine.videoconsultation.api.CarePlanDto;
import com.telemedicine.videoconsultation.api.PatientContextDto;
import com.telemedicine.videoconsultation.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Persists consultation context and care plans in the shared telemedicine
 * database, replacing the CareConnect in-memory store. Structured sections are
 * serialised to JSON columns.
 */
@Service
public class ConsultationService {

    private final PatientContextRepository contexts;
    private final CarePlanRepository plans;
    private final ObjectMapper mapper = new ObjectMapper();

    public ConsultationService(PatientContextRepository contexts, CarePlanRepository plans) {
        this.contexts = contexts;
        this.plans = plans;
    }

    private String toJson(Object value) {
        try { return value == null ? null : mapper.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException("Could not serialise value", e); }
    }

    private <T> T fromJson(String json, TypeReference<T> type, T fallback) {
        if (json == null || json.isBlank()) return fallback;
        try { return mapper.readValue(json, type); }
        catch (Exception e) { return fallback; }
    }

    @Transactional
    public PatientContextDto saveContext(String patientId, PatientContextDto dto) {
        PatientContextEntity e = contexts.findById(patientId).orElseGet(PatientContextEntity::new);
        e.setPatientId(patientId);
        e.setConsultationId(dto.consultationId);
        e.setReasonForVisit(dto.reasonForVisit);
        e.setAllergiesJson(toJson(dto.allergies));
        e.setConditionsJson(toJson(dto.conditions));
        e.setMedicationsJson(toJson(dto.medications));
        e.setMedicalHistoryJson(toJson(dto.medicalHistory));
        e.setSymptomsJson(toJson(dto.symptoms));
        e.setQuickChecksJson(toJson(dto.quickChecks));
        e.setUpdatedAt(Instant.now());
        contexts.save(e);
        dto.patientId = patientId;
        return dto;
    }

    @Transactional(readOnly = true)
    public PatientContextDto getContext(String patientId) {
        PatientContextDto dto = new PatientContextDto();
        dto.patientId = patientId;
        contexts.findById(patientId).ifPresent(e -> {
            dto.consultationId = e.getConsultationId();
            dto.reasonForVisit = e.getReasonForVisit();
            dto.allergies = fromJson(e.getAllergiesJson(), new TypeReference<>() {}, List.of());
            dto.conditions = fromJson(e.getConditionsJson(), new TypeReference<>() {}, List.of());
            dto.medications = fromJson(e.getMedicationsJson(), new TypeReference<>() {}, List.of());
            dto.medicalHistory = fromJson(e.getMedicalHistoryJson(), new TypeReference<>() {}, List.of());
            dto.symptoms = fromJson(e.getSymptomsJson(), new TypeReference<>() {}, List.of());
            dto.quickChecks = fromJson(e.getQuickChecksJson(), new TypeReference<>() {}, List.of());
        });
        return dto;
    }

    @Transactional
    public CarePlanDto savePlan(String consultationId, CarePlanDto dto) {
        CarePlanEntity e = plans.findById(consultationId).orElseGet(CarePlanEntity::new);
        e.setConsultationId(consultationId);
        e.setPatientId(dto.patientId);
        e.setDoctorId(dto.doctorId);
        e.setDiagnosisJson(toJson(dto.diagnosis));
        e.setPrescriptionsJson(toJson(dto.prescriptions));
        e.setDiagnosticTestsJson(toJson(dto.diagnosticTests));
        e.setFollowUpJson(toJson(dto.followUp));
        e.setMedicalLeaveJson(toJson(dto.medicalLeave));
        e.setStatus(dto.status == null || dto.status.isBlank() ? "DRAFT" : dto.status);
        e.setUpdatedAt(Instant.now());
        plans.save(e);
        return getPlan(consultationId);
    }

    @Transactional(readOnly = true)
    public CarePlanDto getPlan(String consultationId) {
        CarePlanDto dto = new CarePlanDto();
        dto.consultationId = consultationId;
        plans.findById(consultationId).ifPresent(e -> {
            dto.patientId = e.getPatientId();
            dto.doctorId = e.getDoctorId();
            dto.diagnosis = fromJson(e.getDiagnosisJson(), new TypeReference<>() {}, List.of());
            dto.prescriptions = fromJson(e.getPrescriptionsJson(), new TypeReference<>() {}, List.of());
            dto.diagnosticTests = fromJson(e.getDiagnosticTestsJson(), new TypeReference<>() {}, List.of());
            CarePlanDto.FollowUp fu = fromJson(e.getFollowUpJson(), new TypeReference<>() {}, new CarePlanDto.FollowUp());
            dto.followUp = fu == null ? new CarePlanDto.FollowUp() : fu;
            CarePlanDto.MedicalLeave ml = fromJson(e.getMedicalLeaveJson(), new TypeReference<>() {}, new CarePlanDto.MedicalLeave());
            dto.medicalLeave = ml == null ? new CarePlanDto.MedicalLeave() : ml;
            dto.status = e.getStatus();
            dto.updatedAt = e.getUpdatedAt();
        });
        return dto;
    }

    @Transactional
    public CarePlanDto finalizePlan(String consultationId) {
        CarePlanDto current = getPlan(consultationId);
        current.status = "FINALIZED";
        return savePlan(consultationId, current);
    }
}