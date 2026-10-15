import type { WizardStep } from "@/shared/types/booking";

export interface Credentials { email: string; password: string; }

export interface AuthUser { userId: string; }

export interface AuthResult {
  ok: boolean;
  hasRecord: boolean;
  userId: string | null;
}

export interface AuthApi {
  signIn(credentials: Credentials): Promise<AuthResult>;
  signInWithClaveUnica(): Promise<AuthResult>;
  signOut(): void;
  getUser(): AuthUser | null;
  isAuthenticated(): boolean;
}

export interface ObservabilityApi {
  reportError(error: unknown, context?: Record<string, unknown>): void;
  mark(step: WizardStep): void;
}
