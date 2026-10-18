import { useEffect, useRef, useState } from "react";
import type { CallRole } from "./types";

export interface ChatMessage {
  type: "chat";
  roomId: string;
  role: CallRole;
  text: string;
  sentAt: string;
}

/** Shared chat over a dedicated signaling channel (roomId + ":chat") so chat
 *  messages never mix with WebRTC call signaling. */
export function useChat(roomId: string, role: CallRole, wsUrl: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const channelRoom = `${roomId}:chat`;

  useEffect(() => {
    const s = new WebSocket(wsUrl);
    wsRef.current = s;
    s.onopen = () => s.send(JSON.stringify({ type: "join", roomId: channelRoom, role }));
    s.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.type === "chat") setMessages((prev) => [...prev, m]);
      } catch { /* ignore malformed */ }
    };
    return () => s.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelRoom, role, wsUrl]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const m: ChatMessage = { type: "chat", roomId: channelRoom, role, text: t, sentAt: new Date().toISOString() };
    wsRef.current.send(JSON.stringify(m));
    setMessages((prev) => [...prev, m]);
  };

  return { messages, send };
}