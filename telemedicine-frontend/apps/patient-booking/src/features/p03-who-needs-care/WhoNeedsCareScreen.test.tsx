import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { WhoNeedsCareScreen } from "./WhoNeedsCareScreen";

const authed = {
  auth: { status: "authenticated" as const, userId: "patient-1" },
};

describe("P-03 Who needs care?", () => {
  it("renders a radiogroup with the patient and dependents", async () => {
    renderWithProviders(<WhoNeedsCareScreen />, { initialState: authed });

    const group = await screen.findByRole("radiogroup", {
      name: /who needs care/i,
    });
    const radios = await within(group).findAllByRole("radio");
    // patient + 2 dependents
    expect(radios).toHaveLength(3);
    expect(
      within(group).getByRole("radio", { name: /Valentina/i }),
    ).toBeInTheDocument();
  });

  it("renders ineligible dependents as disabled and prevents selection", async () => {
    renderWithProviders(<WhoNeedsCareScreen />, { initialState: authed });

    const ineligible = await screen.findByRole("radio", { name: /Tom\u00e1s/i });
    expect(ineligible).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(ineligible);
    expect(ineligible).toHaveAttribute("aria-checked", "false");
  });

  it("selects a care subject and reflects aria-checked", async () => {
    renderWithProviders(<WhoNeedsCareScreen />, { initialState: authed });

    const emilia = await screen.findByRole("radio", { name: /Emilia/i });
    await userEvent.click(emilia);
    expect(emilia).toHaveAttribute("aria-checked", "true");
  });

  it("shows a selection-required message when continuing with no selection", async () => {
    renderWithProviders(<WhoNeedsCareScreen />, { initialState: authed });

    await screen.findByRole("radiogroup");
    await userEvent.click(screen.getByRole("button", { name: /continuar|continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/choose who/i);
  });

  it("is keyboard operable (space selects a focused card)", async () => {
    renderWithProviders(<WhoNeedsCareScreen />, { initialState: authed });

    const patient = await screen.findByRole("radio", { name: /Valentina/i });
    patient.focus();
    await userEvent.keyboard(" ");
    expect(patient).toHaveAttribute("aria-checked", "true");
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<WhoNeedsCareScreen />, {
      initialState: authed,
    });
    await screen.findByRole("radiogroup");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

