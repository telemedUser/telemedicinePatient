import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ConsultationDayStub } from "./ConsultationDayStub";

const authed = { auth: { status: "authenticated" as const, userId: "patient-1" } };

describe("Consultation-day stub", () => {
  it("renders the clinical-team placeholder statement", () => {
    renderWithProviders(<ConsultationDayStub />, { initialState: authed, route: "/booking/consultation-day" });
    expect(screen.getByText(/delivered by the clinical team/i)).toBeInTheDocument();
    expect(screen.getByText(/integration with that journey is pending/i)).toBeInTheDocument();
  });

  it("shows the P-14 to P-22 integration-seam marker", () => {
    const { container } = renderWithProviders(<ConsultationDayStub />, { initialState: authed, route: "/booking/consultation-day" });
    expect(screen.getByText(/P-14 through P-22/i)).toBeInTheDocument();
    expect(container.querySelector('[data-integration-seam="P-14..P-22"]')).not.toBeNull();
  });

  it("provides an onward action back to My care", () => {
    renderWithProviders(<ConsultationDayStub />, { initialState: authed, route: "/booking/consultation-day" });
    expect(screen.getByRole("button", { name: /back to my care/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<ConsultationDayStub />, { initialState: authed, route: "/booking/consultation-day" });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});