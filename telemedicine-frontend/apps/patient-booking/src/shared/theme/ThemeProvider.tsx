import { useEffect, type ReactNode } from "react";
import "./tokens.css";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "patient");
  }, []);
  return <>{children}</>;
}
