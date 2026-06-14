"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

type Mode = "25/5" | "50/10";
type Phase = "work" | "break";

const MODES: Record<Mode, { work: number; break: number }> = {
  "25/5":  { work: 25 * 60, break: 5 * 60 },
  "50/10": { work: 50 * 60, break: 10 * 60 },
};

function playBeep() {
  try {
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
  } catch {
    // AudioContext not available (SSR or restricted env)
  }
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>("25/5");
  const [phase, setPhase] = useState<Phase>("work");
  const [timeLeft, setTimeLeft] = useState(MODES["25/5"].work);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs so interval callback always reads current values without stale closures
  const modeRef = useRef<Mode>("25/5");
  const phaseRef = useRef<Phase>("work");
  modeRef.current = mode;
  phaseRef.current = phase;

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  function stop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }

  function reset(newMode?: Mode) {
    stop();
    const m = newMode ?? modeRef.current;
    if (newMode) setMode(newMode);
    setPhase("work");
    setTimeLeft(MODES[m].work);
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
          // Brief pause at 00:00 so user sees the transition
          setTimeout(() => {
            setPhase(next);
            setTimeLeft(MODES[modeRef.current][next]);
          }, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const totalTime = MODES[mode][phase];
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const R = 36;
  const circumference = 2 * Math.PI * R;
  const dash = circumference * progress;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="border-b border-border px-3 py-3">
      <div className="flex items-center gap-1.5 mb-3 text-xs uppercase tracking-wide text-muted">
        <Timer className="w-3.5 h-3.5" />
        Pomodoro
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mb-3">
        {(["25/5", "50/10"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => reset(m)}
            className={`flex-1 text-xs py-1 rounded-md transition ${
              mode === m
                ? "bg-accent text-white"
                : "bg-background border border-border hover:border-accent/50"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Phase indicator */}
      <p className="text-center text-xs text-muted mb-2 font-medium">
        {phase === "work" ? "Travail" : "Pause"}
      </p>

      {/* Circular progress */}
      <div className="flex justify-center mb-3">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
            {/* Track */}
            <circle
              cx="44" cy="44" r={R}
              fill="none" stroke="currentColor" strokeWidth="5"
              className="text-border"
            />
            {/* Progress arc */}
            <circle
              cx="44" cy="44" r={R}
              fill="none" stroke="currentColor" strokeWidth="5"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              className={phase === "work" ? "text-accent" : "text-emerald-500"}
              style={{ transition: running ? "stroke-dasharray 0.9s linear" : "none" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-mono font-semibold tracking-tight">
              {mins}:{secs}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => reset()}
          className="p-2 rounded-lg hover:bg-background border border-border transition"
          title="Réinitialiser"
        >
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
