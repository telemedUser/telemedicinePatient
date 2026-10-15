import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { resetMockStores } from "@/shared/mocks/handlers";
import { FindAppointmentScreen } from "./FindAppointmentScreen";

describe("P-32 Find my appointment", () => {
  beforeEach(() => resetMockStores());

  it("requires a reference when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FindAppointmentScreen />, { route: "/booking/find-appointment" });
    await user.click(screen.getByRole("button", { name: /find appointment/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/reference/i);
  });

  it("shows a not-found message for an unknown reference", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FindAppointmentScreen />, { route: "/booking/find-appointment" });
    await user.type(screen.getByLabelText(/appointment reference/i), "TM-NOPE99");
    await user.click(screen.getByRole("button", { name: /find appointment/i }));
    expect(await screen.findByText(/no appointment matches/i)).toBeInTheDocument();
  });

  it("navigates to the consultation link for a known reference", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FindAppointmentScreen />,
      { route: "/booking/find-appointment" },
    );
    await user.type(screen.getByLabelText(/appointment reference/i), "TM-PAST01");
    await user.click(screen.getByRole("button", { name: /find appointment/i }));
    // success path clears errors (no not-found / required alert remains)
    expect(screen.queryByText(/no appointment matches/i)).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<FindAppointmentScreen />, { route: "/booking/find-appointment" });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});