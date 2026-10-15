import type { AuthApi, AuthResult, AuthUser, Credentials } from "./types";
import { apiFetch } from "./apiClient";

// Tokens are held in memory ONLY (never localStorage/sessionStorage).
let accessToken: string | null = null;
let currentUser: AuthUser | null = null;

const DEV_MODE = import.meta.env.VITE_AUTH_MODE === "dev";

async function requestSignIn(path: string, body?: unknown): Promise<AuthResult> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    return { ok: false, hasRecord: false, userId: null };
  }
  const data = (await res.json()) as { userId: string; hasRecord: boolean };
  // Simulate an in-memory PKCE token exchange; token never leaves this module.
  accessToken = `in-memory-${data.userId}`;
  currentUser = { userId: data.userId };
  return { ok: true, hasRecord: data.hasRecord, userId: data.userId };
}

export const authApi: AuthApi = {
  async signIn(credentials: Credentials): Promise<AuthResult> {
    if (DEV_MODE && credentials.email === "" && credentials.password === "") {
      accessToken = "in-memory-dev";
      currentUser = { userId: "dev-user" };
      return { ok: true, hasRecord: true, userId: "dev-user" };
    }
    return requestSignIn("/auth/sign-in", credentials);
  },
  async signInWithClaveUnica(): Promise<AuthResult> {
    return requestSignIn("/auth/claveunica");
  },
  signOut(): void {
    accessToken = null;
    currentUser = null;
  },
  getUser(): AuthUser | null {
    return currentUser;
  },
  isAuthenticated(): boolean {
    return accessToken !== null;
  },
};

export function __resetAuthForTests(): void {
  accessToken = null;
  currentUser = null;
}
