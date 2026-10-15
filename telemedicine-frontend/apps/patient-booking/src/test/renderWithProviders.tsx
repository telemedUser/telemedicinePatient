import type { ReactElement, ReactNode } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/shared/i18n/i18n";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { BookingProvider } from "@/shared/state/BookingProvider";
import {
  createInitialBookingState,
  type BookingState,
} from "@/shared/types/booking";

export interface RenderOptions {
  initialState?: Partial<BookingState>;
  route?: string;
}

/**
 * Render a screen inside the full provider tree (I18n -> Theme -> Booking)
 * and a MemoryRouter, mirroring AppProviders without the error boundary so
 * assertions surface real failures.
 */
export function renderWithProviders(
  ui: ReactElement,
  { initialState, route = "/booking/front-door" }: RenderOptions = {},
): RenderResult {
  const initial: BookingState = {
    ...createInitialBookingState(),
    ...initialState,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider locale="en">
        <ThemeProvider>
          <BookingProvider initial={initial}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </BookingProvider>
        </ThemeProvider>
      </I18nProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
