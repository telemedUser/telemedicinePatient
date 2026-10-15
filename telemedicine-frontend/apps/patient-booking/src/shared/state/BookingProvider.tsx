import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createInitialBookingState,
  type BookingState,
} from "@/shared/types/booking";
import { loadState, saveState, clearState } from "./persistence";

export interface BookingContextValue {
  state: BookingState;
  update: (patch: Partial<BookingState>) => void;
  updateHistory: (patch: Partial<BookingState["history"]>) => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: BookingState;
}) {
  const [state, setState] = useState<BookingState>(
    () => initial ?? loadState(),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback((next: BookingState) => {
    stateRef.current = next;
    setState(next);
    saveState(next);
  }, []);

  const update = useCallback(
    (patch: Partial<BookingState>) => {
      commit({ ...stateRef.current, ...patch });
    },
    [commit],
  );

  const updateHistory = useCallback(
    (patch: Partial<BookingState["history"]>) => {
      const cur = stateRef.current;
      commit({ ...cur, history: { ...cur.history, ...patch } });
    },
    [commit],
  );

  const reset = useCallback(() => {
    clearState();
    commit(createInitialBookingState());
  }, [commit]);

  const value = useMemo<BookingContextValue>(
    () => ({ state, update, updateHistory, reset }),
    [state, update, updateHistory, reset],
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
