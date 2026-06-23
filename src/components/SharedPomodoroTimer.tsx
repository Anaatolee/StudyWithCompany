"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

type PresetMode = "25/5" | "50/10";
type Phase = "work" | "break";

const PRESETS: Record<PresetMode, Record<Phase, number>> = {
  "25/5":  { work: 25 * 60, break: 5 * 60 },
  "50/10": { work: 50 * 60, break: 10 * 60 },
};

function lookupDuration(mode: string, phase: Phase, room: Room): number {
  if (mode === "custom") {
    return phase === "work"
      ? (room.pomodoro_work_duration ?? 25 * 60)
      : (room.pomodoro_break_duration ?? 5 * 60);
  }
  const m: PresetMode = mode === "50/10" ? "50/10" : "25/5";
  return PRESETS[m][phase];
}

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

type Props = { room: Room; isCreator: boolean; compact?: boolean };

export function SharedPomodoroTimer({ room, isCreator, compact = false }: Props) {
  const [mode, setMode] = useState<string>(room.pomodoro_mode || "25/5");
  const [phase, setPhase] = useState<Phase>((room.pomodoro_phase || "work") as Phase);
  const [pendingMode, setPendingMode] = useState<string | null>(room.pomodoro_pending_mode || null);

  // Server-authoritative timer state (read by interval without causing re-renders)
  const startedAtRef = useRef<number | null>(
    room.pomodoro_started_at ? new Date(room.pomodoro_started_at).getTime() : null
  );
  const phaseDurationRef = useRef<number>(
    room.pomodoro_phase_duration
      ?? lookupDuration(room.pomodoro_mode || "25/5", (room.pomodoro_phase || "work") as Phase, room)
  );
  const runningRef = useRef<boolean>(room.pomodoro_running);
  const phaseEndCalledRef = useRef(false);
  const roomIdRef = useRef(room.id);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clock offset: (server_ms - client_ms). Added to Date.now() to get server time.
  // Eliminates up to several seconds of drift between clients on different machines.
  const clockOffsetRef = useRef(0);

  // Returns an estimate of current server time in ms
  function serverNow() {
    return Date.now() + clockOffsetRef.current;
  }

  function calcRemaining(startedAt: number | null, duration: number, running: boolean): number {
    if (!running || !startedAt) return duration;
    const elapsed = Math.floor((serverNow() - startedAt) / 1000);
    return Math.max(0, duration - elapsed);
  }

  const [timeLeft, setTimeLeft] = useState<number>(() =>
    calcRemaining(startedAtRef.current, phaseDurationRef.current, runningRef.current)
  );

  // Calibrate client clock against server on mount.
  // Uses round-trip time to estimate the midpoint request time.
  useEffect(() => {
    const t0 = Date.now();
    fetch("/api/time")
      .then((r) => r.json())
      .then(({ t }: { t: number }) => {
        const rtt = Date.now() - t0;
        // Server time at request midpoint ≈ t (server processed it ~rtt/2 after t0)
        // clockOffset = serverTimeAtMidpoint - clientTimeAtMidpoint
        clockOffsetRef.current = t - (t0 + rtt / 2);
        // Immediately re-sync display with calibrated clock
        if (runningRef.current && startedAtRef.current) {
          setTimeLeft(calcRemaining(startedAtRef.current, phaseDurationRef.current, true));
        }
      })
      .catch(() => { /* stay with clockOffset = 0 */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function syncFromRoom(updated: Room) {
    const newMode = updated.pomodoro_mode || "25/5";
    const newPhase = (updated.pomodoro_phase || "work") as Phase;
    setMode(newMode);
    setPhase(newPhase);
    setPendingMode(updated.pomodoro_pending_mode || null);

    startedAtRef.current = updated.pomodoro_started_at
      ? new Date(updated.pomodoro_started_at).getTime()
      : null;
    phaseDurationRef.current = updated.pomodoro_phase_duration ?? lookupDuration(newMode, newPhase, updated);
    runningRef.current = updated.pomodoro_running;
    phaseEndCalledRef.current = false;

    setTimeLeft(calcRemaining(startedAtRef.current, phaseDurationRef.current, runningRef.current));
  }

  // Auto-start: creator's client starts the timer on first landing.
  // After the PATCH we re-fetch the room directly because the Realtime subscription
  // may not be fully established yet and the creator would miss their own UPDATE event.
  useEffect(() => {
    if (isCreator && !room.pomodoro_running && !room.pomodoro_started_at) {
      fetch(`/api/rooms/${room.id}/pomodoro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      }).then(async (res) => {
        if (!res.ok) return;
        const supabase = createClient();
        const { data } = await supabase.from("rooms").select("*").eq("id", room.id).single();
        if (data) syncFromRoom(data as Room);
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
  }, [room.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown: recomputes from server-authoritative started_at every tick.
  // All clients use the same formula → synchronized regardless of join time.
  useEffect(() => {
    function callNextPhase() {
      fetch(`/api/rooms/${roomIdRef.current}/pomodoro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "next_phase" }),
      })
        .then((res) => { if (!res.ok) setTimeout(callNextPhase, 3000); })
        .catch(() => setTimeout(callNextPhase, 3000));
    }

    intervalRef.current = setInterval(() => {
      if (!runningRef.current || !startedAtRef.current) return;

      const remaining = calcRemaining(
        startedAtRef.current,
        phaseDurationRef.current,
        true
      );
      setTimeLeft(remaining);

      if (remaining === 0 && !phaseEndCalledRef.current) {
        phaseEndCalledRef.current = true;
        playBeep();
        callNextPhase();
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleModeClick(m: PresetMode) {
    if (!isCreator) return;
    // Mise à jour optimiste : on reflète immédiatement l'état (même règle que le serveur,
    // cf. set_pending_mode) pour que le bouton se sélectionne sans attendre l'aller-retour réseau.
    setPendingMode(m === mode ? null : m);
    fetch(`/api/rooms/${room.id}/pomodoro`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_pending_mode", mode: m }),
    });
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  const isCustomMode = mode === "custom";
  const customLabel = isCustomMode
    ? `${Math.round((room.pomodoro_work_duration ?? 25 * 60) / 60)}/${Math.round((room.pomodoro_break_duration ?? 5 * 60) / 60)}`
    : null;

  const modeButtons = isCustomMode ? (
    <span className="cg-seg is-active text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] bg-accent text-white">
      {customLabel}
    </span>
  ) : (
    (["25/5", "50/10"] as PresetMode[]).map((m) => {
      const isActive = mode === m && !pendingMode;
      const isPending = pendingMode === m;
      return (
        <button
          key={m}
          onClick={() => handleModeClick(m)}
          disabled={!isCreator}
          className={`cg-seg ${isActive ? "is-active" : ""} ${isPending ? "is-pending" : ""} text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] transition ${
            isActive || isPending
              ? "bg-accent text-white"
              : "bg-surface-2 text-muted"
          } ${isCreator && !isActive && !isPending ? "hover:brightness-95 cursor-pointer" : ""} ${!isCreator ? "cursor-default" : ""}`}
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
    })
  );

  if (compact) {
    const running = phase === "work";
    return (
      <div className="cg-pill flex items-center gap-2 pl-[11px] pr-[7px] py-[5px] rounded-[11px] bg-surface border border-border shrink-0">
        <Timer className="w-[15px] h-[15px] text-accent shrink-0" />
        <span className={`text-[10.5px] font-bold uppercase tracking-[0.04em] ${running ? "text-[#3f9d6a]" : "text-muted"}`}>
          {running ? "Focus" : "Pause"}
        </span>
        <span className="font-display text-[14.5px] font-semibold [font-variant-numeric:tabular-nums]">
          {mins}:{secs}
        </span>
        <div className="flex gap-1">{modeButtons}</div>
      </div>
    );
  }

  return null;
}
