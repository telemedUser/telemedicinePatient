import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { useWizard } from "@/shared/wizard/useWizard";
import { useStepMark } from "@/shared/components/useStepMark";
import type { CareSubject, Dependent } from "@/shared/types/booking";
import { CareSubjectCard, type CareSubjectOption } from "./CareSubjectCard";

interface PatientMe {
  id: string;
  name: string;
  ageYears: number;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function WhoNeedsCareScreen() {
  useStepMark("P-03");
  const { state, update } = useBooking();
  const { goNext, goBack } = useWizard();

  const [patient, setPatient] = useState<PatientMe | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    state.careSubject?.id ?? null,
  );
  const [showRequired, setShowRequired] = useState(false);

  useEffect(() => {
    void (async () => {
      const [me, deps] = await Promise.all([
        apiFetch("/patients/me").then((r) => r.json() as Promise<PatientMe>),
        apiFetch("/patients/me/dependents").then(
          (r) => r.json() as Promise<Dependent[]>,
        ),
      ]);
      setPatient(me);
      setDependents(deps);
    })();
  }, []);

  const options: CareSubjectOption[] = patient
    ? [
        {
          id: patient.id,
          title: "Myself",
          subtitle: `${patient.name} · ${patient.ageYears}`,
          initials: initials(patient.name),
          disabled: false,
        },
        ...dependents.map((d) => ({
          id: d.id,
          title: d.name,
          subtitle: d.eligible
            ? `${d.ageYears} · your ${d.relationship}`
            : `${d.ageYears} · not eligible for this service`,
          initials: initials(d.name),
          disabled: !d.eligible,
        })),
      ]
    : [];

  function select(id: string) {
    setSelectedId(id);
    setShowRequired(false);
    let subject: CareSubject | null = null;
    if (patient && id === patient.id) {
      subject = {
        kind: "self",
        id: patient.id,
        name: patient.name,
        ageYears: patient.ageYears,
        relationship: "self",
      };
    } else {
      const dep = dependents.find((d) => d.id === id);
      if (dep) {
        subject = {
          kind: "dependent",
          id: dep.id,
          name: dep.name,
          ageYears: dep.ageYears,
          relationship: dep.relationship,
        };
      }
    }
    update({ careSubject: subject });
  }

  function onContinue() {
    if (!state.careSubject) {
      setShowRequired(true);
      return;
    }
    goNext();
  }

  return (
    <section
      data-screen="P-03"
      style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px,5cqi,56px) 20px 48px" }}
    >
      <h1 className="pb-h1">Who needs care?</h1>
      <div role="radiogroup" aria-label="Who needs care?" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {options.map((o) => (
          <CareSubjectCard
            key={o.id}
            option={o}
            selected={selectedId === o.id}
            onSelect={select}
          />
        ))}
      </div>
      {showRequired && (
        <p role="alert" style={{ color: "var(--color-danger-text)", fontSize: 14, marginBottom: 12 }}>
          Please choose who needs care to continue.
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button type="button" className="pb-btn pb-btn-primary" onClick={onContinue} style={{ flex: "1 1 200px", minHeight: 52 }}>
          Continue
        </button>
        <button type="button" className="pb-btn" onClick={goBack} style={{ background: "transparent", color: "var(--color-primary)" }}>
          Back
        </button>
      </div>
    </section>
  );
}
