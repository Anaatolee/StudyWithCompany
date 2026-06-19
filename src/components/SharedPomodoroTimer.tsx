"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
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

type Props = { room: Room; isCreator: boolean; compact?: boolean };

export function SharedPomodoroTimer({ room, isCreator, compact = false }: Props) {
  const [mode, setMode] = useState<Mode>((room.pomodoro_mode || "25/5") as Mode);
  const [phase, setPhase] = useState<Phase>((room.pomodoro_phase || "work") as Phase);
  const [pendingMode, setPendingMode] = useState<Mode | null>(
    (room.pomodoro_pending_mode || null) as Mode | null
  );
  const [timeLeft, setTimeLeft] = useState(() => computeRemaining(room));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomIdRef = useRef(room.id);

  function syncFromRoom(updated: Room) {
    setMode((updated.pomodoro_mode || "25/5") as Mode);
    setPhase((updated.pomodoro_phase || "work") as Phase);
    setPendingMode((updated.pomodoro_pending_mode || null) as Mode | null);
    setTimeLeft(computeRemaining(updated));
  }

  // Auto-start: creator's client starts the timer when first landing in the room
  useEffect(() => {
    if (isCreator && !room.pomodoro_running && !room.pomodoro_started_at) {
      fetch(`/api/rooms/${room.id}/pomodoro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Supabase Realtime
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

  // Perpetual countdown — any client triggers next_phase; server handles idempotency
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === 0) return 0; // Waiting for Realtime update
        if (prev === 1) {
          playBeep();
          fetch(`/api/rooms/${roomIdRef.current}/pomodoro`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "next_phase" }),
          });
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function setPendingModeAction(m: Mode) {
    await fetch(`/api/rooms/${room.id}/pomodoro`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_pending_mode", mode: m }),
    });
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const phaseColor = phase === "work" ? "text-accent" : "text-emerald-400";

  const modeButtons = (["25/5", "50/10"] as Mode[]).map((m) => {
    const isActive = mode === m && !pendingMode;
    const isPending = pendingMode === m;
    return (
      <button
        key={m}
        onClick={() => isCreator && setPendingModeAction(m)}
        disabled={!isCreator}
        className={`text-xs px-1.5 py-0.5 rounded transition font-medium ${
          isActive
            ? "bg-accent text-white"
            : isPending
            ? "bg-accent/30 text-accent border border-accent/50"
            : "bg-background border border-border text-muted"
        } ${isCreator && !isActive && !isPending ? "hover:border-accent/50 cursor-pointer" : ""} ${!isCreator ? "cursor-default" : ""}`}
        title={
          !isCreator ? undefined
          : isPending ? `Annuler (${m} est en attente)`
          : isActive ? undefined
          : `Passer en mode ${m} au prochain cycle`
        }
      >
        {m}
      </button>
    );
  });

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-border bg-surface/60 shrink-0">
        <Timer className="w-3.5 h-3.5 text-muted shrink-0" />
        <span className="text-xs text-muted shrink-0">
          {phase === "work" ? "Travail" : "Pause"}
        </span>
        <span className={`text-sm font-mono font-semibold shrink-0 ${phaseColor}`}>
          {mins}:{secs}
        </span>
        <div className="flex gap-0.5">{modeButtons}</div>
      </div>
    );
  }

  return null;
}
