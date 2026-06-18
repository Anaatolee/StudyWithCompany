"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

type Mode = "25/5" | "50/10";
type Phase = "work" | "break";

const MODES: Record<Mode, Record<Phase, number>> = {
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
  } catch { /* SSR or restricted env */ }
}

function computeRemaining(room: Room): number {
  const mode = (room.pomodoro_mode || "25/5") as Mode;
  const phase = (room.pomodoro_phase || "work") as Phase;
  const fallback = MODES[mode][phase];
  if (!room.pomodoro_phase_duration) return fallback;
  if (!room.pomodoro_running || !room.pomodoro_started_at) return room.pomodoro_phase_duration;
  const elapsed = Math.floor((Date.now() - new Date(room.pomodoro_started_at).getTime()) / 1000);
  return Math.max(0, room.pomodoro_phase_duration - elapsed);
}

type Props = { room: Room; isCreator: boolean };

export function SharedPomodoroTimer({ room, isCreator }: Props) {
  const [mode, setMode] = useState<Mode>((room.pomodoro_mode || "25/5") as Mode);
  const [phase, setPhase] = useState<Phase>((room.pomodoro_phase || "work") as Phase);
  const [running, setRunning] = useState(room.pomodoro_running);
  const [timeLeft, setTimeLeft] = useState(() => computeRemaining(room));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCreatorRef = useRef(isCreator);
  const roomIdRef = useRef(room.id);

  // Sync when Realtime fires a room update
  function syncFromRoom(updated: Room) {
    const newMode = (updated.pomodoro_mode || "25/5") as Mode;
    const newPhase = (updated.pomodoro_phase || "work") as Phase;
    const newRunning = updated.pomodoro_running;
    setMode(newMode);
    setPhase(newPhase);
    setRunning(newRunning);
    setTimeLeft(computeRemaining(updated));
  }

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`shared-pomodoro:${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => syncFromRoom(payload.new as Room)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  // Local countdown
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          playBeep();
          setRunning(false);
          if (isCreatorRef.current) {
            fetch(`/api/rooms/${roomIdRef.current}/pomodoro`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "next_phase" }),
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  async function callApi(action: string, extra?: object) {
    await fetch(`/api/rooms/${room.id}/pomodoro`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
          <Timer className="w-3.5 h-3.5" />
          Pomodoro collectif
        </div>
        {isCreator && (
          <div className="flex gap-1">
            {(["25/5", "50/10"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => callApi("set_mode", { mode: m })}
                className={`text-xs px-2 py-0.5 rounded transition ${
                  mode === m ? "bg-accent text-white" : "bg-background border border-border hover:border-accent/50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        {!isCreator && (
          <span className="text-xs text-muted">{mode}</span>
        )}
      </div>

      <p className="text-center text-xs text-muted mb-2 font-medium">
        {phase === "work" ? "Travail" : "Pause"}
      </p>

      <div className="flex justify-center mb-3">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={R} fill="none" stroke="currentColor" strokeWidth="5" className="text-border" />
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
            <span className="text-lg font-mono font-semibold tracking-tight">{mins}:{secs}</span>
          </div>
        </div>
      </div>

      {isCreator ? (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => callApi("reset")}
            className="p-2 rounded-lg hover:bg-background border border-border transition"
            title="Réinitialiser"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => callApi(running ? "pause" : "start")}
            className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition flex items-center gap-1.5 text-sm font-medium"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Pause" : "Démarrer"}
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted">
          {running ? "En cours..." : timeLeft === 0 ? "Terminé" : "En attente du créateur"}
        </p>
      )}
    </div>
  );
}
