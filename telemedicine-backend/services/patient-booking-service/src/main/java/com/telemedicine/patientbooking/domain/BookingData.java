package com.telemedicine.patientbooking.domain;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/** In-memory data store mirroring the Node reference backend. */
@Component
public class BookingData {

    public static final String VALID_EMAIL = "valentina@example.cl";
    public static final String VALID_PASSWORD = "correct-horse";
    public static final String NO_RECORD_EMAIL = "norecord@example.cl";

    public final Map<String, Object> patientMe = Map.of(
            "id", "patient-1", "name", "Valentina Rojas Mendoza", "ageYears", 34);

    private final List<Dependent> dependents = List.of(
            new Dependent("dep-emilia", "Emilia Vergara Rojas", 7, "parent", true),
            new Dependent("dep-ineligible", "Tomas Rojas (sin cobertura)", 12, "parent", false));

    private final List<SymptomChip> symptomLibrary = List.of(
            new SymptomChip("sym-sore-throat", "Sore throat"),
            new SymptomChip("sym-fever", "Fever"),
            new SymptomChip("sym-cough", "Cough"),
            new SymptomChip("sym-headache", "Headache"),
            new SymptomChip("sym-fatigue", "Fatigue"));

    private final List<String> redFlags = List.of(
            "chest pain", "difficulty breathing", "trouble breathing",
            "shortness of breath", "severe bleeding", "fainting", "stroke", "suicidal");

    private final List<Doctor> doctors = List.of(
            new Doctor("doc-fuentes", "Dr. Andres Fuentes Silva", "General Physician", 4.8, 212,
                    "Today", "video", 18000, List.of("es", "en"),
                    "General physician with 12 years of experience in primary and acute care."),
            new Doctor("doc-munoz", "Dra. Carolina Munoz Reyes", "General Physician", 4.6, 158,
                    "Tomorrow", "video", 16000, List.of("es"),
                    "Family medicine specialist focused on respiratory and ENT conditions."),
            new Doctor("doc-rivas", "Dr. Felipe Rivas Castro", "Dermatology", 4.9, 301,
                    "Today", "video", 25000, List.of("es", "en"),
                    "Dermatologist specialising in skin lesions, acne and allergic reactions."),
            new Doctor("doc-soto", "Dra. Paula Soto Herrera", "Pediatrics", 4.7, 189,
                    "Today", "video", 20000, List.of("es"),
                    "Pediatrician with a focus on children's acute illness and preventive care."));

    private final Map<String, List<MedicalHistoryRecord>> medicalHistory = Map.of(
            "patient-1", List.of(
                    new MedicalHistoryRecord("mh-1", "Mild asthma", "Diagnosed 2015; rescue inhaler as needed.", true),
                    new MedicalHistoryRecord("mh-2", "Penicillin allergy", "Skin reaction recorded in 2018.", true)),
            "dep-emilia", List.of(
                    new MedicalHistoryRecord("mh-e1", "Atopic dermatitis", "Controlled with moisturiser.", true)),
            "dep-ineligible", List.of());

    private final Map<String, ConsentRecord> consents = new LinkedHashMap<>();
    private final Map<String, Appointment> appointments = new ConcurrentHashMap<>();

    public BookingData() {
        consents.put("platform-tc", new ConsentRecord("platform-tc",
                "Platform terms & conditions", "Required to use the telemedicine service.", true));
        consents.put("clinical-informed", new ConsentRecord("clinical-informed",
                "Clinical informed consent", "You agree to receive care via video consultation.", true));
        consents.put("data-sharing", new ConsentRecord("data-sharing",
                "Share data for this episode", "Share your symptoms and history with the treating doctor.", true));
        seedPastAppointments();
    }

    /** Seed one completed and one cancelled past appointment so P-20 has data without a live booking. */
    private void seedPastAppointments() {
        Instant now = Instant.now();
        Doctor dFuentes = doctors.get(0);
        Doctor dRivas = doctors.get(2);
        Slot past1 = new Slot("seed-completed-slot",
                now.minus(14, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS).toString(), "video");
        Slot past2 = new Slot("seed-cancelled-slot",
                now.minus(30, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS).toString(), "video");
        Appointment completed = new Appointment("TM-PAST01", "completed", "patient-1", dFuentes, past1,
                "video", "Follow-up on asthma symptoms", dFuentes.priceClp(),
                now.minus(14, ChronoUnit.DAYS).toString());
        Appointment cancelled = new Appointment("TM-PAST02", "cancelled", "patient-1", dRivas, past2,
                "video", "Skin rash review", dRivas.priceClp(),
                now.minus(30, ChronoUnit.DAYS).toString());
        appointments.put(completed.getReference(), completed);
        appointments.put(cancelled.getReference(), cancelled);
    }

    /** Look up a single appointment by its reference. */
    public Optional<Appointment> getAppointment(String reference) {
        if (reference == null) return Optional.empty();
        return Optional.ofNullable(appointments.get(reference));
    }

    public List<Dependent> dependents() { return dependents; }

    public List<MedicalHistoryRecord> medicalHistory(String id) {
        return medicalHistory.getOrDefault(id, List.of());
    }

    public List<SymptomChip> extractSymptoms(String text) {
        String t = text == null ? "" : text.toLowerCase();
        List<SymptomChip> hits = new ArrayList<>();
        for (SymptomChip s : symptomLibrary) {
            String first = s.label().toLowerCase().split(" ")[0];
            if (t.contains(first)) hits.add(s);
        }
        if (hits.isEmpty()) return symptomLibrary.subList(0, 2);
        return hits.size() > 15 ? hits.subList(0, 15) : hits;
    }

    public boolean hasRedFlag(String text) {
        String t = text == null ? "" : text.toLowerCase();
        return redFlags.stream().anyMatch(t::contains);
    }

    public List<Doctor> listDoctors(String specialty, String sort) {
        List<Doctor> result = new ArrayList<>(doctors);
        if (specialty != null && !specialty.isBlank() && !specialty.equals("all")) {
            result.removeIf(d -> !d.specialty().equals(specialty));
        }
        if ("rating".equals(sort)) {
            result.sort(Comparator.comparingDouble(Doctor::rating).reversed());
        } else if ("price".equals(sort)) {
            result.sort(Comparator.comparingInt(Doctor::priceClp));
        } else if ("availability".equals(sort)) {
            result.sort(Comparator.comparing(d -> !"Today".equals(d.nextAvailability())));
        }
        return result;
    }

    public Optional<Doctor> getDoctor(String id) {
        return doctors.stream().filter(d -> d.id().equals(id)).findFirst();
    }

    public List<String> specialties() {
        return doctors.stream().map(Doctor::specialty).distinct().toList();
    }

    public List<Slot> slots(String doctorId) {
        Map<String, int[]> offsets = Map.of(
                "doc-fuentes", new int[]{2, 3, 5, 26, 28},
                "doc-munoz", new int[]{27, 29, 31, 50},
                "doc-rivas", new int[]{1, 4, 6, 24},
                "doc-soto", new int[]{2, 4, 48, 52});
        int[] hrs = offsets.getOrDefault(doctorId, new int[]{2, 24, 48});
        Instant base = Instant.now().truncatedTo(ChronoUnit.HOURS);
        List<Slot> result = new ArrayList<>();
        for (int i = 0; i < hrs.length; i++) {
            result.add(new Slot(doctorId + "-s" + (i + 1),
                    base.plus(hrs[i], ChronoUnit.HOURS).toString(), "video"));
        }
        return result;
    }

    public List<ConsentRecord> consents() { return new ArrayList<>(consents.values()); }

    public Optional<ConsentRecord> setConsent(String id, boolean granted) {
        ConsentRecord c = consents.get(id);
        if (c == null) return Optional.empty();
        c.setGranted(granted);
        return Optional.of(c);
    }

    public Appointment createAppointment(String careSubjectId, Doctor doctor, Slot slot,
                                         String mode, String reason, Integer feeClp) {
        String reference;
        do {
            reference = randomRef();
        } while (appointments.containsKey(reference));
        Appointment appt = new Appointment(reference, "confirmed", careSubjectId, doctor, slot,
                mode != null ? mode : slot.mode(), reason, feeClp, Instant.now().toString());
        appointments.put(reference, appt);
        return appt;
    }

    public List<Appointment> listAppointments(String statusFilter) {
        List<Appointment> all = new ArrayList<>(appointments.values());
        if (statusFilter != null && !statusFilter.isBlank()) {
            all.removeIf(a -> !a.getStatus().equals(statusFilter));
        }
        return all;
    }

    public Optional<Appointment> cancelAppointment(String reference) {
        Appointment a = appointments.get(reference);
        if (a == null) return Optional.empty();
        a.setStatus("cancelled");
        return Optional.of(a);
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