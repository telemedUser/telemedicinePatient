import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import type { CallRole } from "./types";
import { useWebRtcCall } from "./useWebRtcCall";

export interface VideoCallProps {
  roomId: string;
  role: CallRole;
  wsUrl: string;
  iceServers?: RTCIceServer[];
  onCallStateChange?: (connected: boolean) => void;
}

/** Self-contained one-to-one video call UI. Patient and physician join the
 *  same roomId (the appointment reference) to connect to each other. */
export function VideoCall({ roomId, role, wsUrl, iceServers, onCallStateChange }: VideoCallProps) {
  const call = useWebRtcCall({ roomId, role, wsUrl, iceServers, onCallStateChange });
  return (
    <div className="vc-shell">
      <div className="vc-remote">
        <video ref={call.remoteRef} autoPlay playsInline />
        <div className="vc-placeholder">{call.status}</div>
        <div className="vc-local">
          <video ref={call.localRef} autoPlay muted playsInline />
        </div>
      </div>
      <div className="vc-controls">
        <button onClick={call.toggleMic} title="Toggle microphone" className={!call.micOn ? "vc-muted" : ""}>
          {call.micOn ? <Mic /> : <MicOff />}
        </button>
        <button onClick={call.toggleCamera} title="Toggle camera" className={!call.cameraOn ? "vc-muted" : ""}>
          {call.cameraOn ? <Video /> : <VideoOff />}
        </button>
        <button onClick={call.endCall} className="vc-hangup"><PhoneOff /> End consultation</button>
      </div>
      <div className="vc-status">{call.joined ? "Signaling connected · " : ""}{call.status}</div>
    </div>
  );
}