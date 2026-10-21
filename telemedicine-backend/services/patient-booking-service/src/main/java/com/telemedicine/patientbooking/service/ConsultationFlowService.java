package com.telemedicine.patientbooking.service;

import com.telemedicine.common.events.EventPublisher;
import com.telemedicine.common.events.EventTypes;
import com.telemedicine.common.events.payload.DeviceTestCompleted;
import com.telemedicine.common.events.payload.PatientEnteredWaitingRoom;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Pre-join consultation flow (P-14 → P-17): OTP confirmation, consents recap, device-check
 * readiness and the waiting-room status. State is held in memory per appointment reference — this
 * is the join funnel, not persisted booking data, so it mirrors the in-memory triage session model.
 *
 * <p>Marking ready publishes {@code PatientEnteredWaitingRoom} and {@code DeviceTestCompleted} so
 * the physician worklist sees the patient as ready. The doctor opening the room flips the status to
 * {@code OPEN_DOCTOR}; a dev endpoint can drive that until the physician app joins this path.
 */
@Service
public class ConsultationFlowService {

    private static final Logger log = LoggerFactory.getLogger(ConsultationFlowService.class);

    /** Fixed demo OTP shown on P-14 ("Demo code is 739 214"). */
    public static final String DEMO_OTP = "739214";

    private static final class Flow {
        String otp = DEMO_OTP;
        boolean verified;
        boolean ready;
        String status = "WAITING"; // WAITING -> OPEN_DOCTOR
        Instant readyAt;
    }

    private final Map<String, Flow> flows = new ConcurrentHashMap<>();
    private final EventPublisher eventPublisher;
    private final ConsultationContextPublisher contextPublisher;

    public ConsultationFlowService(
            EventPublisher eventPublisher, ConsultationContextPublisher contextPublisher) {
        this.eventPublisher = eventPublisher;
        this.contextPublisher = contextPublisher;
    }

    private Flow flow(String ref) {
        return flows.computeIfAbsent(ref, k -> new Flow());
    }

    /* ---- P-14 OTP ---- */

    public Map<String, Object> sendOtp(String ref) {
        Flow f = flow(ref);
        f.otp = DEMO_OTP;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sent", true);
        out.put("demoCode", f.otp); // dev convenience, shown on the screen
        return out;
    }

    public boolean verifyOtp(String ref, String code) {
        Flow f = flow(ref);
        boolean ok = f.otp.equals(code == null ? "" : code.replaceAll("\\s", ""));
        if (ok) {
            f.verified = true;
        }
        return ok;
    }

    /* ---- P-16 readiness ---- */

    public void markReady(String ref, String patientRef, boolean cameraOk, boolean micOk, int bandwidthKbps) {
        Flow f = flow(ref);
        f.ready = true;
        f.readyAt = Instant.now();
        String pref = patientRef != null ? patientRef : "patient-1";
        // Tell the physician worklist the patient is waiting and the device check passed.
        eventPublisher
                .publish(
                        EventTypes.PATIENT_ENTERED_WAITING_ROOM,
                        new PatientEnteredWaitingRoom(ref, pref, 1, f.readyAt))
                .whenComplete((ok, err) -> logPublish("PatientEnteredWaitingRoom", ref, err));
        eventPublisher
                .publish(
                        EventTypes.DEVICE_TEST_COMPLETED,
                        new DeviceTestCompleted(ref, pref, cameraOk, micOk, bandwidthKbps, f.readyAt))
                .whenComplete((ok, err) -> logPublish("DeviceTestCompleted", ref, err));
        // Publish the full review context (D-03) for the physician the moment the patient is ready.
        contextPublisher.publishFor(ref, pref);
    }

    /* ---- P-17 waiting-room status ---- */

    public Map<String, Object> status(String ref) {
        Flow f = flow(ref);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("reference", ref);
        out.put("verified", f.verified);
        out.put("ready", f.ready);
        out.put("status", f.status); // WAITING | OPEN_DOCTOR
        out.put("doctorReady", "OPEN_DOCTOR".equals(f.status));
        return out;
    }

    /** Dev hook: the doctor opens the room so the patient can join. */
    public void doctorOpen(String ref) {
        flow(ref).status = "OPEN_DOCTOR";
        log.info("Consultation {} opened by doctor (dev)", ref);
    }

    private void logPublish(String type, String ref, Throwable err) {
        if (err != null) {
            log.warn("Failed to publish {} for {}", type, ref, err);
        } else {
            log.info("Published {} for {}", type, ref);
        }
    }
}
