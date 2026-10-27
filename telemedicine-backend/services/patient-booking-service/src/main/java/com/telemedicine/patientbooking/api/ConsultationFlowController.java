package com.telemedicine.patientbooking.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.telemedicine.patientbooking.domain.Appointment;
import com.telemedicine.patientbooking.domain.ConsultationDocumentsEntity;
import com.telemedicine.patientbooking.domain.ConsultationDocumentsRepository;
import com.telemedicine.patientbooking.domain.ConsultationSurveyEntity;
import com.telemedicine.patientbooking.domain.ConsultationSurveyRepository;
import com.telemedicine.patientbooking.service.BookingService;
import com.telemedicine.patientbooking.service.ConsultationFlowService;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Pre-join consultation journey API (P-14 OTP → P-15 consents recap → P-16 device check → P-17
 * waiting room) plus the post-consultation documents read model (P-19). Keyed by the appointment
 * reference.
 */
@RestController
@RequestMapping("/api/consultations")
public class ConsultationFlowController {

    private final ConsultationFlowService flow;
    private final ConsultationDocumentsRepository documentsRepository;
    private final ConsultationSurveyRepository surveyRepository;
    private final BookingService bookingService;
    private final ObjectMapper objectMapper;

    public ConsultationFlowController(
            ConsultationFlowService flow,
            ConsultationDocumentsRepository documentsRepository,
            ConsultationSurveyRepository surveyRepository,
            BookingService bookingService,
            ObjectMapper objectMapper) {
        this.flow = flow;
        this.documentsRepository = documentsRepository;
        this.surveyRepository = surveyRepository;
        this.bookingService = bookingService;
        this.objectMapper = objectMapper;
    }

    /** Deterministic quality-team case reference from the appointment id (stable, e.g. CX-4471). */
    private static String caseRef(String reference) {
        long h = 2166136261L;
        for (int i = 0; i < reference.length(); i++) {
            h = (h ^ reference.charAt(i)) * 16777619L & 0xffffffffL;
        }
        return "CX-" + (1000 + (int) (h % 9000));
    }

    /* ---- P-14 Confirm it's you (OTP) ---- */

    @PostMapping("/{reference}/otp/send")
    public Map<String, Object> sendOtp(@PathVariable String reference) {
        return flow.sendOtp(reference);
    }

    @PostMapping("/{reference}/otp/verify")
    public Map<String, Object> verifyOtp(
            @PathVariable String reference, @RequestBody Map<String, String> body) {
        boolean ok = flow.verifyOtp(reference, body.get("code"));
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That code doesn't match. Try again.");
        }
        return Map.of("verified", true);
    }

    /* ---- P-15 Consents already given at booking ---- */

    @GetMapping("/{reference}/consents")
    public Map<String, Object> consentsGiven(@PathVariable String reference) {
        // Mirrors the four consents accepted on P-10. In a full system these carry the real
        // captured-at timestamps; here we return a stable "given" recap for the pre-join screen.
        String givenAt = "At booking";
        List<Map<String, Object>> items =
                List.of(
                        consent("platform-terms", "Platform terms v3.1", givenAt),
                        consent("privacy", "Privacy notice v2.4", givenAt),
                        consent("clinical", "Clinical informed consent for virtual care v1.3", givenAt),
                        consent("eligibility", "Share eligibility data for your insurance voucher", givenAt));
        return Map.of("consents", items);
    }

    private Map<String, Object> consent(String id, String label, String givenAt) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("label", label);
        m.put("givenAt", givenAt);
        m.put("channel", "web");
        m.put("granted", true);
        return m;
    }

    /* ---- P-16 Device check readiness ---- */

    @PostMapping("/{reference}/ready")
    public Map<String, Object> markReady(
            @PathVariable String reference, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> b = body != null ? body : Map.of();
        String patientRef = b.get("patientRef") != null ? String.valueOf(b.get("patientRef")) : null;
        boolean cameraOk = b.get("cameraOk") == null || Boolean.parseBoolean(String.valueOf(b.get("cameraOk")));
        boolean micOk = b.get("microphoneOk") == null || Boolean.parseBoolean(String.valueOf(b.get("microphoneOk")));
        int bandwidthKbps =
                b.get("bandwidthKbps") != null ? (int) Double.parseDouble(String.valueOf(b.get("bandwidthKbps"))) : 12000;
        flow.markReady(reference, patientRef, cameraOk, micOk, bandwidthKbps);
        return Map.of("ready", true);
    }

    /* ---- P-17 Waiting-room status ---- */

    @GetMapping("/{reference}/status")
    public Map<String, Object> status(@PathVariable String reference) {
        return flow.status(reference);
    }

    /** Dev hook: the doctor opens the room so the patient can join. */
    @PostMapping("/{reference}/doctor-open")
    public Map<String, Object> doctorOpen(@PathVariable String reference) {
        flow.doctorOpen(reference);
        return Map.of("status", "OPEN_DOCTOR");
    }

    /* ---- P-19 Post-consultation: documents issued by the physician on close ---- */

    /**
     * The issued documents for an appointment, projected from the physician service's
     * ConsultationDocumentsIssued event. Returns {@code status: "PENDING"} with no documents until
     * the event has been received, so the patient screen can poll and flip "Preparing…" → "Ready".
     */
    @GetMapping("/{reference}/documents")
    public Map<String, Object> documents(@PathVariable String reference) {
        ConsultationDocumentsEntity e = documentsRepository.findById(reference).orElse(null);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("appointmentId", reference);
        if (e == null) {
            out.put("status", "PENDING");
            out.put("documentCount", 0);
            out.put("hasPrescription", false);
            out.put("hasMedicalLeave", false);
            out.put("hasSummary", false);
            out.put("prescriptionNumber", null);
            out.put("medicalLeaveNumber", null);
            out.put("issuedAt", null);
            out.put("plan", null);
            return out;
        }
        out.put("status", e.getStatus());
        out.put("documentCount", e.getDocumentCount());
        out.put("hasPrescription", e.isHasPrescription());
        out.put("hasMedicalLeave", e.isHasMedicalLeave());
        out.put("hasSummary", e.isHasSummary());
        out.put("prescriptionNumber", e.getPrescriptionNumber());
        out.put("medicalLeaveNumber", e.getMedicalLeaveNumber());
        out.put("issuedAt", e.getIssuedAt() != null ? e.getIssuedAt().toString() : null);
        // The full care-plan document detail, parsed back from the stored JSON for the UI.
        Object plan = null;
        if (e.getDocumentsJson() != null && !e.getDocumentsJson().isBlank()) {
            try {
                plan = objectMapper.readValue(e.getDocumentsJson(), Map.class);
            } catch (Exception ignored) {
                plan = null;
            }
        }
        out.put("plan", plan);
        return out;
    }

    /* ---- P-22 Satisfaction survey ("How did it go?") ---- */

    /**
     * Persist the patient's satisfaction survey for an appointment (NPS score + optional
     * improvement chips + comment + detractor call-back choice). Captures the patient and doctor
     * from the booking so scores can be aggregated later. Returns the stored row including the
     * generated quality-team case reference. Idempotent: re-submitting updates the same row.
     */
    @PostMapping("/{reference}/survey")
    public Map<String, Object> submitSurvey(
            @PathVariable String reference, @RequestBody Map<String, Object> body) {
        int score;
        try {
            score = (int) Double.parseDouble(String.valueOf(body.getOrDefault("score", "")));
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A score (0-10) is required.");
        }
        if (score < 0 || score > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Score must be between 0 and 10.");
        }
        boolean callback = Boolean.TRUE.equals(body.get("callbackRequested"));
        String comment = body.get("comment") != null ? String.valueOf(body.get("comment")) : null;
        String improvements = null;
        Object imp = body.get("improvements");
        if (imp instanceof List<?> list && !list.isEmpty()) {
            improvements = String.join(", ", list.stream().map(String::valueOf).toList());
        } else if (imp != null) {
            improvements = String.valueOf(imp);
        }

        Optional<Appointment> appt = bookingService.getAppointment(reference);
        String doctorId = appt.map(a -> a.getDoctor() != null ? a.getDoctor().id() : null).orElse(null);
        String patientId = appt.map(Appointment::getCareSubjectId).orElse(null);

        ConsultationSurveyEntity e =
                surveyRepository.findById(reference).orElseGet(() -> new ConsultationSurveyEntity(reference));
        e.setPatientId(patientId);
        e.setDoctorId(doctorId);
        e.setScore(score);
        e.setImprovements(improvements);
        e.setComment(comment != null && !comment.isBlank() ? comment : null);
        e.setCallbackRequested(callback);
        if (e.getCaseRef() == null) {
            e.setCaseRef(caseRef(reference));
        }
        e.setSubmittedAt(Instant.now());
        surveyRepository.save(e);

        return surveyView(e);
    }

    /** The stored survey for an appointment, or {@code submitted:false} when none yet. */
    @GetMapping("/{reference}/survey")
    public Map<String, Object> getSurvey(@PathVariable String reference) {
        ConsultationSurveyEntity e = surveyRepository.findById(reference).orElse(null);
        if (e == null) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("appointmentId", reference);
            out.put("submitted", false);
            return out;
        }
        return surveyView(e);
    }

    private Map<String, Object> surveyView(ConsultationSurveyEntity e) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("appointmentId", e.getAppointmentId());
        out.put("submitted", true);
        out.put("score", e.getScore());
        out.put("improvements", e.getImprovements());
        out.put("comment", e.getComment());
        out.put("callbackRequested", e.isCallbackRequested());
        out.put("caseRef", e.getCaseRef());
        out.put("submittedAt", e.getSubmittedAt() != null ? e.getSubmittedAt().toString() : null);
        return out;
    }
}
