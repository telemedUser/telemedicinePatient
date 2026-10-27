package com.telemedicine.patientbooking.kafka;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.telemedicine.common.events.DomainEventListener;
import com.telemedicine.common.events.EventEnvelope;
import com.telemedicine.common.events.EventTypes;
import com.telemedicine.common.events.consumer.IdempotentConsumer;
import com.telemedicine.common.events.payload.ConsultationDocumentsIssued;
import com.telemedicine.patientbooking.domain.ConsultationDocumentsEntity;
import com.telemedicine.patientbooking.domain.ConsultationDocumentsRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * Consumes {@code ConsultationDocumentsIssued} published by physician-service on consultation close
 * and upserts a read model keyed by the appointment reference, so the patient's post-consultation
 * screen (P-19) can show "your documents are ready". Last-writer-wins on the appointment id.
 */
@Component
public class ConsultationDocumentsListener {

    private static final Logger log = LoggerFactory.getLogger(ConsultationDocumentsListener.class);

    private final ObjectMapper eventObjectMapper;
    private final ConsultationDocumentsRepository repository;

    public ConsultationDocumentsListener(
            @Qualifier("eventObjectMapper") ObjectMapper eventObjectMapper,
            ConsultationDocumentsRepository repository) {
        this.eventObjectMapper = eventObjectMapper;
        this.repository = repository;
    }

    @DomainEventListener(EventTypes.CONSULTATION_DOCUMENTS_ISSUED)
    @IdempotentConsumer
    public void onDocumentsIssued(ConsumerRecord<String, byte[]> record, Acknowledgment acknowledgment)
            throws Exception {
        EventEnvelope<ConsultationDocumentsIssued> envelope =
                readEnvelope(record.value(), ConsultationDocumentsIssued.class);
        ConsultationDocumentsIssued p = envelope.payload();

        ConsultationDocumentsEntity e =
                repository
                        .findById(p.appointmentId())
                        .orElseGet(() -> new ConsultationDocumentsEntity(p.appointmentId()));
        e.setStatus(p.status());
        e.setDocumentCount(p.documentCount());
        e.setHasPrescription(p.hasPrescription());
        e.setHasMedicalLeave(p.hasMedicalLeave());
        e.setHasSummary(p.hasSummary());
        e.setPrescriptionNumber(p.prescriptionNumber());
        e.setMedicalLeaveNumber(p.medicalLeaveNumber());
        e.setDocumentsJson(p.documentsJson());
        e.setIssuedAt(p.issuedAt());
        repository.save(e);

        log.info("Projected ConsultationDocumentsIssued for {}", p.appointmentId());
        acknowledgment.acknowledge();
    }

    private <T> EventEnvelope<T> readEnvelope(byte[] payload, Class<T> payloadType) throws Exception {
        JavaType type =
                eventObjectMapper.getTypeFactory().constructParametricType(EventEnvelope.class, payloadType);
        return eventObjectMapper.readValue(payload, type);
    }
}
