// In-memory appointment store with TM-XXXXXX reference generator.

const appointments = new Map();

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomRef() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `TM-${s}`;
}

export function createAppointment({ careSubjectId, doctor, slot, mode, reason, feeClp }) {
  let reference = randomRef();
  while (appointments.has(reference)) reference = randomRef();
  const appointment = {
    reference,
    status: "confirmed",
    careSubjectId: careSubjectId ?? null,
    doctor,
    slot,
    mode: mode ?? slot?.mode ?? "video",
    reason: reason ?? null,
    feeClp: feeClp ?? null,
    createdAt: new Date().toISOString(),
  };
  appointments.set(reference, appointment);
  return appointment;
}

export function getAppointment(reference) {
  return appointments.get(reference) ?? null;
}

export function listAppointments(statusFilter) {
  const all = [...appointments.values()];
  if (statusFilter) return all.filter((a) => a.status === statusFilter);
  return all;
}

export function cancelAppointment(reference) {
  const appt = appointments.get(reference);
  if (!appt) return null;
  appt.status = "cancelled";
  appointments.set(reference, appt);
  return appt;
}