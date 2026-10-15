import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/shared/mocks/server";
import { resetMockStores } from "@/shared/mocks/handlers";
import { http, HttpResponse, delay } from "msw";
import { WithdrawConsentScreen } from "./WithdrawConsentScreen";

const authed = { auth: { status: "authenticated" as const, userId: "patient-1" } };
const route = "/booking/withdraw-consent?id=data-sharing";

describe("P-38 Withdraw a consent", () => {
  beforeEach(() => resetMockStores());

  it("shows the target consent label and the immutable-audit note", async () => {
    renderWithProviders(<WithdrawConsentScreen />, { initialState: authed, route });
    expect(await screen.findByText(/Share data for this episode/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be removed from the audit history/i)).toBeInTheDocument();
  });

  it("withdraws on confirm and reflects the withdrawn state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WithdrawConsentScreen />, { initialState: authed, route });
    await screen.findByText(/Share data for this episode/i);
    await user.click(screen.getByRole("button", { name: /yes, withdraw consent/i }));
    expect(await screen.findByText(/this consent has been withdrawn/i)).toBeInTheDocument();
  });

  it("keeps prior state and shows an error when the request fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.patch("/api/consents/:id", async () => { await delay(5); return new HttpResponse(null, { status: 500 }); }),
    );
    renderWithProviders(<WithdrawConsentScreen />, { initialState: authed, route });
    await screen.findByText(/Share data for this episode/i);
    await user.click(screen.getByRole("button", { name: /yes, withdraw consent/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not withdraw/i);
    expect(screen.queryByText(/this consent has been withdrawn/i)).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<WithdrawConsentScreen />, { initialState: authed, route });
    await screen.findByText(/Share data for this episode/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});