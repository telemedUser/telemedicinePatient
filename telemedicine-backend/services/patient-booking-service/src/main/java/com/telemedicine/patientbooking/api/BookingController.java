package com.telemedicine.patientbooking.api;

import com.telemedicine.patientbooking.domain.Appointment;
import com.telemedicine.patientbooking.domain.BookingData;
import com.telemedicine.patientbooking.domain.ConsentRecord;
import com.telemedicine.patientbooking.domain.Doctor;
import com.telemedicine.patientbooking.domain.Slot;
import com.telemedicine.patientbooking.triage.TriageProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class BookingController {

    private final BookingData data;
    private final TriageProvider triage;

    public BookingController(BookingData data, TriageProvider triage) {
        this.data = data;
        this.triage = triage;
    }

    /* ---- P-02 Auth ---- */

    @PostMapping("/auth/sign-in")
    public Map<String, Object> signIn(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "");
        String password = body.getOrDefault("password", "");
        if (BookingData.NO_RECORD_EMAIL.equals(email)) {
            return Map.of("userId", "no-record-user", "hasRecord", false);
        }
        if (BookingData.VALID_EMAIL.equals(email) && BookingData.VALID_PASSWORD.equals(password)) {
            return Map.of("userId", "patient-1", "hasRecord", true);
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password doesn't match.");
    }

    @PostMapping("/auth/claveunica")
    public Map<String, Object> claveUnica() {
        return Map.of("userId", "patient-1", "hasRecord", true);
    }

    /* ---- P-03 Patient + dependents ---- */

    @GetMapping("/patients/me")
    public Map<String, Object> me() {
        return data.patientMe;
    }

    @GetMapping("/patients/me/dependents")
    public List<?> dependents() {
        return data.dependents();
    }

    /* ---- P-04 Symptom extraction ---- */

    @PostMapping("/symptoms/extract")
    public Map<String, Object> extract(@RequestBody Map<String, String> body) {
        String text = body.getOrDefault("text", "");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("chips", data.extractSymptoms(text));
        out.put("redFlag", data.hasRedFlag(text));
        return out;
    }

    /* ---- P-05 Medical history ---- */

    @GetMapping("/patients/{id}/medical-history")
    public Map<String, Object> medicalHistory(@PathVariable String id) {
        return Map.of("records", data.medicalHistory(id));
    }

    /* ---- P-06 Triage ---- */

    @PostMapping("/triage/start")
    public Map<String, Object> triageStart() {
        return triage.startTriage();
    }

    @PostMapping("/triage/answer")
    public Map<String, Object> triageAnswer(@RequestBody Map<String, String> body) {
        String sessionId = body.get("sessionId");
        if (sessionId == null || sessionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId is required.");
        }
        Map<String, Object> result = triage.submitAnswer(sessionId, body.get("questionId"), body.get("answer"));
        if ("unknown-session".equals(result.get("error"))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Triage session not found or expired.");
        }
        return result;
    }

    @GetMapping("/triage/result/{sessionId}")
    public Map<String, Object> triageResult(@PathVariable String sessionId) {
        Map<String, Object> result = triage.buildResult(sessionId);
        if (result == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Triage session not found or expired.");
        }
        return result;
    }

    /* ---- P-07 / P-08 Doctors + slots ---- */

    @GetMapping("/specialties")
    public Map<String, Object> specialties() {
        return Map.of("specialties", data.specialties());
    }

    @GetMapping("/doctors")
    public Map<String, Object> doctors(@RequestParam(required = false) String specialty,
                                       @RequestParam(required = false) String sort) {
        return Map.of("doctors", data.listDoctors(specialty, sort));
    }

    @GetMapping("/doctors/{id}")
    public Doctor doctor(@PathVariable String id) {
        return data.getDoctor(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found."));
    }

    @GetMapping("/doctors/{id}/slots")
    public Map<String, Object> slots(@PathVariable String id) {
        data.getDoctor(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found."));
        return Map.of("slots", data.slots(id));
    }

    /* ---- P-09 Cover quote (fixed fee = doctor price) ---- */

    @GetMapping("/cover/quote")
    public Map<String, Object> coverQuote(@RequestParam(required = false) String doctorId) {
        int fee = 18000;
        if (doctorId != null) {
            fee = data.getDoctor(doctorId).map(Doctor::priceClp).orElse(18000);
        }
        return Map.of(
                "feeClp", fee,
                "currency", "CLP",
                "note", "Nothing is charged until you confirm on the next screen.");
    }

    /* ---- P-11 Create appointment ---- */

    @PostMapping("/appointments")
    public ResponseEntity<Appointment> createAppointment(@RequestBody Map<String, String> body) {
        Doctor doctor = Optional.ofNullable(body.get("doctorId"))
                .flatMap(data::getDoctor)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid doctorId is required."));
        String slotId = body.get("slotId");
        Slot slot = data.slots(doctor.id()).stream()
                .filter(s -> s.id().equals(slotId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid slotId is required."));
        Appointment appt = data.createAppointment(
                body.get("careSubjectId"), doctor, slot, body.get("mode"), body.get("reason"), doctor.priceClp());
        return ResponseEntity.status(HttpStatus.CREATED).body(appt);
    }

    /* ---- P-13 / P-37 Manage appointments ---- */

    @GetMapping("/appointments")
    public Map<String, Object> listAppointments(@RequestParam(required = false) String status) {
        return Map.of("appointments", data.listAppointments(status));
    }

    @GetMapping("/appointments/{reference}")
    public Appointment getAppointment(@PathVariable String reference) {
        return data.getAppointment(reference).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found."));
    }

    @PostMapping("/appointments/{reference}/cancel")
    public Appointment cancel(@PathVariable String reference) {
        return data.cancelAppointment(reference).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found."));
    }

    /* ---- P-23 Consent centre ---- */

    @GetMapping("/consents")
    public Map<String, Object> consents() {
        return Map.of("consents", data.consents());
    }

    @PatchMapping("/consents/{id}")
    public ConsentRecord patchConsent(@PathVariable String id, @RequestBody Map<String, Object> body) {
        boolean granted = Boolean.TRUE.equals(body.get("granted"));
        return data.setConsent(id, granted).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consent not found."));
    }
}