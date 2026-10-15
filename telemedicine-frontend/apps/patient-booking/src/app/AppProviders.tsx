import { Component, type ErrorInfo, type ReactNode } from "react";
import { I18nProvider } from "@/shared/i18n/i18n";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { BookingProvider } from "@/shared/state/BookingProvider";
import { observability } from "@/shared/platform";
import type { BookingState } from "@/shared/types/booking";

class ObservabilityBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    observability.reportError(error, { componentStack: info.componentStack });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24 }}>
          <h1 className="pb-h1">Something went wrong</h1>
          <p>Please reload the page to continue.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppProviders({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: BookingState;
}) {
  return (
    <ObservabilityBoundary>
      <I18nProvider locale="en">
        <ThemeProvider>
          <BookingProvider initial={initialState}>{children}</BookingProvider>
        </ThemeProvider>
      </I18nProvider>
    </ObservabilityBoundary>
  );
}
