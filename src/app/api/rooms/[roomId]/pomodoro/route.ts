import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Mode = "25/5" | "50/10";
type Phase = "work" | "break";
const MODES: Record<Mode, Record<Phase, number>> = {
  "25/5":  { work: 25 * 60, break: 5 * 60 },
  "50/10": { work: 50 * 60, break: 10 * 60 },
};

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

  const { data: room } = await supabase
    .from("rooms")
    .select("created_by, pomodoro_mode, pomodoro_phase, pomodoro_phase_duration, pomodoro_started_at, pomodoro_pending_mode")
    .eq("id", roomId)
    .single();

  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { action, mode: newMode } = (await request.json()) as {
    action: string;
    mode?: string;
  };

  const currentMode = (room.pomodoro_mode ?? "25/5") as Mode;
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
      const m = (newMode === "50/10" ? "50/10" : "25/5") as Mode;
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
      const pendingMode = (room.pomodoro_pending_mode ?? null) as Mode | null;

      // Apply pending mode only when transitioning break → work
      let nextMode = currentMode;
      let clearPending = false;
      if (pendingMode && currentPhase === "break") {
        nextMode = pendingMode;
        clearPending = true;
      }

      await supabase.from("rooms").update({
        pomodoro_mode: nextMode,
        pomodoro_phase: nextPhase,
        pomodoro_running: true,
        pomodoro_phase_duration: MODES[nextMode][nextPhase],
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
