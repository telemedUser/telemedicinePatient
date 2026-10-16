package com.telemedicine.patientbooking.service;

import com.telemedicine.common.events.EventPublisher;
import com.telemedicine.common.events.EventTypes;
import com.telemedicine.common.events.payload.AppointmentCreated;
import com.telemedicine.common.events.payload.StatusChanged;
import com.telemedicine.patientbooking.domain.Appointment;
import com.telemedicine.patientbooking.domain.AppointmentEntity;
import com.telemedicine.patientbooking.domain.AppointmentRepository;
import com.telemedicine.patientbooking.domain.ConsentEntity;
import com.telemedicine.patientbooking.domain.ConsentRecord;
import com.telemedicine.patientbooking.domain.ConsentRepository;
import com.telemedicine.patientbooking.domain.Doctor;
import com.telemedicine.patientbooking.domain.DoctorEntity;
import com.telemedicine.patientbooking.domain.DoctorRepository;
import com.telemedicine.patientbooking.domain.Slot;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Postgres-backed booking logic, replacing the previous in-memory {@code BookingData}. Doctors,
 * appointments and consents live in the database (seeded by Flyway); slots are still generated
 * deterministically from a per-doctor offset table so the directory need not store a slot grid.
 *
 * <p>Creating a booking publishes {@link AppointmentCreated} and cancelling publishes {@link
 * StatusChanged}, so a patient booking reaches the physician worklist projection over the shared
 * Kafka — the whole point of making this a real platform service.
 */
@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    /** Pseudonymous physician reference the physician worklist is seeded against (dev). */
    private static final String DEFAULT_PHYSICIAN_REF = "dev-physician";
    private static final String SOURCE_SYSTEM = "PATIENT_BOOKING";

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsentRepository consentRepository;
    private final EventPublisher eventPublisher;

    public BookingService(
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository,
            ConsentRepository consentRepository,
            EventPublisher eventPublisher) {
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.consentRepository = consentRepository;
        this.eventPublisher = eventPublisher;
    }

    /* ---------- Doctors (P-07 / P-08) ---------- */

    @Transactional(readOnly = true)
    public List<Doctor> listDoctors(String specialty, String sort) {
        List<DoctorEntity> rows =
                (specialty != null && !specialty.isBlank() && !specialty.equals("all"))
                        ? doctorRepository.findBySpecialty(specialty)
                        : doctorRepository.findAll();
        List<Doctor> result = new ArrayList<>(rows.stream().map(BookingService::toDoctor).toList());
        if ("rating".equals(sort)) {
            result.sort(Comparator.comparingDouble(Doctor::rating).reversed());
        } else if ("price".equals(sort)) {
            result.sort(Comparator.comparingInt(Doctor::priceClp));
        } else if ("availability".equals(sort)) {
            result.sort(Comparator.comparing(d -> !"Today".equals(d.nextAvailability())));
        } else {
            result.sort(Comparator.comparing(Doctor::name));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Optional<Doctor> getDoctor(String id) {
        return doctorRepository.findById(id).map(BookingService::toDoctor);
    }

    @Transactional(readOnly = true)
    public List<String> specialties() {
        return doctorRepository.findAll().stream()
                .map(DoctorEntity::getSpecialty)
                .distinct()
                .sorted()
                .toList();
    }

    /** Deterministic slot grid for a doctor; no slot table needed. */
    public List<Slot> slots(String doctorId) {
        Map<String, int[]> offsets =
                Map.of(
                        "doc-khanna", new int[] {2, 3, 5, 26, 28},
                        "doc-nair", new int[] {27, 29, 31, 50},
                        "doc-reddy", new int[] {1, 4, 6, 24},
                        "doc-iyer", new int[] {2, 4, 48, 52});
        int[] hrs = offsets.getOrDefault(doctorId, new int[] {2, 24, 48});
        Instant base = Instant.now().truncatedTo(ChronoUnit.HOURS);
        List<Slot> result = new ArrayList<>();
        for (int i = 0; i < hrs.length; i++) {
            result.add(
                    new Slot(
                            doctorId + "-s" + (i + 1),
                            base.plus(hrs[i], ChronoUnit.HOURS).toString(),
                            "video"));
        }
        return result;
    }

    /* ---------- Consents (P-23) ---------- */

    @Transactional(readOnly = true)
    public List<ConsentRecord> consents() {
        return consentRepository.findAll().stream()
                .sorted(Comparator.comparing(ConsentEntity::getId))
                .map(BookingService::toConsent)
                .toList();
    }

    @Transactional
    public Optional<ConsentRecord> setConsent(String id, boolean granted) {
        return consentRepository
                .findById(id)
                .map(
                        c -> {
                            c.setGranted(granted);
                            return toConsent(consentRepository.save(c));
                        });
    }

    /* ---------- Appointments (P-11 / P-13 / P-37) ---------- */

    @Transactional
    public Appointment createAppointment(
            String careSubjectId,
            Doctor doctor,
            Slot slot,
            String mode,
            String reason,
            Integer feeClp) {
        String reference;
        do {
            reference = randomRef();
        } while (appointmentRepository.existsById(reference));

        String effectiveMode = mode != null ? mode : slot.mode();
        String bookedAt = Instant.now().toString();

        AppointmentEntity entity = new AppointmentEntity();
        entity.setId(reference);
        entity.setStatus("confirmed");
        entity.setCareSubjectId(careSubjectId);
        entity.setDoctorId(doctor.id());
        entity.setSlotId(slot.id());
        entity.setSlotStartsAt(slot.startsAt());
        entity.setMode(effectiveMode);
        entity.setReason(reason);
        entity.setFeeClp(feeClp);
        entity.setBookedAt(bookedAt);
        appointmentRepository.save(entity);

        publishAppointmentCreated(entity, careSubjectId, slot);
        return toAppointment(entity, doctor);
    }

    @Transactional(readOnly = true)
    public List<Appointment> listAppointments(String statusFilter) {
        List<AppointmentEntity> rows =
                (statusFilter != null && !statusFilter.isBlank())
                        ? appointmentRepository.findByStatus(statusFilter)
                        : appointmentRepository.findAll();
        return rows.stream().map(this::hydrate).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Appointment> getAppointment(String reference) {
        if (reference == null) {
            return Optional.empty();
        }
        return appointmentRepository.findById(reference).map(this::hydrate);
    }

    @Transactional
    public Optional<Appointment> cancelAppointment(String reference) {
        return appointmentRepository
                .findById(reference)
                .map(
                        entity -> {
                            String from = entity.getStatus();
                            entity.setStatus("cancelled");
                            appointmentRepository.save(entity);
                            publishStatusChanged(entity, from, "cancelled");
                            return hydrate(entity);
                        });
    }

    /* ---------- Event emission ---------- */

    private void publishAppointmentCreated(AppointmentEntity entity, String patientRef, Slot slot) {
        Instant scheduledAt;
        try {
            scheduledAt = Instant.parse(slot.startsAt());
        } catch (Exception e) {
            scheduledAt = Instant.now();
        }
        // Route the booking to the physician the patient actually chose: the doctor id (e.g.
        // "doc-khanna") becomes the physicianRef, which the physician worklist uses as its
        // provider_id. A physician signed in as that doctor then sees only their own bookings.
        String physicianRef =
                entity.getDoctorId() != null ? entity.getDoctorId() : DEFAULT_PHYSICIAN_REF;
        AppointmentCreated payload =
                new AppointmentCreated(
                        entity.getId(),
                        patientRef != null ? patientRef : "patient-1",
                        physicianRef,
                        scheduledAt,
                        entity.getMode() != null ? entity.getMode().toUpperCase() : "VIDEO",
                        SOURCE_SYSTEM);
        eventPublisher
                .publish(EventTypes.APPOINTMENT_CREATED, payload)
                .whenComplete(
                        (ok, err) -> {
                            if (err != null) {
                                log.warn("Failed to publish AppointmentCreated for {}", entity.getId(), err);
                            } else {
                                log.info("Published AppointmentCreated for {}", entity.getId());
                            }
                        });
    }

    private void publishStatusChanged(AppointmentEntity entity, String from, String to) {
        StatusChanged payload =
                new StatusChanged(entity.getId(), from, to, "patient-1", Instant.now());
        eventPublisher
                .publish(EventTypes.STATUS_CHANGED, payload)
                .whenComplete(
                        (ok, err) -> {
                            if (err != null) {
                                log.warn("Failed to publish StatusChanged for {}", entity.getId(), err);
                            }
                        });
    }

    /* ---------- Mapping ---------- */

    private Appointment hydrate(AppointmentEntity entity) {
        Doctor doctor =
                doctorRepository
                        .findById(entity.getDoctorId())
                        .map(BookingService::toDoctor)
                        .orElse(null);
        return toAppointment(entity, doctor);
    }

    private static Appointment toAppointment(AppointmentEntity entity, Doctor doctor) {
        Slot slot = new Slot(entity.getSlotId(), entity.getSlotStartsAt(), entity.getMode());
        return new Appointment(
                entity.getId(),
                entity.getStatus(),
                entity.getCareSubjectId(),
                doctor,
                slot,
                entity.getMode(),
                entity.getReason(),
                entity.getFeeClp(),
                entity.getBookedAt());
    }

    private static Doctor toDoctor(DoctorEntity e) {
        List<String> languages =
                (e.getLanguages() == null || e.getLanguages().isBlank())
                        ? List.of()
                        : Arrays.stream(e.getLanguages().split(",")).map(String::trim).toList();
        return new Doctor(
                e.getId(),
                e.getName(),
                e.getSpecialty(),
                e.getRating(),
                e.getReviews(),
                e.getNextAvailability(),
                e.getMode(),
                e.getPriceClp(),
                languages,
                e.getBio());
    }

    private static ConsentRecord toConsent(ConsentEntity e) {
        return new ConsentRecord(e.getId(), e.getLabel(), e.getDescription(), e.isGranted());
    }

    private String randomRef() {
        String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder("TM-");
        for (int i = 0; i < 6; i++) {
            sb.append(alphabet.charAt(ThreadLocalRandom.current().nextInt(alphabet.length())));
        }
        return sb.toString();
    }
}
