import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PresetMode = "25/5" | "50/10";
type Phase = "work" | "break";
const MODES: Record<PresetMode, Record<Phase, number>> = {
  "25/5":  { work: 25 * 60, break: 5 * 60 },
  "50/10": { work: 50 * 60, break: 10 * 60 },
};

function phaseDuration(room: Record<string, unknown>, mode: string, phase: Phase): number {
  if (mode === "custom") {
    return phase === "work"
      ? ((room.pomodoro_work_duration as number | null) ?? 25 * 60)
      : ((room.pomodoro_break_duration as number | null) ?? 5 * 60);
  }
  const m: PresetMode = mode === "50/10" ? "50/10" : "25/5";
  return MODES[m][phase];
}

// PATCH /api/rooms/[roomId]/pomodoro
// action: 'set_pending_mode' (creator only) | 'next_phase' (any authenticated user)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // select("*") avoids failures if optional columns (e.g. pomodoro_pending_mode) don't exist yet
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { action, mode: newMode } = (await request.json()) as {
    action: string;
    mode?: string;
  };

  const currentMode = (room.pomodoro_mode ?? "25/5") as string;
  const currentPhase = (room.pomodoro_phase ?? "work") as Phase;

  switch (action) {
    // Called automatically when the creator first lands in the room
    case "start": {
      if (room.created_by !== user.id) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      // Only start if the timer was never started (initial state)
      if (!room.pomodoro_started_at) {
        await supabase.from("rooms").update({
          pomodoro_running: true,
          pomodoro_started_at: new Date().toISOString(),
        }).eq("id", roomId);
      }
      break;
    }

    case "set_pending_mode": {
      if (room.created_by !== user.id) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (currentMode === "custom") return NextResponse.json({ ok: true }); // no mode switch for custom rooms
      const m = (newMode === "50/10" ? "50/10" : "25/5") as PresetMode;
      // Clicking the active mode clears any pending mode
      await supabase.from("rooms").update({
        pomodoro_pending_mode: m === currentMode ? null : m,
      }).eq("id", roomId);
      break;
    }

    case "next_phase": {
      // Idempotency: server-side check that the phase has actually expired
      if (room.pomodoro_started_at && room.pomodoro_phase_duration) {
        const elapsed = Math.floor(
          (Date.now() - new Date(room.pomodoro_started_at).getTime()) / 1000
        );
        if (elapsed < room.pomodoro_phase_duration - 5) {
          // Called too early (duplicate request), ignore silently
          return NextResponse.json({ ok: true });
        }
      }

      const nextPhase: Phase = currentPhase === "work" ? "break" : "work";
      const pendingMode = (room.pomodoro_pending_mode ?? null) as string | null;

      // Apply pending mode only when transitioning break → work (not applicable for custom mode)
      let nextMode = currentMode;
      let clearPending = false;
      if (pendingMode && currentPhase === "break" && currentMode !== "custom") {
        nextMode = pendingMode;
        clearPending = true;
      }

      await supabase.from("rooms").update({
        pomodoro_mode: nextMode,
        pomodoro_phase: nextPhase,
        pomodoro_running: true,
        pomodoro_phase_duration: phaseDuration(room, nextMode, nextPhase),
        pomodoro_started_at: new Date().toISOString(),
        pomodoro_pending_mode: clearPending ? null : room.pomodoro_pending_mode,
      }).eq("id", roomId);
      break;
    }

    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
