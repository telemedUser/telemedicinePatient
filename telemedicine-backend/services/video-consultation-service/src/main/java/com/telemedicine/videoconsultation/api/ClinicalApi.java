package com.telemedicine.videoconsultation.api;

import com.telemedicine.videoconsultation.service.ConsultationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Clinical API for the video consultation. The patient app pushes booking and
 * triage context here; the physician app reads it and writes the care plan.
 */
@RestController
@RequestMapping("/api")
public class ClinicalApi {

    private final ConsultationService service;

    public ClinicalApi(ConsultationService service) { this.service = service; }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "UP", "service", "video-consultation-service");
    }

    @PostMapping("/patients/{patientId}/context")
    public PatientContextDto ingestContext(@PathVariable String patientId, @RequestBody PatientContextDto context) {
        return service.saveContext(patientId, context);
    }

    @GetMapping("/patients/{patientId}/context")
    public PatientContextDto getContext(@PathVariable String patientId) {
        return service.getContext(patientId);
    }

    @GetMapping("/consultations/{consultationId}/care-plan")
    public CarePlanDto getPlan(@PathVariable String consultationId) {
        return service.getPlan(consultationId);
    }

    @PutMapping("/consultations/{consultationId}/care-plan")
    public CarePlanDto savePlan(@PathVariable String consultationId, @RequestBody CarePlanDto input) {
        if (input.status != null && !input.status.isBlank()
                && !input.status.equals("DRAFT") && !input.status.equals("FINALIZED")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be DRAFT or FINALIZED");
        }
        return service.savePlan(consultationId, input);
    }

    @PostMapping("/consultations/{consultationId}/care-plan/finalize")
    public CarePlanDto finalizePlan(@PathVariable String consultationId) {
        return service.finalizePlan(consultationId);
    }
}