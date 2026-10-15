import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./AppProviders";
import { BookingRoutes } from "./routes";

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <BookingRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
