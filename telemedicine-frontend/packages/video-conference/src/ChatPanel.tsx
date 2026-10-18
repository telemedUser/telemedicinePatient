import { useState } from "react";
import { Send } from "lucide-react";
import type { CallRole } from "./types";
import { useChat } from "./useChat";

export interface ChatPanelProps { roomId: string; role: CallRole; wsUrl: string; }

/** Ready-to-use shared chat panel used by both the patient and physician apps. */
export function ChatPanel({ roomId, role, wsUrl }: ChatPanelProps) {
  const { messages, send } = useChat(roomId, role, wsUrl);
  const [text, setText] = useState("");
  const submit = () => { send(text); setText(""); };
  return (
    <div className="vc-chat">
      <div className="vc-messages">
        {messages.map((m, i) => (
          <div key={i} className={`vc-bubble ${m.role === role ? "mine" : ""}`}>
            <small>{m.role === "doctor" ? "Doctor" : m.role === "patient" ? "Patient" : m.role}</small>
            <div>{m.text}</div>
            <time>{new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
          </div>
        ))}
      </div>
      <div className="vc-compose">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type a message…"
        />
        <button onClick={submit} aria-label="Send message"><Send size={18} /></button>
      </div>
    </div>
  );
}