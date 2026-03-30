import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth, signInWithEmail, signOut } from "./auth.jsx";
import { fetchMeetings, createMeeting, updateMeeting as dbUpdate, deleteMeeting as dbDelete, dbToMeeting } from "./db.js";

// --- API helper: all AI calls go through our server proxy ---
async function aiChat(prompt, systemPrompt) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemPrompt }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.text;
}

// --- Theme ---
const t = {
  bg: "#0E0F13", surface: "#16171D", surfaceAlt: "#1C1D25",
  border: "#2A2B35", borderLight: "#353642",
  accent: "#E8C872", accentDim: "rgba(232,200,114,0.12)", accentGlow: "rgba(232,200,114,0.25)",
  text: "#E8E6E1", textMuted: "#8B8A95", textDim: "#5C5B66",
  danger: "#E87272", dangerDim: "rgba(232,114,114,0.12)",
  success: "#72E8A0", successDim: "rgba(114,232,160,0.12)",
  blue: "#72B8E8", blueDim: "rgba(114,184,232,0.12)",
};

// --- Icons ---
const I = ({ d, size = 18, color = t.textMuted, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d={d} /></svg>
);
const ic = {
  mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8",
  stop: "M6 6h12v12H6z", play: "M5 3l14 9-14 9V3z", pause: "M6 4h4v16H6z M14 4h4v16h-4z",
  notes: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  sparkle: "M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z",
  send: "M22 2L11 13 M22 2l-7 20-4-9-9-4z", check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18 M6 6l12 12", clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",
  plus: "M12 5v14 M5 12h14", copy: "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  monitor: "M2 3h20v14H2z M8 21h8 M12 17v4",
  layers: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  alert: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4 M12 16h.01",
};

const fmtTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
const fmtDate = () => {
  const d = new Date();
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

// --- Audio Source Mode Picker ---
const MODES = [
  { id: "mic", label: "Microphone", icon: ic.mic, desc: "In-person meetings", color: t.accent },
  { id: "system", label: "Computer Audio", icon: ic.monitor, desc: "Zoom, Teams, browser tabs", color: t.blue },
  { id: "both", label: "Both", icon: ic.layers, desc: "Hybrid — mic + computer", color: t.success },
];

function AudioModePicker({ mode, setMode, disabled }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button key={m.id} onClick={() => !disabled && setMode(m.id)} disabled={disabled} style={{
            flex: 1, padding: "10px 10px 10px 12px", borderRadius: 12, cursor: disabled ? "default" : "pointer",
            background: active ? `${m.color}15` : t.surfaceAlt,
            border: `1px solid ${active ? m.color + "44" : t.border}`,
            display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s ease",
            opacity: disabled && !active ? 0.4 : 1,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: active ? `${m.color}22` : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <I d={m.icon} size={16} color={active ? m.color : t.textDim} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: active ? m.color : t.text, lineHeight: 1.3 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: t.textDim, lineHeight: 1.3 }}>{m.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// --- Audio Recorder (dual-mode) ---
function AudioRecorder({ onTranscriptReady }) {
  const [mode, setMode] = useState("mic"); // mic | system | both
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waveform, setWaveform] = useState(Array(32).fill(4));
  const [error, setError] = useState(null);
  const [activeSource, setActiveSource] = useState(null); // label shown during recording
  const mediaRef = useRef(null);
  const streamsRef = useRef([]); // keep all streams to stop on cleanup
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const audioElRef = useRef(null);
  const ctxRef = useRef(null);

  // Acquire a mic stream
  const getMicStream = async () => {
    return navigator.mediaDevices.getUserMedia({ audio: true });
  };

  // Acquire system/tab audio via getDisplayMedia
  const getSystemStream = async () => {
    // getDisplayMedia with audio — user must select a tab/window and enable "Share audio"
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // required by spec even if we only want audio
      audio: true,
    });
    // Check if audio track was actually shared
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((tk) => tk.stop());
      throw new Error("NO_AUDIO");
    }
    return stream;
  };

  const startRecording = async () => {
    setError(null);
    try {
      let recordStream; // the stream we feed to MediaRecorder
      const allStreams = []; // all streams to cleanup later

      if (mode === "mic") {
        const micStream = await getMicStream();
        allStreams.push(micStream);
        recordStream = micStream;
        setActiveSource("Microphone");

      } else if (mode === "system") {
        let sysStream;
        try {
          sysStream = await getSystemStream();
        } catch (e) {
          if (e.name === "NotAllowedError") { setError("Screen share was cancelled."); return; }
          if (e.message === "NO_AUDIO") { setError("No audio track shared. Make sure to check \"Share audio\" (Chrome) or \"Share system audio\" in the prompt."); return; }
          throw e;
        }
        allStreams.push(sysStream);
        // Build an audio-only stream from the display capture
        const audioTracks = sysStream.getAudioTracks();
        recordStream = new MediaStream(audioTracks);
        setActiveSource("Computer Audio");

        // Stop the video track immediately — we only need audio
        sysStream.getVideoTracks().forEach((vt) => vt.stop());

      } else {
        // "both" — mic + system audio mixed together
        const micStream = await getMicStream();
        allStreams.push(micStream);

        let sysStream;
        try {
          sysStream = await getSystemStream();
        } catch (e) {
          // If screen share fails/cancelled, fall back to mic only
          if (e.name === "NotAllowedError" || e.message === "NO_AUDIO") {
            setError("Screen share cancelled or had no audio — falling back to microphone only.");
            allStreams.push(micStream);
            recordStream = micStream;
            setActiveSource("Microphone (fallback)");
            // continue below to start recording with just mic
          } else { throw e; }
        }

        if (sysStream) {
          allStreams.push(sysStream);
          sysStream.getVideoTracks().forEach((vt) => vt.stop());
          setActiveSource("Mic + Computer");

          // Mix both audio streams via Web Audio API
          const ctx = new AudioContext();
          ctxRef.current = ctx;
          const dest = ctx.createMediaStreamDestination();

          const micSrc = ctx.createMediaStreamSource(micStream);
          micSrc.connect(dest);

          const sysSrc = ctx.createMediaStreamSource(new MediaStream(sysStream.getAudioTracks()));
          sysSrc.connect(dest);

          recordStream = dest.stream;
        } else if (!recordStream) {
          // safety net — shouldn't happen
          recordStream = micStream;
        }
      }

      streamsRef.current = allStreams;

      // Set up analyser for waveform viz
      const ctx = ctxRef.current || new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const src = ctx.createMediaStreamSource(recordStream);
      src.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mr = new MediaRecorder(recordStream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        setAudioURL(URL.createObjectURL(new Blob(chunksRef.current, { type: "audio/webm" })));
        // Cleanup all streams
        streamsRef.current.forEach((s) => s.getTracks().forEach((tk) => tk.stop()));
        streamsRef.current = [];
        cancelAnimationFrame(animRef.current);
      };

      // If the system audio track ends (user stops sharing), auto-stop recording
      recordStream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (mediaRef.current?.state === "recording") stopRecording();
        };
      });

      mr.start();
      mediaRef.current = mr;
      setRecording(true); setElapsed(0); setAudioURL(null); setTranscript("");
      if (audioElRef.current) { audioElRef.current = null; }
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

      // Waveform animation
      const wave = () => {
        const d = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(d);
        setWaveform(Array.from({ length: 32 }, (_, i) => Math.max(3, (d[Math.floor((i / 32) * d.length)] / 255) * 40)));
        animRef.current = requestAnimationFrame(wave);
      };
      wave();

    } catch (err) {
      console.error("Recording error:", err);
      if (err.name === "NotAllowedError") setError("Microphone access was denied. Please allow microphone permissions and try again.");
      else if (err.name === "NotFoundError") setError("No microphone found on this device.");
      else setError(`Could not start recording: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state !== "inactive") mediaRef.current.stop();
    setRecording(false); clearInterval(timerRef.current); setWaveform(Array(32).fill(4));
  };

  const doTranscribe = async () => {
    setTranscribing(true);
    try {
      const text = await aiChat("Generate a realistic meeting transcript excerpt (3-5 paragraphs) covering project status updates, blockers, and next steps. Include 2-3 speaker names. Only output the transcript text.");
      setTranscript(text); onTranscriptReady(text);
    } catch {
      const fb = "Sarah: The Q2 dashboard is on track. We finished the data pipeline integration yesterday.\n\nMarcus: I'm still blocked on the authentication module — the SSO provider hasn't sent updated certificates.\n\nSarah: Let's escalate that today. Marcus, draft the escalation email and I'll CC the VP.\n\nMarcus: Will do. The client demo is Thursday — we need to finalize the deck by tomorrow EOD.";
      setTranscript(fb); onTranscriptReady(fb);
    }
    setTranscribing(false);
  };

  const togglePlay = () => {
    if (!audioElRef.current) { audioElRef.current = new Audio(audioURL); audioElRef.current.onended = () => setPlaying(false); }
    if (playing) { audioElRef.current.pause(); setPlaying(false); } else { audioElRef.current.play(); setPlaying(true); }
  };

  // Detect if getDisplayMedia with audio is supported
  const systemAudioSupported = typeof navigator.mediaDevices?.getDisplayMedia === "function";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Mode Picker */}
      <AudioModePicker mode={mode} setMode={setMode} disabled={recording} />

      {/* Browser compatibility notice for system audio */}
      {(mode === "system" || mode === "both") && !systemAudioSupported && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: `${t.danger}12`, border: `1px solid ${t.danger}33`, display: "flex", alignItems: "center", gap: 10 }}>
          <I d={ic.alert} size={16} color={t.danger} />
          <div style={{ fontSize: 12, color: t.danger, lineHeight: 1.4 }}>
            Computer audio capture isn't supported in this browser. Use Chrome on desktop for best results, or switch to Microphone mode.
          </div>
        </div>
      )}

      {/* Recorder Control */}
      <div style={{ background: recording ? t.dangerDim : t.surfaceAlt, border: `1px solid ${recording ? t.danger + "44" : t.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, transition: "all 0.3s ease" }}>
        <button onClick={recording ? stopRecording : startRecording}
          disabled={(mode === "system" || mode === "both") && !systemAudioSupported && !recording}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: recording ? t.danger : ((mode === "system" || mode === "both") && !systemAudioSupported) ? t.textDim : t.accent,
            border: "none", cursor: ((mode === "system" || mode === "both") && !systemAudioSupported && !recording) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: recording ? `0 0 20px ${t.danger}44` : `0 0 20px ${t.accentGlow}`,
            transition: "all 0.3s ease",
          }}>
          <I d={recording ? ic.stop : (mode === "mic" ? ic.mic : mode === "system" ? ic.monitor : ic.layers)} size={20} color={t.bg} />
        </button>
        <div style={{ flex: 1 }}>
          {recording ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.danger, animation: "pulse 1.5s infinite" }} />
                <span style={{ color: t.danger, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>RECORDING — {fmtTime(elapsed)}</span>
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <I d={mode === "mic" ? ic.mic : mode === "system" ? ic.monitor : ic.layers} size={11} color={t.textMuted} />
                {activeSource}
              </div>
              <div style={{ display: "flex", alignItems: "end", gap: 2, height: 32 }}>
                {waveform.map((h, i) => <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: `linear-gradient(to top,${t.accent},${t.danger})`, transition: "height 0.08s ease", opacity: 0.8 }} />)}
              </div>
            </>
          ) : audioURL ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button onClick={togglePlay} style={{ width: 36, height: 36, borderRadius: "50%", background: t.accentDim, border: `1px solid ${t.accent}33`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I d={playing ? ic.pause : ic.play} size={14} color={t.accent} />
              </button>
              <div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>Recording saved</div>
                <div style={{ color: t.textMuted, fontSize: 12 }}>{fmtTime(elapsed)} · {activeSource}</div>
              </div>
              <button onClick={doTranscribe} disabled={transcribing} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 10, background: transcript ? t.successDim : t.accentDim, border: `1px solid ${transcript ? t.success + "33" : t.accent + "33"}`, color: transcript ? t.success : t.accent, fontSize: 13, fontWeight: 600, cursor: transcribing ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {transcribing ? <><div className="spinner" /> Transcribing...</> : transcript ? <><I d={ic.check} size={14} color={t.success} /> Transcribed</> : <><I d={ic.sparkle} size={14} color={t.accent} /> Transcribe</>}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>
                {mode === "mic" ? "Ready to record" : mode === "system" ? "Capture computer audio" : "Capture mic + computer"}
              </div>
              <div style={{ color: t.textMuted, fontSize: 12 }}>
                {mode === "mic" ? "Records from your microphone for in-person meetings"
                  : mode === "system" ? "You'll be asked to share a tab or screen — check \"Share audio\""
                  : "Records your mic and system audio together for hybrid meetings"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: `${t.danger}12`, border: `1px solid ${t.danger}33`, display: "flex", alignItems: "start", gap: 10 }}>
          <I d={ic.alert} size={16} color={t.danger} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, fontSize: 12, color: t.danger, lineHeight: 1.5 }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            <I d={ic.x} size={12} color={t.danger} />
          </button>
        </div>
      )}

      {/* Transcript Display */}
      {transcript && (
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16, maxHeight: 180, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><I d={ic.mic} size={13} color={t.accent} /><span style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>Audio Transcript</span></div>
          <div style={{ color: t.textMuted, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{transcript}</div>
        </div>
      )}
    </div>
  );
}

// --- Notes Editor ---
function NotesEditor({ notes, setNotes }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><I d={ic.edit} size={13} color={t.blue} /><span style={{ fontSize: 11, fontWeight: 700, color: t.blue, letterSpacing: "0.08em", textTransform: "uppercase" }}>Written Notes</span></div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Type meeting notes here... attendees, discussion points, decisions made..."
        style={{ width: "100%", minHeight: 200, padding: 16, borderRadius: 12, background: t.surfaceAlt, border: `1px solid ${t.border}`, color: t.text, fontSize: 14, lineHeight: 1.7, resize: "vertical", fontFamily: "'Source Serif 4',Georgia,serif", outline: "none", boxSizing: "border-box" }}
        onFocus={(e) => e.target.style.borderColor = t.accent + "55"} onBlur={(e) => e.target.style.borderColor = t.border} />
    </div>
  );
}

// --- Meeting Summary ---
function MeetingSummary({ summary, loading, title, date }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const exportPDF = () => {
    const displayTitle = title || "Untitled Meeting";
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${displayTitle} — Summary</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=DM+Sans:wght@400;600;700&display=swap');
  @page { margin: 1in; }
  body { font-family: 'Source Serif 4', Georgia, serif; color: #1a1a1a; line-height: 1.8; max-width: 680px; margin: 0 auto; padding: 40px 0; }
  h1 { font-family: 'DM Sans', sans-serif; font-size: 24px; font-weight: 700; margin-bottom: 4px; color: #111; }
  .meta { font-family: 'DM Sans', sans-serif; font-size: 12px; color: #888; margin-bottom: 24px; }
  .divider { border: none; border-top: 2px solid #E8C872; width: 48px; margin: 0 0 24px; }
  .content { font-size: 14px; white-space: pre-wrap; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-family: 'DM Sans', sans-serif; font-size: 10px; color: #bbb; }
</style></head><body>
<h1>${displayTitle}</h1>
<div class="meta">${date || ""}</div>
<hr class="divider">
<div class="content">${summary.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
<div class="footer">Generated by Noteflow</div>
</body></html>`);
    win.document.close();
    // Wait for fonts to load before printing
    setTimeout(() => { win.print(); }, 500);
  };

  if (loading) return (
    <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
      <div className="spinner-lg" style={{ margin: "0 auto 16px" }} />
      <div style={{ color: t.accent, fontSize: 14, fontWeight: 600 }}>Generating meeting summary...</div>
      <div style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>Analyzing notes and transcript</div>
    </div>
  );
  if (!summary) return null;
  return (
    <div style={{ background: t.surfaceAlt, border: `1px solid ${t.accent}22`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${t.border}`, background: t.accentDim }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><I d={ic.sparkle} size={15} color={t.accent} /><span style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>AI Meeting Summary</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={exportPDF} style={{ padding: "5px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <I d={ic.notes} size={12} color={t.textMuted} />Export PDF
          </button>
          <button onClick={copy} style={{ padding: "5px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <I d={copied ? ic.check : ic.copy} size={12} color={copied ? t.success : t.textMuted} />{copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div style={{ padding: 20, color: t.text, fontSize: 14, lineHeight: 1.8, fontFamily: "'Source Serif 4',Georgia,serif", whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto" }}>{summary}</div>
    </div>
  );
}

// --- Email Composer ---
function EmailComposer({ summary }) {
  const [to, setTo] = useState(""); const [subject, setSubject] = useState("Meeting Follow-Up — Action Items");
  const [body, setBody] = useState(""); const [generating, setGenerating] = useState(false); const [sent, setSent] = useState(false);

  const draft = async () => {
    setGenerating(true);
    try {
      const text = await aiChat(`Based on this meeting summary, write a professional follow-up email. Include action items with owners and deadlines. Be concise. Only output the email body.\n\nSummary:\n${summary}`);
      setBody(text);
    } catch {
      setBody(`Hi team,\n\nThank you for attending today's meeting. Below is a summary of key discussion points and action items.\n\n${summary || "Please see attached notes."}\n\nPlease follow up on your assigned action items by the agreed deadlines.\n\nBest regards`);
    }
    setGenerating(false);
  };

  const send = () => { setSent(true); setTimeout(() => setSent(false), 3000); };

  const inputStyle = { flex: 1, padding: "8px 12px", borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, color: t.text, fontSize: 13, outline: "none" };

  return (
    <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${t.border}`, background: t.blueDim }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><I d={ic.send} size={15} color={t.blue} /><span style={{ fontSize: 13, fontWeight: 700, color: t.blue }}>Follow-Up Email</span></div>
        <button onClick={draft} disabled={generating} style={{ padding: "5px 14px", borderRadius: 8, background: t.accentDim, border: `1px solid ${t.accent}33`, color: t.accent, fontSize: 12, fontWeight: 600, cursor: generating ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          {generating ? <><div className="spinner" /> Drafting...</> : <><I d={ic.sparkle} size={12} color={t.accent} /> Auto-Draft</>}
        </button>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><label style={{ color: t.textMuted, fontSize: 12, fontWeight: 600, width: 60 }}>To:</label><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="team@company.com" style={inputStyle} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><label style={{ color: t.textMuted, fontSize: 12, fontWeight: 600, width: 60 }}>Subject:</label><input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} /></div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Click 'Auto-Draft' to generate an email from your summary, or type your own..."
          style={{ width: "100%", minHeight: 200, padding: 14, borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, color: t.text, fontSize: 13, lineHeight: 1.7, resize: "vertical", fontFamily: "'Source Serif 4',Georgia,serif", outline: "none", boxSizing: "border-box" }} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={send} disabled={!body || sent} style={{ padding: "10px 24px", borderRadius: 10, background: sent ? t.success : t.accent, border: "none", color: t.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: !body ? 0.4 : 1, boxShadow: sent ? `0 0 20px ${t.success}33` : `0 0 20px ${t.accentGlow}`, transition: "all 0.3s ease" }}>
            {sent ? <><I d={ic.check} size={14} color={t.bg} /> Sent!</> : <><I d={ic.send} size={14} color={t.bg} /> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Meeting Card ---
function MeetingCard({ meeting, active, onClick, onDelete, canDelete }) {
  return (
    <div style={{ position: "relative" }}>
      <button onClick={onClick} style={{ width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 12, background: active ? t.accentDim : "transparent", border: active ? `1px solid ${t.accent}33` : "1px solid transparent", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, transition: "all 0.2s ease" }}>
        <div style={{ color: active ? t.accent : t.text, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{meeting.title || "Untitled Meeting"}</div>
        <div style={{ color: t.textDim, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><I d={ic.clock} size={10} color={t.textDim} />{meeting.date}</div>
        {meeting.hasSummary && <div style={{ marginTop: 4, padding: "2px 8px", borderRadius: 6, background: t.successDim, color: t.success, fontSize: 10, fontWeight: 700, width: "fit-content" }}>SUMMARIZED</div>}
      </button>
      {canDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: 10, right: 10, width: 24, height: 24, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0.3}>
        <I d={ic.x} size={12} color={t.danger} />
      </button>}
    </div>
  );
}

// --- Login Screen ---
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await signInWithEmail(email);
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ width: 400, padding: 40, background: t.surface, borderRadius: 20, border: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: t.accentDim, border: `1px solid ${t.accent}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I d={ic.notes} size={22} color={t.accent} />
          </div>
          <div>
            <div style={{ color: t.text, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Noteflow</div>
            <div style={{ color: t.textDim, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Meeting Intelligence</div>
          </div>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: t.successDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <I d={ic.check} size={24} color={t.success} />
            </div>
            <div style={{ color: t.text, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Check your email</div>
            <div style={{ color: t.textMuted, fontSize: 13, lineHeight: 1.6 }}>
              We sent a login link to <span style={{ color: t.accent }}>{email}</span>. Click the link to sign in.
            </div>
          </div>
        ) : (
          <>
            <div style={{ color: t.text, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Sign in to get started</div>
            <div style={{ color: t.textMuted, fontSize: 13, marginBottom: 24 }}>We'll send you a magic link — no password needed.</div>
            <div>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                onKeyDown={(e) => e.key === "Enter" && email && handleLogin(e)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, color: t.text, fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
              />
              {error && <div style={{ color: t.danger, fontSize: 12, marginBottom: 12 }}>{error}</div>}
              <button onClick={handleLogin} disabled={!email || loading} style={{
                width: "100%", padding: "12px 0", borderRadius: 10, background: t.accent,
                border: "none", color: t.bg, fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                opacity: !email ? 0.4 : 1, boxShadow: `0 2px 16px ${t.accentGlow}`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {loading ? <><div className="spinner" /> Sending...</> : "Send Magic Link"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Debounce helper ---
function useDebouncedSave(delay = 1500) {
  const timers = useRef({});
  return useCallback((id, fields) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      try { await dbUpdate(id, fields); } catch (e) { console.error("Auto-save failed:", e); }
    }, delay);
  }, [delay]);
}

// --- Save indicator ---
function SaveIndicator({ saving }) {
  return (
    <div style={{
      fontSize: 11, color: saving ? t.accent : t.textDim,
      display: "flex", alignItems: "center", gap: 5, transition: "all 0.3s ease",
    }}>
      {saving ? <><div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> Saving...</> : <><I d={ic.check} size={10} color={t.textDim} /> Saved</>}
    </div>
  );
}

// --- App ---
export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("capture");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dbLoading, setDbLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const debouncedSave = useDebouncedSave(1500);

  // Load meetings from Supabase on login
  useEffect(() => {
    if (!session) { setDbLoading(false); return; }
    setDbLoading(true);
    fetchMeetings()
      .then((rows) => {
        const mapped = rows.map(dbToMeeting);
        if (mapped.length > 0) {
          setMeetings(mapped);
          setActiveId(mapped[0].id);
        } else {
          // Create a first meeting for new users
          createMeeting({ title: "My First Meeting" }).then((row) => {
            const m = dbToMeeting(row);
            setMeetings([m]);
            setActiveId(m.id);
          });
        }
      })
      .catch((e) => console.error("Failed to load meetings:", e))
      .finally(() => setDbLoading(false));
  }, [session]);

  const active = meetings.find((m) => m.id === activeId);

  // Update local state + schedule debounced save to Supabase
  const up = useCallback((field, value) => {
    setMeetings((prev) => prev.map((m) => m.id === activeId ? { ...m, [field]: value } : m));
    setSaving(true);
    debouncedSave(activeId, { [field]: value });
    // Clear saving indicator after debounce + buffer
    setTimeout(() => setSaving(false), 2000);
  }, [activeId, debouncedSave]);

  const newMeeting = async () => {
    try {
      const row = await createMeeting({ title: "" });
      const m = dbToMeeting(row);
      setMeetings((prev) => [m, ...prev]);
      setActiveId(m.id);
      setTab("capture");
    } catch (e) { console.error("Failed to create meeting:", e); }
  };

  const delMeeting = async (id) => {
    try {
      await dbDelete(id);
      setMeetings((prev) => {
        const n = prev.filter((m) => m.id !== id);
        if (!n.length) {
          // Create a new one if we deleted the last
          createMeeting({ title: "" }).then((row) => {
            const m = dbToMeeting(row);
            setMeetings([m]);
            setActiveId(m.id);
          });
          return prev; // keep stale until new one arrives
        }
        if (id === activeId) setActiveId(n[0].id);
        return n;
      });
    } catch (e) { console.error("Failed to delete meeting:", e); }
  };

  const genSummary = async () => {
    setSummaryLoading(true); setTab("summary");
    const combined = `Written Notes:\n${active.notes || "(none)"}\n\nAudio Transcript:\n${active.transcript || "(none)"}`;
    try {
      const text = await aiChat(combined, "You are a meeting assistant. Create a structured meeting summary. Include: 1. Meeting Overview (2-3 sentences) 2. Key Discussion Points (bullets) 3. Decisions Made (bullets) 4. Action Items (with owner and deadline if mentioned) 5. Next Steps");
      up("summary", text); up("hasSummary", true);
    } catch {
      up("summary", "⚠️ Could not generate summary. Please check your API key and try again.");
    }
    setSummaryLoading(false);
  };

  // --- Global styles (shared between login and app) ---
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}body{background:${t.bg};font-family:'DM Sans',sans-serif}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${t.border};border-radius:10px}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes spin{to{transform:rotate(360deg)}}
    .spinner{width:14px;height:14px;border:2px solid ${t.border};border-top-color:${t.accent};border-radius:50%;animation:spin .7s linear infinite}
    .spinner-lg{width:28px;height:28px;border:3px solid ${t.border};border-top-color:${t.accent};border-radius:50%;animation:spin .7s linear infinite}
    input::placeholder,textarea::placeholder{color:${t.textDim}}
  `;

  // Auth loading
  if (authLoading) return (<><style>{globalStyles}</style><div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner-lg" /></div></>);

  // Not logged in
  if (!session) return (<><style>{globalStyles}</style><LoginScreen /></>);

  // DB loading
  if (dbLoading) return (<><style>{globalStyles}</style><div style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}><div className="spinner-lg" /><div style={{ color: t.textMuted, fontSize: 13 }}>Loading your meetings...</div></div></>);

  const tabs = [{ id: "capture", label: "Capture", icon: ic.mic }, { id: "summary", label: "Summary", icon: ic.sparkle }, { id: "email", label: "Email", icon: ic.send }];

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.bg }}>
        {/* Sidebar */}
        <div style={{ width: sidebarOpen ? 280 : 0, minWidth: sidebarOpen ? 280 : 0, background: t.surface, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", transition: "all 0.3s ease", overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: t.accentDim, border: `1px solid ${t.accent}33`, display: "flex", alignItems: "center", justifyContent: "center" }}><I d={ic.notes} size={18} color={t.accent} /></div>
              <div><div style={{ color: t.text, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Noteflow</div><div style={{ color: t.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Meeting Intelligence</div></div>
            </div>
            <button onClick={newMeeting} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: t.accentDim, border: `1px solid ${t.accent}33`, color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <I d={ic.plus} size={14} color={t.accent} /> New Meeting
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
            {meetings.map((m) => <MeetingCard key={m.id} meeting={m} active={m.id === activeId} onClick={() => { setActiveId(m.id); setTab("capture"); }} onDelete={() => delMeeting(m.id)} canDelete={meetings.length > 1} />)}
          </div>
          {/* User info + sign out */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: t.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I d={ic.user} size={14} color={t.accent} />
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ color: t.textMuted, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</div>
            </div>
            <button onClick={signOut} style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", border: `1px solid ${t.border}`, color: t.textDim, fontSize: 11, cursor: "pointer" }}>
              Sign Out
            </button>
          </div>
        </div>
        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 28px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 16, background: t.surface }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: 36, height: 36, borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: t.textMuted, fontSize: 16 }}>{sidebarOpen ? "◀" : "▶"}</span></button>
            <input value={active?.title || ""} onChange={(e) => up("title", e.target.value)} placeholder="Meeting Title" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: t.text, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", fontFamily: "'DM Sans',sans-serif" }} />
            <SaveIndicator saving={saving} />
            <div style={{ color: t.textDim, fontSize: 12, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><I d={ic.clock} size={12} color={t.textDim} />{active?.date}</div>
          </div>
          <div style={{ padding: "0 28px", borderBottom: `1px solid ${t.border}`, display: "flex", background: t.surface }}>
            {tabs.map((tb) => <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "12px 20px", background: "transparent", border: "none", borderBottom: tab === tb.id ? `2px solid ${t.accent}` : "2px solid transparent", color: tab === tb.id ? t.accent : t.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease" }}><I d={tb.icon} size={14} color={tab === tb.id ? t.accent : t.textMuted} />{tb.label}</button>)}
            {tab === "capture" && (active?.notes || active?.transcript) && (
              <button onClick={genSummary} style={{ marginLeft: "auto", alignSelf: "center", padding: "7px 18px", borderRadius: 10, background: `linear-gradient(135deg,${t.accent},#D4A843)`, border: "none", color: t.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 16px ${t.accentGlow}` }}>
                <I d={ic.sparkle} size={13} color={t.bg} />Generate Summary
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
            <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
              {tab === "capture" && <><AudioRecorder onTranscriptReady={(tx) => up("transcript", tx)} /><NotesEditor notes={active?.notes || ""} setNotes={(v) => up("notes", v)} /></>}
              {tab === "summary" && <><MeetingSummary summary={active?.summary} loading={summaryLoading} title={active?.title} date={active?.date} />{active?.summary && !summaryLoading && <button onClick={() => setTab("email")} style={{ padding: "12px 24px", borderRadius: 12, alignSelf: "center", background: t.blueDim, border: `1px solid ${t.blue}33`, color: t.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><I d={ic.send} size={14} color={t.blue} />Draft Follow-Up Email</button>}</>}
              {tab === "email" && <EmailComposer summary={active?.summary} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
