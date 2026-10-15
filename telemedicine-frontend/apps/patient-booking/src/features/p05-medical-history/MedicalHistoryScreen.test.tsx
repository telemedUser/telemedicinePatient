import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/shared/mocks/server";
import { errorHandlers } from "@/shared/mocks/handlers";
import type { CareSubject } from "@/shared/types/booking";
import { MedicalHistoryScreen } from "./MedicalHistoryScreen";

const SELF: CareSubject = {
  kind: "self",
  id: "patient-1",
  name: "Valentina Rojas Mendoza",
  ageYears: 34,
  relationship: "self",
};

const authedSelf = {
  auth: { status: "authenticated" as const, userId: "patient-1" },
  careSubject: SELF,
};

describe("P-05 Confirm medical history", () => {
  it("loads and renders records as reviewable rows", async () => {
    renderWithProviders(<MedicalHistoryScreen />, { initialState: authedSelf });

    expect(await screen.findByText(/Asma leve/i)).toBeInTheDocument();
    const checkboxes = await screen.findAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the empty-history message when there are no records", async () => {
    server.use(errorHandlers.historyEmpty);
    renderWithProviders(<MedicalHistoryScreen />, { initialState: authedSelf });

    expect(await screen.findByText(/no medical history records/i)).toBeInTheDocument();
  });

  it("shows an error with a retry that refetches", async () => {
    server.use(errorHandlers.historyFail);
    renderWithProviders(<MedicalHistoryScreen />, { initialState: authedSelf });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't load/i);

    // restore healthy handlers, then retry
    server.resetHandlers();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText(/Asma leve/i)).toBeInTheDocument();
  });

  it("toggles a record's share control and reflects aria-checked", async () => {
    renderWithProviders(<MedicalHistoryScreen />, { initialState: authedSelf });
    await screen.findByText(/Asma leve/i);

    const toggle = screen.getByRole("checkbox", { name: /share Asma leve/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("saves an inline correction and displays it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MedicalHistoryScreen />, { initialState: authedSelf });
    await screen.findByText(/Asma leve/i);

    await user.click(screen.getAllByRole("button", { name: /add a correction/i })[0]);
    const input = screen.getByLabelText(/correction for Asma leve/i);
    await user.type(input, "DiagnÃ³stico actualizado en 2022");
    await user.click(screen.getByRole("button", { name: /save correction/i }));

    expect(screen.getByTestId("correction-mh-1")).toHaveTextContent(/2022/);
  });

  it("keeps confirm disabled until the request resolves, then enables it", async () => {
    renderWithProviders(<MedicalHistoryScreen />, { initialState: authedSelf });

    const confirm = screen.getByRole("button", { name: /confirm and continue/i });
    expect(confirm).toBeDisabled();

    await screen.findByText(/Asma leve/i);
    await waitFor(() => expect(confirm).toBeEnabled());
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<MedicalHistoryScreen />, {
      initialState: authedSelf,
    });
    await screen.findByText(/Asma leve/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

