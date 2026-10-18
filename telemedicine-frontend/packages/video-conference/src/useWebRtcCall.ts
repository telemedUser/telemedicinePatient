import { useEffect, useRef, useState } from "react";
import type { CallRole } from "./types";

export interface UseWebRtcCallOptions {
  roomId: string;
  role: CallRole;
  wsUrl: string;
  /** Optional ICE servers (STUN/TURN). Empty by default for LAN-only. */
  iceServers?: RTCIceServer[];
  onCallStateChange?: (connected: boolean) => void;
}

export interface WebRtcCallState {
  localRef: React.RefObject<HTMLVideoElement>;
  remoteRef: React.RefObject<HTMLVideoElement>;
  status: string;
  joined: boolean;
  micOn: boolean;
  cameraOn: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  endCall: () => void;
}

/**
 * One-to-one WebRTC call over a WebSocket signaling relay, extracted from the
 * CareConnect VideoCall component. The doctor creates the offer; the patient
 * answers. Signaling messages are keyed by roomId so a patient and physician
 * joining the same room connect to each other.
 */
export function useWebRtcCall(opts: UseWebRtcCallOptions): WebRtcCallState {
  const { roomId, role, wsUrl, iceServers = [], onCallStateChange } = opts;

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [status, setStatus] = useState("Connecting signaling…");
  const [joined, setJoined] = useState(false);

  const send = (obj: Record<string, unknown> & { type: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ roomId, ...obj }));
    }
  };

  useEffect(() => {
    let alive = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (e) => {
          if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
          setStatus("Media connected");
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) send({ type: "ice", candidate: e.candidate });
        };
        pc.onconnectionstatechange = () => {
          const connected = pc.connectionState === "connected";
          setStatus(connected ? "Connected" : `Call: ${pc.connectionState}`);
          onCallStateChange?.(connected);
        };

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
          send({ type: "join", role });
          setJoined(true);
          setStatus("Waiting for other participant…");
        };
        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "chat") return;
          try {
            if (msg.type === "peer-joined" && role === "doctor" && !pc.remoteDescription) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              send({ type: "offer", sdp: offer });
            } else if (msg.type === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              for (const c of pendingCandidates.current) await pc.addIceCandidate(c);
              pendingCandidates.current = [];
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              send({ type: "answer", sdp: answer });
            } else if (msg.type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              for (const c of pendingCandidates.current) await pc.addIceCandidate(c);
              pendingCandidates.current = [];
            } else if (msg.type === "ice" && msg.candidate) {
              const c = new RTCIceCandidate(msg.candidate);
              if (pc.remoteDescription) await pc.addIceCandidate(c);
              else pendingCandidates.current.push(c);
            }
          } catch (err) {
            setStatus("Call setup error: " + (err as Error).message);
          }
        };
        ws.onerror = () => setStatus("Signaling connection failed");
      } catch (err) {
        setStatus(`Camera/microphone unavailable: ${(err as Error).message}. Use HTTPS or localhost and allow permissions.`);
      }
    };

    void start();

    return () => {
      alive = false;
      wsRef.current?.close();
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCallStateChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, role, wsUrl]);

  const toggle = (kind: "audio" | "video") => {
    const track = streamRef.current?.getTracks().find((t) => t.kind === kind);
    if (track) track.enabled = !track.enabled;
    if (kind === "audio") setMicOn(Boolean(track?.enabled));
    else setCameraOn(Boolean(track?.enabled));
  };

  const endCall = () => {
    wsRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus("Call ended");
    setJoined(false);
    onCallStateChange?.(false);
  };

  return {
    localRef, remoteRef, status, joined, micOn, cameraOn,
    toggleMic: () => toggle("audio"),
    toggleCamera: () => toggle("video"),
    endCall,
  };
}