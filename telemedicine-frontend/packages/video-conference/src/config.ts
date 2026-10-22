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
  return { apiBase, wsUrl, iceServers: override?.iceServers ?? resolveIceServers() };
}

/**
 * ICE servers for NAT traversal so a call connects across different networks, not just a shared
 * LAN. STUN (public Google servers by default) lets peers discover a direct path; a TURN relay
 * (set VITE_TURN_URL, with optional VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL) is the fallback for
 * symmetric NAT / restrictive firewalls where a direct path is impossible. VITE_TURN_URL and
 * VITE_STUN_URL may each be a comma-separated list.
 */
export function resolveIceServers(): RTCIceServer[] {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const servers: RTCIceServer[] = [];

  if (env.VITE_STUN_URL) {
    servers.push({ urls: env.VITE_STUN_URL.split(",").map((s) => s.trim()).filter(Boolean) });
  } else {
    servers.push({ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] });
  }

  if (env.VITE_TURN_URL) {
    const turn: RTCIceServer = {
      urls: env.VITE_TURN_URL.split(",").map((s) => s.trim()).filter(Boolean),
    };
    if (env.VITE_TURN_USERNAME) turn.username = env.VITE_TURN_USERNAME;
    if (env.VITE_TURN_CREDENTIAL) turn.credential = env.VITE_TURN_CREDENTIAL;
    servers.push(turn);
  }
  return servers;
}