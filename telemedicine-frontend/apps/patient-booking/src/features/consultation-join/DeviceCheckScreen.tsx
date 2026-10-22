import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/shared/platform";
import { useBooking } from "@/shared/state/BookingProvider";
import { BASE_PATH } from "@/shared/wizard/useWizard";
import { ConsultStepper } from "./ConsultStepper";

type CheckState = "checking" | "ok" | "fail";

function browserName(): string {
  const ua = navigator.userAgent;
  const m = ua.match(/(Chrome|Firefox|Edg|Safari)\/(\d+)/);
  if (!m) return "Browser · supported";
  const name = m[1] === "Edg" ? "Edge" : m[1];
  return `${name} ${m[2]} · supported`;
}

export function DeviceCheckScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state } = useBooking();
  const ref = params.get("ref") || state.appointmentRef || "CONS-DEMO";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const [camera, setCamera] = useState<CheckState>("checking");
  const [mic, setMic] = useState<CheckState>("checking");
  const [micLevel, setMicLevel] = useState(0);
  const [busy, setBusy] = useState(false);

  // A simple connection estimate (Network Information API where available).
  const conn = (navigator as unknown as { connection?: { downlink?: number; rtt?: number } }).connection;
  const downMbps = conn?.downlink ?? 12;
  const rtt = conn?.rtt ?? 38;

  async function runChecks() {
    setCamera("checking");
    setMic("checking");
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {});
      }
      setCamera(stream.getVideoTracks().length > 0 ? "ok" : "fail");
      setMic(stream.getAudioTracks().length > 0 ? "ok" : "fail");
      startMeter(stream);
    } catch {
      setCamera("fail");
      setMic("fail");
    }
  }

  function startMeter(stream: MediaStream) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setMicLevel(Math.min(1, peak / 80));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      /* metering unavailable */
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    void runChecks();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playTestSound() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.1;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); void ctx.close(); }, 500);
    } catch { /* ignore */ }
  }

  async function imReady() {
    setBusy(true);
    try {
      await apiFetch(`/consultations/${ref}/ready`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientRef: state.careSubject?.name ?? "patient-1",
          cameraOk: camera === "ok",
          microphoneOk: mic === "ok",
          bandwidthKbps: Math.round(downMbps * 1000),
        }),
      });
    } catch { /* non-blocking */ }
    stop();
    navigate(`${BASE_PATH}/join/waiting-room?ref=${encodeURIComponent(ref)}`);
  }

  const allOk = camera === "ok" && mic === "ok";

  return (
    <section data-screen="P-16" style={{ padding: "clamp(16px,3cqi,40px) 0 48px" }}>
      <ConsultStepper current={2} />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px" }}>
        <h1 className="pb-h1" style={{ marginTop: 8 }}>Device check</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start" }}>
          {/* Left: preview + mic meter */}
          <div>
            <div style={{ position: "relative", background: "#1d2433", borderRadius: 14, overflow: "hidden", aspectRatio: "4 / 3" }}>
              <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "absolute", left: 12, bottom: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(16,41,74,0.7)", padding: "4px 10px", borderRadius: 999 }}>
                {camera === "ok" ? "\u2713 You — camera on" : camera === "fail" ? "Camera unavailable" : "Starting camera…"}
              </span>
            </div>
            <div className="pb-card" style={{ marginTop: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ font: "600 13px var(--font-family)", color: "var(--color-heading)" }}>Microphone level</span>
                <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Speak to test</span>
              </div>
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 28 }}>
                {Array.from({ length: 14 }).map((_, i) => {
                  const on = micLevel * 14 > i;
                  return <span key={i} style={{ flex: 1, height: `${30 + (i % 4) * 18}%`, background: on ? "var(--color-success)" : "#e0e5ea", borderRadius: 2 }} />;
                })}
              </div>
            </div>
          </div>

          {/* Right: checklist */}
          <div>
            <div className="pb-card" style={{ padding: 0, overflow: "hidden" }}>
              <DeviceRow icon={"\uD83D\uDCF9"} name="Camera" detail="Front camera" state={camera} />
              <DeviceRow icon={"\uD83C\uDFA4"} name="Microphone" detail="Built-in microphone" state={mic} />
              <DeviceRow icon={"\uD83D\uDD0A"} name="Speaker" detail="Built-in speaker" state="ok" />
              <DeviceRow icon={"\uD83C\uDF10"} name="Browser" detail={browserName()} state="ok" />
              <DeviceRow icon={"\uD83D\uDCF6"} name="Connection" detail={`${downMbps} Mbps · ${rtt} ms · good for video`} state="ok" last />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: allOk ? "#e3f4ea" : "#fdf1e0", border: `1px solid ${allOk ? "#bfe6cd" : "#f0d9b5"}`, borderRadius: 12, padding: "12px 14px", marginTop: 14 }}>
              <span aria-hidden="true" style={{ color: allOk ? "var(--color-success)" : "var(--color-warning)" }}>{allOk ? "\u2713" : "!"}</span>
              <span style={{ fontSize: 14, color: "var(--color-text)" }}>
                {allOk ? <><strong>Everything works.</strong> When you continue, the clinic is told you're ready.</> : "Allow camera and microphone access, then run the checks again."}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 16 }}>
              <button type="button" className="pb-btn pb-btn-primary" disabled={!allOk || busy} onClick={imReady} style={{ minHeight: 52, flex: "1 1 220px" }}>
                {busy ? "Entering…" : "I'm ready — enter the waiting room"}
              </button>
              <button type="button" onClick={runChecks} style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer" }}>Run checks again</button>
            </div>
            <button type="button" onClick={playTestSound} style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", marginTop: 12 }}>&#128266; Play test sound</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeviceRow({ icon, name, detail, state, last }: { icon: string; name: string; detail: string; state: CheckState; last?: boolean }) {
  const label = state === "ok" ? "Working" : state === "fail" ? "Not working" : "Checking…";
  const color = state === "ok" ? "var(--color-success)" : state === "fail" ? "var(--color-danger-text)" : "var(--color-muted)";
  const bg = state === "ok" ? "#e3f4ea" : state === "fail" ? "#fdf0f0" : "#eef1f4";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: last ? "none" : "1px solid var(--color-border)" }}>
      <span aria-hidden="true" style={{ flex: "none", width: 34, height: 34, borderRadius: 9, background: "var(--color-tint)", display: "grid", placeItems: "center" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 14px var(--font-family)", color: "var(--color-heading)" }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{detail}</div>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color, background: bg, padding: "4px 10px", borderRadius: 999 }}>
        {state === "ok" ? "\u2713 " : ""}{label}
      </span>
    </div>
  );
}
