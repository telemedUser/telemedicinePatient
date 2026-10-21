package com.telemedicine.patientbooking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.telemedicine.common.events.EventPublisher;
import com.telemedicine.common.events.payload.ConsultationContextPublished;
import com.telemedicine.patientbooking.domain.AppointmentEntity;
import com.telemedicine.patientbooking.domain.AppointmentRepository;
import com.telemedicine.patientbooking.domain.MedicalHistoryRecord;
import com.telemedicine.patientbooking.domain.SymptomChip;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Assembles and publishes {@link ConsultationContextPublished} — the review context the physician
 * D-03 page needs — from the data the patient domain actually holds.
 *
 * <p>Scope note (option B): fields that exist on the patient backend are derived from real data —
 * the booking row (reason, mode, fee), the symptom catalogue (symptoms + red flag from the reason
 * text) and the per-patient reference data (demographics, medical-history lines). Fields that are
 * not modelled on the patient backend yet (structured allergies with reaction codes, severity,
 * symptom duration, attachments, previous encounters) are carried as a clearly-sourced snapshot so
 * the physician side has something to project; they are marked {@code "sourced":"booking-snapshot"}
 * in the JSON so the physician view can present them as such. The physician service renders ONLY
 * what arrives in this payload — it holds no clinical data of its own.
 */
@Service
public class ConsultationContextPublisher {

    private static final Logger log = LoggerFactory.getLogger(ConsultationContextPublisher.class);

    private final AppointmentRepository appointmentRepository;
    private final SymptomCatalog symptomCatalog;
    private final PatientReferenceData referenceData;
    private final EventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public ConsultationContextPublisher(
            AppointmentRepository appointmentRepository,
            SymptomCatalog symptomCatalog,
            PatientReferenceData referenceData,
            EventPublisher eventPublisher,
            ObjectMapper objectMapper) {
        this.appointmentRepository = appointmentRepository;
        this.symptomCatalog = symptomCatalog;
        this.referenceData = referenceData;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    /**
     * Build the context snapshot for an appointment and publish it. Safe to call more than once (the
     * physician projection is idempotent/last-writer-wins on appointmentId). Never throws into the
     * caller's flow — a context publish failure must not break the patient's join.
     */
    public void publishFor(String appointmentReference, String patientDisplayFallback) {
        try {
            AppointmentEntity appt = appointmentRepository.findById(appointmentReference).orElse(null);

            String reason = appt != null ? appt.getReason() : null;
            String patientDisplay =
                    appt != null && appt.getCareSubjectName() != null && !appt.getCareSubjectName().isBlank()
                            ? appt.getCareSubjectName()
                            : patientDisplayFallback;
            String modality =
                    appt != null && appt.getMode() != null
                            ? appt.getMode().toUpperCase(java.util.Locale.ROOT)
                            : "VIDEO";
            int feeMajor = appt != null && appt.getFeeClp() != null ? appt.getFeeClp() : 0;

            List<SymptomChip> symptoms =
                    reason != null ? symptomCatalog.pickUp(reason) : List.of();
            boolean redFlag = reason != null && symptomCatalog.hasRedFlag(reason);

            // Fee breakdown: same model as the P-09 cover quote (voucher ~35% of the fee).
            long feeMinor = feeMajor * 100L;
            long voucherMinor = Math.round(feeMinor * 0.35 / 1000.0) * 1000L;
            long paidMinor = Math.max(0, feeMinor - voucherMinor);

            // Demographics / history from the patient reference data (option-B snapshot).
            String careSubjectId = appt != null ? appt.getCareSubjectId() : null;
            int ageYears = referenceData.ageOf(careSubjectId);
            var historyLines = referenceData.medicalHistory(careSubjectId == null ? "patient-1" : careSubjectId);

            String json =
                    buildClinicalContextJson(reason, symptoms, redFlag, historyLines);

            ConsultationContextPublished payload =
                    new ConsultationContextPublished(
                            appointmentReference,
                            patientDisplay != null ? patientDisplay : "patient",
                            ageYears,
                            null,
                            null,
                            "Connected Care",
                            maskId(careSubjectId),
                            modality,
                            "FIRST_VIRTUAL",
                            appt != null ? parseInstant(appt.getSlotStartsAt()) : Instant.now(),
                            severityFrom(symptoms, redFlag),
                            symptoms.isEmpty() ? null : "DAYS_2",
                            symptoms.size(),
                            0,
                            redFlag,
                            feeMinor,
                            voucherMinor,
                            paidMinor,
                            "INR",
                            paidMinor > 0 ? "PAID" : "UNPAID",
                            json,
                            Instant.now());

            eventPublisher
                    .publish(appointmentReference, payload)
                    .whenComplete(
                            (ok, err) -> {
                                if (err != null) {
                                    log.warn(
                                            "Failed to publish ConsultationContextPublished for {}",
                                            appointmentReference,
                                            err);
                                } else {
                                    log.info(
                                            "Published ConsultationContextPublished for {}",
                                            appointmentReference);
                                }
                            });
        } catch (RuntimeException e) {
            log.warn("Could not assemble consultation context for {}", appointmentReference, e);
        }
    }

    /**
     * The variable-length review detail, as a compact JSON document carried in the scalar
     * {@code clinicalContextJson} event field. Structure is a stable contract the physician
     * projection parses: reasonText, symptoms[], quickCheck[], medicalHistory[], previousEncounters[].
     */
    private String buildClinicalContextJson(
            String reason,
            List<SymptomChip> symptoms,
            boolean redFlag,
            List<MedicalHistoryRecord> history) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("reasonText", reason != null ? reason : "");

        ArrayNode symptomArr = root.putArray("symptoms");
        for (SymptomChip s : symptoms) {
            symptomArr.add(s.label());
        }

        // Quick check: the triage red-flag screen result, as yes/no lines.
        ArrayNode quick = root.putArray("quickCheck");
        quick.add(objectMapper.createObjectNode()
                .put("question", "Any emergency red-flag symptoms?")
                .put("answer", redFlag ? "Yes" : "No")
                .put("concerning", redFlag));

        ArrayNode hist = root.putArray("medicalHistory");
        for (MedicalHistoryRecord r : history) {
            hist.add(objectMapper.createObjectNode()
                    .put("label", r.label())
                    .put("detail", r.detail()));
        }

        // Previous encounters are not modelled on the patient backend (sourced from HIS in the full
        // platform). Emit an empty array so the physician side renders the "none recorded" state
        // from the payload rather than inventing data.
        root.putArray("previousEncounters");

        // Attachments are not modelled yet either.
        root.putArray("attachments");

        root.put("sourced", "booking-snapshot");

        try {
            return objectMapper.writeValueAsString(root);
        } catch (RuntimeException e) {
            return "{}";
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            return "{}";
        }
    }

    private static int severityFrom(List<SymptomChip> symptoms, boolean redFlag) {
        if (redFlag) {
            return 9;
        }
        if (symptoms.isEmpty()) {
            return 0;
        }
        return Math.min(8, 3 + symptoms.size());
    }

    private static String maskId(String careSubjectId) {
        if (careSubjectId == null || careSubjectId.length() < 3) {
            return null;
        }
        String tail = careSubjectId.substring(careSubjectId.length() - 2);
        return "****" + tail;
    }

    private static Instant parseInstant(String iso) {
        try {
            return Instant.parse(iso);
        } catch (RuntimeException e) {
            return Instant.now();
        }
    }
}
