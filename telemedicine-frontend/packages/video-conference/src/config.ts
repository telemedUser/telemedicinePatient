import type { VideoConfig } from "./types";

/**
 * Resolve the CareConnect backend config. Apps can override via Vite env
 * (VITE_VIDEO_API_BASE / VITE_VIDEO_WS_URL) or by passing a VideoConfig prop.
 * Defaults target the CareConnect signaling backend on port 8130.
 */
export function resolveVideoConfig(override?: Partial<VideoConfig>): VideoConfig {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const apiBase = override?.apiBase ?? env.VITE_VIDEO_API_BASE ?? `http://${host}:8130`;
  const wsUrl = override?.wsUrl ?? env.VITE_VIDEO_WS_URL ?? `ws://${host}:8130/ws`;
  return { apiBase, wsUrl };
}