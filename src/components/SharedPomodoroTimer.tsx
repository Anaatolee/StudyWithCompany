"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

type PresetMode = "25/5" | "50/10";
type Phase = "work" | "break";

const PRESETS: Record<PresetMode, Record<Phase, number>> = {
  "25/5":  { work: 25 * 60, break: 5 * 60 },
  "50/10": { work: 50 * 60, break: 10 * 60 },
};

const PERSONAL_STORAGE_KEY = "swc-pomodoro-custom";

// Default rooms use a global wall-clock cycle: all instances worldwide stay in sync
// without any DB write. Cycle = 25min work + 5min break = 1800s, repeating from Unix epoch.
const DEFAULT_CYCLE = (25 + 5) * 60; // 1800 seconds

function lookupDuration(mode: string, phase: Phase, room: Room): number {
  if (mode === "custom") {
    return phase === "work"
      ? (room.pomodoro_work_duration ?? 25 * 60)
      : (room.pomodoro_break_duration ?? 5 * 60);
  }
  const m: PresetMode = mode === "50/10" ? "50/10" : "25/5";
  return PRESETS[m][phase];
}

function defaultTimerState(nowMs: number): { phase: Phase; timeLeft: number } {
  const pos = Math.floor(nowMs / 1000) % DEFAULT_CYCLE;
  if (pos < 25 * 60) return { phase: "work",  timeLeft: 25 * 60 - pos };
  return             { phase: "break", timeLeft:  5 * 60 - (pos - 25 * 60) };
}

// ── Web Audio engine ─────────────────────────────────────────────────────────
// Utilise AudioContext + fetch/decodeAudioData pour contourner la politique
// autoplay des navigateurs (les timers ne comptent pas comme geste utilisateur).
// Fallback synthétique si le fichier MP3 n'est pas encore chargé.
let _actx: AudioContext | null = null;
let _buffer: AudioBuffer | null = null;
let _loading = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_actx) {
    _actx = new AudioContext();
  }
  return _actx;
}

function loadBeepBuffer() {
  if (_buffer || _loading || typeof window === "undefined") return;
  _loading = true;
  const ctx = getAudioContext();
  if (!ctx) return;
  fetch("/Notification/Son%20notification%20minueteur%20pomodoro.mp3")
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
    .then((data) => ctx.decodeAudioData(data))
    .then((buf) => { _buffer = buf; _loading = false; })
    .catch((err) => { console.warn("[pomodoro] chargement son:", err); _loading = false; });
}

function playBeep() {
  try {
    if (localStorage.getItem("swc-pomodoro-sound") === "false") return;
    const ctx = getAudioContext();
    if (!ctx) return;
    // Déverrouille si nécessaire (certains navigateurs suspendent le contexte)
    if (ctx.state === "suspended") ctx.resume();

    if (_buffer) {
      // Son MP3 décodé → lecture instantanée, zéro latence réseau
      const src = ctx.createBufferSource();
      src.buffer = _buffer;
      src.connect(ctx.destination);
      src.start(0);
    } else {
      // Fallback : bip synthétique si le fichier n'est pas encore prêt
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
      loadBeepBuffer(); // relance le chargement pour la prochaine fois
    }
  } catch (err) {
    console.error("[pomodoro] playBeep:", err);
  }
}

type Props = { room: Room; isCreator: boolean; compact?: boolean };

export function SharedPomodoroTimer({ room, isCreator, compact = false }: Props) {
  // Default/seeded rooms (created_by IS NULL) use clock-based sync — no DB needed
  const isDefaultRoom = !room.created_by;

  // ── Shared timer state ────────────────────────────────────────────────────
  const [mode, setMode] = useState<string>(room.pomodoro_mode || "25/5");
  const [phase, setPhase] = useState<Phase>(() => {
    if (isDefaultRoom) return defaultTimerState(Date.now()).phase;
    return (room.pomodoro_phase || "work") as Phase;
  });
  const [pendingMode, setPendingMode] = useState<string | null>(room.pomodoro_pending_mode || null);

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
  const clockOffsetRef = useRef(0);
  // Tracks previous phase for default-room beep detection
  const prevDefaultPhaseRef = useRef<Phase | null>(null);

  function serverNow() { return Date.now() + clockOffsetRef.current; }

  function calcRemaining(startedAt: number | null, duration: number, running: boolean): number {
    if (!running || !startedAt) return duration;
    return Math.max(0, duration - Math.floor((serverNow() - startedAt) / 1000));
  }

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (isDefaultRoom) return defaultTimerState(Date.now()).timeLeft;
    return calcRemaining(startedAtRef.current, phaseDurationRef.current, runningRef.current);
  });

  // ── Personal mode state ───────────────────────────────────────────────────
  const [personalMode, setPersonalMode] = useState(false);
  const [persPhase, setPersPhase] = useState<Phase>("work");
  const [persRunning, setPersRunning] = useState(false);
  const [persTimeLeft, setPersTimeLeft] = useState(PRESETS["25/5"].work);
  const persIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persPhaseRef = useRef<Phase>("work");
  persPhaseRef.current = persPhase;

  // Custom durations for personal timer
  const [customWork, setCustomWork] = useState(25 * 60);
  const [customBreak, setCustomBreak] = useState(5 * 60);
  const customWorkRef = useRef(25 * 60);
  const customBreakRef = useRef(5 * 60);
  customWorkRef.current = customWork;
  customBreakRef.current = customBreak;

  // Custom panel
  const [showPanel, setShowPanel] = useState(false);
  const [inputWork, setInputWork] = useState(25);
  const [inputBreak, setInputBreak] = useState(5);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  // ── Préchargement audio + déverrouillage AudioContext ───────────────────
  useEffect(() => {
    // Démarre le fetch/decode dès le montage (avant la fin du cycle)
    loadBeepBuffer();
    // Les navigateurs suspendent l'AudioContext jusqu'au premier geste.
    // On le reprend dès que l'utilisateur interagit avec la page.
    function unlock() {
      getAudioContext()?.resume().catch(() => {});
    }
    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // ── Clock calibration ────────────────────────────────────────────────────
  useEffect(() => {
    const t0 = Date.now();
    fetch("/api/time")
      .then((r) => r.json())
      .then(({ t }: { t: number }) => {
        const rtt = Date.now() - t0;
        clockOffsetRef.current = t - (t0 + rtt / 2);
        if (isDefaultRoom) {
          const s = defaultTimerState(serverNow());
          setPhase(s.phase);
          setTimeLeft(s.timeLeft);
          prevDefaultPhaseRef.current = s.phase;
        } else if (runningRef.current && startedAtRef.current) {
          setTimeLeft(calcRemaining(startedAtRef.current, phaseDurationRef.current, true));
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync from DB (user rooms only) ───────────────────────────────────────
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

  // ── Auto-start (user rooms only) ─────────────────────────────────────────
  useEffect(() => {
    if (isDefaultRoom) return; // default rooms use clock-based timer, no DB needed
    if (!room.pomodoro_running && !room.pomodoro_started_at) {
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

  // ── Supabase Realtime (user rooms only) ──────────────────────────────────
  useEffect(() => {
    if (isDefaultRoom) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`shared-pomodoro:${room.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => syncFromRoom(payload.new as Room)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown ────────────────────────────────────────────────────────────
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
      if (isDefaultRoom) {
        // Clock-based: always running, globally synchronized, no DB
        const s = defaultTimerState(serverNow());
        if (prevDefaultPhaseRef.current !== null && prevDefaultPhaseRef.current !== s.phase) {
          playBeep();
        }
        prevDefaultPhaseRef.current = s.phase;
        setPhase(s.phase);
        setTimeLeft(s.timeLeft);
        return;
      }
      // User rooms: DB-driven
      if (!runningRef.current || !startedAtRef.current) return;
      const remaining = calcRemaining(startedAtRef.current, phaseDurationRef.current, true);
      setTimeLeft(remaining);
      if (remaining === 0 && !phaseEndCalledRef.current) {
        phaseEndCalledRef.current = true;
        playBeep();
        callNextPhase();
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Personal timer cleanup ───────────────────────────────────────────────
  useEffect(() => () => {
    if (persIntervalRef.current) clearInterval(persIntervalRef.current);
  }, []);

  // ── Close custom panel on outside click ─────────────────────────────────
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

  // ── Load custom durations from localStorage ──────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERSONAL_STORAGE_KEY);
      if (saved) {
        const { work, break: brk } = JSON.parse(saved) as { work: number; break: number };
        setCustomWork(work); customWorkRef.current = work;
        setCustomBreak(brk); customBreakRef.current = brk;
        setInputWork(Math.round(work / 60));
        setInputBreak(Math.round(brk / 60));
      }
    } catch { /* ignore */ }
  }, []);

  // ── Shared mode button click ─────────────────────────────────────────────
  function handleModeClick(m: PresetMode) {
    if (!isCreator) return;
    setPendingMode(m === mode ? null : m);
    fetch(`/api/rooms/${room.id}/pomodoro`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_pending_mode", mode: m }),
    });
  }

  // ── Personal mode helpers ────────────────────────────────────────────────
  function enterPersonal() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, left: rect.left });
    }
    if (!personalMode) {
      setPersonalMode(true);
      if (persIntervalRef.current) { clearInterval(persIntervalRef.current); persIntervalRef.current = null; }
      setPersRunning(false);
      setPersPhase("work");
      setPersTimeLeft(customWorkRef.current);
    }
    setShowPanel((v) => !v);
  }

  function exitPersonal() {
    if (persIntervalRef.current) { clearInterval(persIntervalRef.current); persIntervalRef.current = null; }
    setPersRunning(false);
    setPersPhase("work");
    setPersonalMode(false);
    setShowPanel(false);
  }

  function togglePersonal() {
    if (persRunning) {
      clearInterval(persIntervalRef.current!);
      persIntervalRef.current = null;
      setPersRunning(false);
      return;
    }
    setPersRunning(true);
    persIntervalRef.current = setInterval(() => {
      setPersTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(persIntervalRef.current!);
          persIntervalRef.current = null;
          playBeep();
          const next: Phase = persPhaseRef.current === "work" ? "break" : "work";
          setPersRunning(false);
          setTimeout(() => {
            setPersPhase(next);
            setPersTimeLeft(next === "work" ? customWorkRef.current : customBreakRef.current);
          }, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function applyCustom() {
    const work = Math.max(1, Math.min(240, inputWork)) * 60;
    const brk  = Math.max(1, Math.min(120, inputBreak)) * 60;
    setCustomWork(work); customWorkRef.current = work;
    setCustomBreak(brk); customBreakRef.current = brk;
    localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify({ work, break: brk }));
    setShowPanel(false);
    if (persIntervalRef.current) { clearInterval(persIntervalRef.current); persIntervalRef.current = null; }
    setPersRunning(false);
    setPersPhase("work");
    setPersTimeLeft(work);
  }

  // ── Derived display values ────────────────────────────────────────────────
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const persMins = String(Math.floor(persTimeLeft / 60)).padStart(2, "0");
  const persSecs = String(persTimeLeft % 60).padStart(2, "0");
  const customLabel = `${Math.round(customWork / 60)}/${Math.round(customBreak / 60)}`;

  const isCustomMode = mode === "custom";

  // Shared mode preset buttons (25/5 + 50/10)
  const sharedModeButtons = isCustomMode ? (
    <span className="cg-seg is-active text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] bg-accent text-white">
      {`${Math.round((room.pomodoro_work_duration ?? 25 * 60) / 60)}/${Math.round((room.pomodoro_break_duration ?? 5 * 60) / 60)}`}
    </span>
  ) : (
    (["25/5", "50/10"] as PresetMode[]).map((m) => {
      const isActive  = mode === m && !pendingMode;
      const isPending = pendingMode === m;
      return (
        <button
          key={m}
          onClick={() => handleModeClick(m)}
          disabled={!isCreator}
          className={`cg-seg ${isActive || isPending ? "is-active is-pending" : ""} text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] transition ${
            isActive || isPending ? "bg-accent text-white" : "bg-surface-2 text-muted"
          } ${isCreator && !isActive && !isPending ? "hover:brightness-95 cursor-pointer" : "cursor-default"
          } ${m === "50/10" && isDefaultRoom ? "hidden" : ""}`}
          title={
            !isCreator ? undefined
              : isPending ? `Annuler (${m} en attente)`
              : isActive  ? undefined
              : `Passer en mode ${m} au prochain cycle`
          }
        >
          {m}
        </button>
      );
    })
  );

  // ── Custom panel (portal) ─────────────────────────────────────────────────
  const customPanel = showPanel && typeof document !== "undefined" && createPortal(
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
              type="number" min={1} max={240} value={inputWork}
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
              type="number" min={1} max={120} value={inputBreak}
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
    </div>,
    document.body,
  );

  // ── Compact render ────────────────────────────────────────────────────────
  if (compact) {
    const pillBase = "cg-pill flex items-center gap-2 pl-[11px] pr-[7px] py-[5px] rounded-[11px] bg-surface border border-border shrink-0";

    // ── Personal mode ──────────────────────────────────────────────────────
    if (personalMode) {
      const persIsWork = persPhase === "work";
      return (
        <>
          <div className={pillBase}>
            <Timer className="w-[15px] h-[15px] text-accent shrink-0" />
            <button onClick={togglePersonal} className="flex items-center gap-2" title={persRunning ? "Mettre en pause" : "Démarrer"}>
              <span className={`text-[10.5px] font-bold uppercase tracking-[0.04em] mr-1 ${persRunning ? "text-[#3f9d6a]" : "text-muted"}`}>
                {persIsWork ? (persRunning ? "Focus" : "Pause") : "Pause"}
              </span>
              <span className="font-display text-[14.5px] font-semibold [font-variant-numeric:tabular-nums]">
                {persMins}:{persSecs}
              </span>
            </button>
            <div className="flex gap-1">
              {/* 25/5 → "Auto" pour les salles par défaut. 50/10 caché pour les salles par défaut. */}
              {(["25/5", "50/10"] as PresetMode[]).map((m) => (
                <button
                  key={m}
                  onClick={exitPersonal}
                  className={`cg-seg text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] transition bg-surface-2 text-muted hover:brightness-95${m === "50/10" && isDefaultRoom ? " hidden" : ""}`}
                  title="Revenir au minuteur collectif"
                >
                  {m === "25/5" && isDefaultRoom ? "Auto" : m}
                </button>
              ))}
              <button
                ref={triggerRef}
                onClick={enterPersonal}
                className="cg-seg is-active flex items-center justify-center gap-1 text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] transition bg-accent text-white w-[52px]"
                title="Durées personnalisées"
              >
                <Settings className="w-3 h-3 shrink-0" />
                <span>{customLabel}</span>
              </button>
            </div>
          </div>
          {customPanel}
        </>
      );
    }

    // ── Shared mode ────────────────────────────────────────────────────────
    const running = phase === "work";
    return (
      <>
        <div className={pillBase}>
          <Timer className="w-[15px] h-[15px] text-accent shrink-0" />
          <span className={`text-[10.5px] font-bold uppercase tracking-[0.04em] mr-1 ${running ? "text-[#3f9d6a]" : "text-muted"}`}>
            {running ? "Focus" : "Pause"}
          </span>
          <span className="font-display text-[14.5px] font-semibold [font-variant-numeric:tabular-nums]">
            {mins}:{secs}
          </span>
          <div className="flex gap-1">
            {sharedModeButtons}
            {!isCustomMode && (
              <button
                ref={triggerRef}
                onClick={enterPersonal}
                className="cg-seg flex items-center justify-center gap-1 text-[11.5px] font-bold px-1.5 py-0.5 rounded-[7px] transition bg-surface-2 text-muted hover:brightness-95 w-[52px]"
                title="Minuteur personnel (non synchronisé)"
              >
                <Settings className="w-3 h-3 shrink-0" />
                <span>Perso</span>
              </button>
            )}
          </div>
        </div>
        {customPanel}
      </>
    );
  }

  return null;
}
