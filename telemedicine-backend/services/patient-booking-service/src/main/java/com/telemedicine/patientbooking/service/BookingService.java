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
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
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

    /** All slots for a doctor across the next 7 days, for both video and audio (P-08). */
    public List<Slot> slots(String doctorId) {
        return slots(doctorId, null);
    }

    /**
     * Deterministic 7-day slot grid for a doctor, optionally filtered by mode. No slot table is
     * needed; slots are generated from a per-doctor seed so they are stable within a run. Each day
     * gets a handful of clock times; the frontend groups them by day and offers a video/audio
     * toggle (both modes share the same times).
     */
    public List<Slot> slots(String doctorId, String mode) {
        // Per-doctor base hour and which of the next 7 days have availability.
        Map<String, int[]> dayPlan =
                Map.of(
                        // {firstHour, ...clock hours...} then day availability is derived below.
                        "doc-khanna", new int[] {9, 11, 14, 16, 17},
                        "doc-nair", new int[] {10, 12, 15, 18},
                        "doc-reddy", new int[] {9, 13, 16},
                        "doc-iyer", new int[] {9, 10, 11, 15});
        int[] clockHours = dayPlan.getOrDefault(doctorId, new int[] {9, 12, 15});
        // Which day-offsets (0=today .. 6) are open, varied per doctor so counts differ like the UI.
        Map<String, int[]> openDays =
                Map.of(
                        "doc-khanna", new int[] {0, 1, 3, 4, 5, 6},
                        "doc-nair", new int[] {0, 1, 2, 4, 6},
                        "doc-reddy", new int[] {0, 2, 3, 5},
                        "doc-iyer", new int[] {1, 2, 3, 4, 5});
        int[] days = openDays.getOrDefault(doctorId, new int[] {0, 1, 2, 3, 4});

        ZoneOffset zone = ZoneOffset.UTC;
        LocalDate today = LocalDate.now(zone);
        Instant now = Instant.now();
        List<String> modes =
                (mode == null || mode.isBlank()) ? List.of("video", "audio") : List.of(mode);

        List<Slot> result = new ArrayList<>();
        for (int d : days) {
            LocalDate date = today.plusDays(d);
            // Vary how many times are open on a given day so day chips show different counts.
            int times = Math.max(1, clockHours.length - (d % 3));
            for (int h = 0; h < times; h++) {
                Instant start =
                        date.atTime(LocalTime.of(clockHours[h % clockHours.length], (h % 2) * 40))
                                .toInstant(zone);
                if (start.isBefore(now)) {
                    continue; // don't offer times already past today
                }
                for (String m : modes) {
                    // Deterministic id from day+slot-index+mode so a mode-filtered fetch and the
                    // unfiltered lookup (used when creating the appointment) produce the same id.
                    String id = doctorId + "-" + m + "-d" + d + "s" + h;
                    result.add(new Slot(id, start.toString(), m));
                }
            }
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
            String careSubjectName,
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
        entity.setCareSubjectName(careSubjectName);
        entity.setDoctorId(doctor.id());
        entity.setSlotId(slot.id());
        entity.setSlotStartsAt(slot.startsAt());
        entity.setMode(effectiveMode);
        entity.setReason(reason);
        entity.setFeeClp(feeClp);
        entity.setBookedAt(bookedAt);
        appointmentRepository.save(entity);

        // Prefer the human name for the physician worklist; fall back to the care-subject id.
        String patientRef =
                (careSubjectName != null && !careSubjectName.isBlank())
                        ? careSubjectName
                        : careSubjectId;
        publishAppointmentCreated(entity, patientRef, slot);
        return toAppointment(entity, doctor);
    }

    @Transactional(readOnly = true)
    public List<Appointment> listAppointments(String statusFilter) {
        return listAppointments(statusFilter, null);
    }

    /**
     * List appointments, optionally scoped to a set of care subjects (the signed-in patient and
     * their dependents) so "My care" shows only that account's consultations rather than everyone's.
     * When {@code careSubjectIds} is null/empty, all appointments are returned (back-compat).
     */
    @Transactional(readOnly = true)
    public List<Appointment> listAppointments(
            String statusFilter, java.util.Collection<String> careSubjectIds) {
        boolean scoped = careSubjectIds != null && !careSubjectIds.isEmpty();
        boolean hasStatus = statusFilter != null && !statusFilter.isBlank();
        List<AppointmentEntity> rows;
        if (scoped && hasStatus) {
            rows = appointmentRepository.findByCareSubjectIdInAndStatus(careSubjectIds, statusFilter);
        } else if (scoped) {
            rows = appointmentRepository.findByCareSubjectIdIn(careSubjectIds);
        } else if (hasStatus) {
            rows = appointmentRepository.findByStatus(statusFilter);
        } else {
            rows = appointmentRepository.findAll();
        }
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
        List<String> languages = csvToList(e.getLanguages());
        List<String> modes =
                (e.getModes() == null || e.getModes().isBlank())
                        ? List.of("video", "audio")
                        : csvToList(e.getModes());
        List<Integer> breakdown =
                (e.getRatingBreakdown() == null || e.getRatingBreakdown().isBlank())
                        ? List.of(78, 16, 4, 1, 1)
                        : Arrays.stream(e.getRatingBreakdown().split(","))
                                .map(String::trim)
                                .map(Integer::parseInt)
                                .toList();
        int durationMin = e.getDurationMin() > 0 ? e.getDurationMin() : 15;
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
                e.getBio(),
                e.getYearsExperience(),
                e.getTreats(),
                e.getClinic(),
                modes,
                durationMin,
                e.isRecommended(),
                e.isInNetwork(),
                e.getHours(),
                breakdown);
    }

    private static List<String> csvToList(String csv) {
        return (csv == null || csv.isBlank())
                ? List.of()
                : Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
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
