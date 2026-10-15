import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { CareSubject } from "@/shared/types/booking";
import { AuthorityAttestationScreen } from "./AuthorityAttestationScreen";

const DEPENDENT: CareSubject = {
  kind: "dependent",
  id: "dep-emilia",
  name: "Emilia Vergara Rojas",
  ageYears: 7,
  relationship: "parent",
};

const authedDependent = {
  auth: { status: "authenticated" as const, userId: "patient-1" },
  careSubject: DEPENDENT,
};

describe("P-27 Confirm your authority", () => {
  it("shows the dependent name and acting relationship", async () => {
    renderWithProviders(<AuthorityAttestationScreen />, { initialState: authedDependent });
    expect(screen.getAllByText(/Emilia Vergara Rojas/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/parent/i).length).toBeGreaterThan(0);
  });

  it("blocks Continue and shows a message when the attestation is unchecked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthorityAttestationScreen />, { initialState: authedDependent });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/must confirm your authority/i);
  });

  it("allows Continue once the attestation checkbox is checked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthorityAttestationScreen />, { initialState: authedDependent });
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    // required message should NOT appear after a valid continue
    expect(screen.queryByText(/must confirm your authority/i)).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<AuthorityAttestationScreen />, { initialState: authedDependent });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});