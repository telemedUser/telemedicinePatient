// Doctors + slots seed data and pure query helpers (in-memory).

export const DOCTORS = [
  {
    id: "doc-fuentes",
    name: "Dr. Andrés Fuentes Silva",
    specialty: "General Physician",
    rating: 4.8,
    reviews: 212,
    nextAvailability: "Today",
    mode: "video",
    priceClp: 18000,
    languages: ["es", "en"],
    bio: "General physician at Clínica Santiago with 12 years of experience in primary and acute care.",
  },
  {
    id: "doc-munoz",
    name: "Dra. Carolina Muñoz Reyes",
    specialty: "General Physician",
    rating: 4.6,
    reviews: 158,
    nextAvailability: "Tomorrow",
    mode: "video",
    priceClp: 16000,
    languages: ["es"],
    bio: "Family medicine specialist focused on respiratory and ENT conditions.",
  },
  {
    id: "doc-rivas",
    name: "Dr. Felipe Rivas Castro",
    specialty: "Dermatology",
    rating: 4.9,
    reviews: 301,
    nextAvailability: "Today",
    mode: "video",
    priceClp: 25000,
    languages: ["es", "en"],
    bio: "Dermatologist specialising in skin lesions, acne and allergic reactions.",
  },
  {
    id: "doc-soto",
    name: "Dra. Paula Soto Herrera",
    specialty: "Pediatrics",
    rating: 4.7,
    reviews: 189,
    nextAvailability: "Today",
    mode: "video",
    priceClp: 20000,
    languages: ["es"],
    bio: "Pediatrician with a focus on children's acute illness and preventive care.",
  },
];

function slotsFor(doctorId) {
  // Deterministic slots relative to "now" so the demo always has availability.
  const base = new Date();
  base.setMinutes(0, 0, 0);
  const offsets = {
    "doc-fuentes": [2, 3, 5, 26, 28],
    "doc-munoz": [27, 29, 31, 50],
    "doc-rivas": [1, 4, 6, 24],
    "doc-soto": [2, 4, 48, 52],
  };
  const hrs = offsets[doctorId] ?? [2, 24, 48];
  return hrs.map((h, i) => {
    const d = new Date(base.getTime() + h * 60 * 60 * 1000);
    return { id: `${doctorId}-s${i + 1}`, startsAt: d.toISOString(), mode: "video" };
  });
}

export const SLOTS = Object.fromEntries(DOCTORS.map((d) => [d.id, slotsFor(d.id)]));

export function listDoctors({ specialty, sort } = {}) {
  let result = [...DOCTORS];
  if (specialty && specialty !== "all") {
    result = result.filter((d) => d.specialty === specialty);
  }
  switch (sort) {
    case "rating":
      result.sort((a, b) => b.rating - a.rating);
      break;
    case "price":
      result.sort((a, b) => a.priceClp - b.priceClp);
      break;
    case "availability":
      result.sort((a, b) => (a.nextAvailability === "Today" ? -1 : 1) - (b.nextAvailability === "Today" ? -1 : 1));
      break;
    default:
      break;
  }
  return result;
}

export function getDoctor(id) {
  return DOCTORS.find((d) => d.id === id) ?? null;
}

export function getSlots(doctorId) {
  return SLOTS[doctorId] ?? null;
}

export const SPECIALTIES = [...new Set(DOCTORS.map((d) => d.specialty))];