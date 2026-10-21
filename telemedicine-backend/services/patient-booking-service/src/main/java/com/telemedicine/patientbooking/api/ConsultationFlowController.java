package com.telemedicine.patientbooking.api;

import com.telemedicine.patientbooking.service.ConsultationFlowService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
 * waiting room). Keyed by the appointment reference.
 */
@RestController
@RequestMapping("/api/consultations")
public class ConsultationFlowController {

    private final ConsultationFlowService flow;

    public ConsultationFlowController(ConsultationFlowService flow) {
        this.flow = flow;
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
}
