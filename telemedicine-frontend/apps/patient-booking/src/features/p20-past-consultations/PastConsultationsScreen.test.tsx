import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/shared/mocks/server";
import { resetMockStores } from "@/shared/mocks/handlers";
import { http, HttpResponse, delay } from "msw";
import { PastConsultationsScreen } from "./PastConsultationsScreen";

const authed = { auth: { status: "authenticated" as const, userId: "patient-1" } };

describe("P-20 Past consultations", () => {
  beforeEach(() => resetMockStores());

  it("renders seeded completed and cancelled appointments as selectable rows", async () => {
    renderWithProviders(<PastConsultationsScreen />, { initialState: authed });
    expect(await screen.findByText(/Dr\. Andres Fuentes Silva/i)).toBeInTheDocument();
    expect(await screen.findByText(/Dr\. Felipe Rivas Castro/i)).toBeInTheDocument();
    // statuses shown
    expect(screen.getByText(/^completed$/i)).toBeInTheDocument();
    expect(screen.getByText(/^cancelled$/i)).toBeInTheDocument();
  });

  it("opens a detail panel when a row is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PastConsultationsScreen />, { initialState: authed });
    const row = await screen.findByText(/Dr\. Andres Fuentes Silva/i);
    await user.click(row);
    const detail = await screen.findByRole("complementary", { name: /consultation detail/i });
    expect(detail).toHaveTextContent(/TM-PAST01/);
    expect(detail).toHaveTextContent(/completed/i);
  });

  it("shows an empty-state message when there are no past consultations", async () => {
    server.use(
      http.get("/api/appointments", () => HttpResponse.json({ appointments: [] })),
    );
    renderWithProviders(<PastConsultationsScreen />, { initialState: authed });
    expect(await screen.findByText(/no past consultations on file/i)).toBeInTheDocument();
  });

  it("shows an error with a retry that refetches", async () => {
    server.use(
      http.get("/api/appointments", async () => { await delay(5); return new HttpResponse(null, { status: 500 }); }),
    );
    renderWithProviders(<PastConsultationsScreen />, { initialState: authed });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not load/i);
    resetMockStores();
    server.resetHandlers();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText(/Dr\. Andres Fuentes Silva/i)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<PastConsultationsScreen />, { initialState: authed });
    await screen.findByText(/Dr\. Andres Fuentes Silva/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});