"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Settings, Timer } from "lucide-react";

type Props = { compact?: boolean };

type Mode = "25/5" | "50/10" | "custom";
type Phase = "work" | "break";

const PRESETS: Record<"25/5" | "50/10", { work: number; break: number }> = {
  "25/5":  { work: 25 * 60, break: 5 * 60 },
  "50/10": { work: 50 * 60, break: 10 * 60 },
};
const STORAGE_KEY = "swc-pomodoro-custom";

function playBeep() {
  try {
    if (localStorage.getItem("swc-pomodoro-sound") === "false") return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.6);
  } catch { /* SSR or restricted env */ }
}

export function PomodoroTimer({ compact = false }: Props) {
  const [mode, setMode] = useState<Mode>("25/5");
  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);

  // Custom durations (seconds)
  const [customWork, setCustomWork] = useState(25 * 60);
  const [customBreak, setCustomBreak] = useState(5 * 60);
  const customWorkRef = useRef(25 * 60);
  const customBreakRef = useRef(5 * 60);
  customWorkRef.current = customWork;
  customBreakRef.current = customBreak;

  // Panel state (compact mode)
  const [showPanel, setShowPanel] = useState(false);
  const [inputWork, setInputWork] = useState(25);
  const [inputBreak, setInputBreak] = useState(5);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef<Mode>("25/5");
  const phaseRef = useRef<Phase>("work");
  modeRef.current = mode;
  phaseRef.current = phase;

  function getDurations(m: Mode): { work: number; break: number } {
    if (m === "custom") return { work: customWorkRef.current, break: customBreakRef.current };
    return PRESETS[m];
  }

  const [timeLeft, setTimeLeft] = useState(PRESETS["25/5"].work);

  // Load custom durations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { work, break: brk } = JSON.parse(saved) as { work: number; break: number };
        setCustomWork(work);
        setCustomBreak(brk);
        customWorkRef.current = work;
        customBreakRef.current = brk;
        setInputWork(Math.round(work / 60));
        setInputBreak(Math.round(brk / 60));
      }
    } catch { /* ignore */ }
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPanel]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  function stop() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
  }

  function reset(newMode?: Mode, overrideWork?: number) {
    stop();
    const m = newMode ?? modeRef.current;
    if (newMode) setMode(newMode);
    setPhase("work");
    const durations = m === "custom"
      ? { work: overrideWork ?? customWorkRef.current }
      : PRESETS[m];
    setTimeLeft(durations.work);
  }

  function toggle() {
    if (running) { stop(); return; }
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          playBeep();
          const next: Phase = phaseRef.current === "work" ? "break" : "work";
          setRunning(false);
          setTimeout(() => {
            setPhase(next);
            const d = getDurations(modeRef.current);
            setTimeLeft(d[next]);
          }, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function applyCustom() {
    const work = Math.max(1, Math.min(240, inputWork)) * 60;
    const brk = Math.max(1, Math.min(120, inputBreak)) * 60;
    setCustomWork(work);
    setCustomBreak(brk);
    customWorkRef.current = work;
    customBreakRef.current = brk;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ work, break: brk }));
    setShowPanel(false);
    reset("custom", work);
  }

  function handleCustomButton() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, left: rect.left });
    }
    if (mode !== "custom") reset("custom");
    setShowPanel((v) => !v);
  }

  const totalTime = getDurations(mode)[phase];
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const R = 36;
  const circumference = 2 * Math.PI * R;
  const dash = circumference * progress;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  const customLabel = `${Math.round(customWork / 60)}/${Math.round(customBreak / 60)}`;

  // ── Compact ──────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="relative flex items-center gap-2 pl-[11px] pr-[7px] py-[5px] rounded-[11px] bg-surface border border-border shrink-0">
        <Timer className="w-[15px] h-[15px] text-accent shrink-0" />
        <button
          onClick={toggle}
          className="flex items-center gap-2"
          title={running ? "Mettre en pause" : "Démarrer"}
        >
          <span className={`inline-block w-8 text-center text-[10.5px] font-bold uppercase tracking-[0.04em] ${running ? "text-[#3f9d6a]" : "text-muted"}`}>
            {phase === "work" ? (running ? "Focus" : "Pause") : "Pause"}
          </span>
          <span className="font-display text-[14.5px] font-semibold [font-variant-numeric:tabular-nums]">
            {mins}:{secs}
          </span>
        </button>

        {/* Mode buttons */}
        <div className="flex gap-1">
          {(["25/5", "50/10"] as const).map((m) => (
            <button
              key={m}
              onClick={() => reset(m)}
              className={`text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] transition ${
                mode === m ? "bg-accent text-white" : "bg-surface-2 text-muted hover:brightness-95"
              }`}
            >
              {m}
            </button>
          ))}
          <button
            ref={triggerRef}
            onClick={handleCustomButton}
            className={`flex items-center justify-center gap-1 text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] transition w-[52px] ${
              mode === "custom" ? "bg-accent text-white" : "bg-surface-2 text-muted hover:brightness-95"
            }`}
            title="Durées personnalisées"
          >
            <Settings className="w-3 h-3 shrink-0" />
            <span>{mode === "custom" ? customLabel : "Perso"}</span>
          </button>
        </div>

        {/* Settings panel — fixed pour éviter le clipping par le stacking context du header (backdrop-blur) */}
        {showPanel && (
          <div
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left }}
            className="fixed z-[200] bg-surface border border-border rounded-xl shadow-xl p-4 w-52"
          >
            <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted mb-3">Durées personnalisées</p>
            <div className="flex flex-col gap-2.5 mb-3">
              <label className="flex items-center justify-between gap-2 text-[13.5px] font-medium">
                <span>Travail</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={inputWork}
                    onChange={(e) => setInputWork(Number(e.target.value))}
                    className="w-14 bg-background border border-border rounded-[8px] px-2 py-1 text-center text-[13.5px] font-semibold outline-none focus:border-accent"
                  />
                  <span className="text-muted text-[12px]">min</span>
                </div>
              </label>
              <label className="flex items-center justify-between gap-2 text-[13.5px] font-medium">
                <span>Pause</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={inputBreak}
                    onChange={(e) => setInputBreak(Number(e.target.value))}
                    className="w-14 bg-background border border-border rounded-[8px] px-2 py-1 text-center text-[13.5px] font-semibold outline-none focus:border-accent"
                  />
                  <span className="text-muted text-[12px]">min</span>
                </div>
              </label>
            </div>
            <button
              onClick={applyCustom}
              className="w-full bg-accent text-white text-[13px] font-semibold rounded-[9px] py-2 hover:opacity-90 transition"
            >
              Appliquer
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Full (sidebar) ────────────────────────────────────────────────────────
  return (
    <div className="border-b border-border px-3 py-3">
      <div className="flex items-center gap-1.5 mb-3 text-xs uppercase tracking-wide text-muted">
        <Timer className="w-3.5 h-3.5" />
        Pomodoro
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mb-3">
        {(["25/5", "50/10"] as const).map((m) => (
          <button
            key={m}
            onClick={() => reset(m)}
            className={`flex-1 text-xs py-1 rounded-md transition ${
              mode === m ? "bg-accent text-white" : "bg-background border border-border hover:border-accent/50"
            }`}
          >
            {m}
          </button>
        ))}
        <button
          onClick={handleCustomButton}
          className={`flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-md transition ${
            mode === "custom" ? "bg-accent text-white" : "bg-background border border-border hover:border-accent/50"
          }`}
        >
          <Settings className="w-3 h-3" />
          {mode === "custom" ? customLabel : "Perso"}
        </button>
      </div>

      {/* Custom inputs (full mode) */}
      {mode === "custom" && (
        <div className="flex flex-col gap-2 mb-3 p-3 bg-surface-2 rounded-[10px]">
          <label className="flex items-center justify-between text-[12.5px] font-medium">
            <span className="text-muted">Travail</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={1} max={240} value={inputWork}
                onChange={(e) => setInputWork(Number(e.target.value))}
                onBlur={applyCustom}
                className="w-12 bg-background border border-border rounded-[7px] px-1.5 py-0.5 text-center text-[13px] font-semibold outline-none focus:border-accent"
              />
              <span className="text-muted text-[11px]">min</span>
            </div>
          </label>
          <label className="flex items-center justify-between text-[12.5px] font-medium">
            <span className="text-muted">Pause</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={1} max={120} value={inputBreak}
                onChange={(e) => setInputBreak(Number(e.target.value))}
                onBlur={applyCustom}
                className="w-12 bg-background border border-border rounded-[7px] px-1.5 py-0.5 text-center text-[13px] font-semibold outline-none focus:border-accent"
              />
              <span className="text-muted text-[11px]">min</span>
            </div>
          </label>
        </div>
      )}

      {/* Phase indicator */}
      <p className="text-center text-xs text-muted mb-2 font-medium">
        {phase === "work" ? "Travail" : "Pause"}
      </p>

      {/* Circular progress */}
      <div className="flex justify-center mb-3">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={R} fill="none" stroke="currentColor" strokeWidth="5" className="text-border" />
            <circle
              cx="44" cy="44" r={R} fill="none" stroke="currentColor" strokeWidth="5"
              strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
              className={phase === "work" ? "text-accent" : "text-emerald-500"}
              style={{ transition: running ? "stroke-dasharray 0.9s linear" : "none" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-mono font-semibold tracking-tight">{mins}:{secs}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => reset()} className="p-2 rounded-lg hover:bg-background border border-border transition" title="Réinitialiser">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={toggle}
          className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition flex items-center gap-1.5 text-sm font-medium"
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? "Pause" : "Démarrer"}
        </button>
      </div>
    </div>
  );
}
