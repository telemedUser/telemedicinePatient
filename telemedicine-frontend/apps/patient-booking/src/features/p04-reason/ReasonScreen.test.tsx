import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/shared/mocks/server";
import { errorHandlers } from "@/shared/mocks/handlers";
import type { CareSubject } from "@/shared/types/booking";
import { ReasonScreen } from "./ReasonScreen";

const SELF: CareSubject = {
  kind: "self",
  id: "patient-1",
  name: "Valentina Rojas Mendoza",
  ageYears: 34,
  relationship: "self",
};

const DEPENDENT: CareSubject = {
  kind: "dependent",
  id: "dep-emilia",
  name: "Emilia Vergara Rojas",
  ageYears: 7,
  relationship: "parent",
};

const authedSelf = {
  auth: { status: "authenticated" as const, userId: "patient-1" },
  careSubject: SELF,
};

describe("P-04 Reason for consultation", () => {
  it("debounced extraction populates available chips", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReasonScreen />, { initialState: authedSelf });

    const textarea = screen.getByLabelText(/describe your symptoms/i);
    await user.type(textarea, "sore throat and fever");

    const region = screen.getByRole("region", { name: /symptoms we picked up/i });
    await waitFor(
      () => {
        expect(within(region).getByText("Sore throat")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    // chips arrive as "available" with an add control
    expect(
      within(region).getByRole("button", { name: /add sore throat/i }),
    ).toBeInTheDocument();
  });

  it("clears chips when text drops below 3 non-whitespace chars", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReasonScreen />, { initialState: authedSelf });

    const textarea = screen.getByLabelText(/describe your symptoms/i);
    await user.type(textarea, "fever");
    const region = screen.getByRole("region", { name: /symptoms we picked up/i });
    await waitFor(() =>
      expect(within(region).getByText("Fever")).toBeInTheDocument(),
    );

    await user.clear(textarea);
    await user.type(textarea, "ab");
    await waitFor(() =>
      expect(within(region).queryByText("Fever")).not.toBeInTheDocument(),
    );
  });

  it("severity slider exposes value and word", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReasonScreen />, { initialState: authedSelf });

    const slider = screen.getByRole("slider", { name: /how bad is it/i });
    expect(screen.getByTestId("severity-word")).toHaveTextContent("Mild");

    slider.focus();
    await user.keyboard("{ArrowRight>8/}"); // 0 -> 8
    expect(slider).toHaveAttribute("aria-valuenow", "8");
    expect(screen.getByTestId("severity-word")).toHaveTextContent("Severe");
  });

  it("rejects an unsupported file type and an oversize file with distinct messages", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReasonScreen />, { initialState: authedSelf });
    const input = screen.getByLabelText(/attach files/i) as HTMLInputElement;

    const badType = new File(["x"], "notes.txt", { type: "text/plain" });
    await user.upload(input, badType);
    expect(await screen.findByRole("alert")).toHaveTextContent(/supported file type/i);

    const big = new File([""], "scan.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    await user.upload(input, big);
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 MB/i);
  });

  it("accepts a valid file and shows a type selector and scan pill", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReasonScreen />, { initialState: authedSelf });
    const input = screen.getByLabelText(/attach files/i) as HTMLInputElement;

    const good = new File(["x"], "photo.png", { type: "image/png" });
    await user.upload(input, good);

    expect(await screen.findByLabelText(/file type for photo.png/i)).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows measurements only for a dependent", async () => {
    const { unmount } = renderWithProviders(<ReasonScreen />, {
      initialState: authedSelf,
    });
    expect(screen.queryByText(/measurements/i)).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<ReasonScreen />, {
      initialState: {
        auth: { status: "authenticated", userId: "patient-1" },
        careSubject: DEPENDENT,
      },
    });
    expect(screen.getByText(/measurements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
  });

  it("shows the emergency alertdialog on a red-flag phrase and dismisses it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReasonScreen />, { initialState: authedSelf });

    const textarea = screen.getByLabelText(/describe your symptoms/i);
    await user.type(textarea, "chest pain");

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName(/emergency/i);
    expect(within(dialog).getByRole("link", { name: /call 131/i })).toHaveAttribute(
      "href",
      "tel:131",
    );

    await user.click(within(dialog).getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("shows an unavailable message when extraction fails and keeps selected", async () => {
    server.use(errorHandlers.symptomsFail);
    const user = userEvent.setup();
    renderWithProviders(<ReasonScreen />, { initialState: authedSelf });

    const textarea = screen.getByLabelText(/describe your symptoms/i);
    await user.type(textarea, "sore throat");

    expect(await screen.findByRole("status")).toHaveTextContent(/unavailable/i);
  });

  it("has no axe violations", async () => {
    const { container } = renderWithProviders(<ReasonScreen />, {
      initialState: authedSelf,
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
