import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Mode = "25/5" | "50/10";
type Phase = "work" | "break";
const MODES: Record<Mode, Record<Phase, number>> = {
  "25/5":  { work: 25 * 60, break: 5 * 60 },
  "50/10": { work: 50 * 60, break: 10 * 60 },
};

// PATCH /api/rooms/[roomId]/pomodoro
// action: 'start' | 'pause' | 'reset' | 'set_mode' | 'next_phase'
// Only the room creator can control the shared timer.
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
    .select("created_by, pomodoro_mode, pomodoro_phase, pomodoro_phase_duration, pomodoro_started_at")
    .eq("id", roomId)
    .single();

  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (room.created_by !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { action, mode: newMode } = (await request.json()) as {
    action: string;
    mode?: string;
  };

  const currentMode = (room.pomodoro_mode ?? "25/5") as Mode;
  const currentPhase = (room.pomodoro_phase ?? "work") as Phase;

  switch (action) {
    case "start": {
      await supabase.from("rooms").update({
        pomodoro_running: true,
        pomodoro_started_at: new Date().toISOString(),
      }).eq("id", roomId);
      break;
    }

    case "pause": {
      const elapsed = room.pomodoro_started_at
        ? Math.floor((Date.now() - new Date(room.pomodoro_started_at).getTime()) / 1000)
        : 0;
      const remaining = Math.max(0, (room.pomodoro_phase_duration ?? 0) - elapsed);
      await supabase.from("rooms").update({
        pomodoro_running: false,
        pomodoro_phase_duration: remaining,
        pomodoro_started_at: null,
      }).eq("id", roomId);
      break;
    }

    case "reset": {
      await supabase.from("rooms").update({
        pomodoro_running: false,
        pomodoro_phase: "work",
        pomodoro_phase_duration: MODES[currentMode].work,
        pomodoro_started_at: null,
      }).eq("id", roomId);
      break;
    }

    case "set_mode": {
      const m = (newMode === "50/10" ? "50/10" : "25/5") as Mode;
      await supabase.from("rooms").update({
        pomodoro_mode: m,
        pomodoro_running: false,
        pomodoro_phase: "work",
        pomodoro_phase_duration: MODES[m].work,
        pomodoro_started_at: null,
      }).eq("id", roomId);
      break;
    }

    case "next_phase": {
      const nextPhase: Phase = currentPhase === "work" ? "break" : "work";
      await supabase.from("rooms").update({
        pomodoro_phase: nextPhase,
        pomodoro_running: false,
        pomodoro_phase_duration: MODES[currentMode][nextPhase],
        pomodoro_started_at: null,
      }).eq("id", roomId);
      break;
    }

    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
