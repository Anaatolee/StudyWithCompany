import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Admin client bypasses RLS — required so pomodoro state can be updated in seeded rooms
  // (which have created_by IS NULL, so the normal per-user RLS policy never matches).
  const admin = createAdminClient();

  switch (action) {
    // Called automatically when any participant first lands in a room.
    // First request wins; subsequent ones are no-ops (idempotent via pomodoro_started_at check).
    case "start": {
      // Creator can always start. For seeded rooms (created_by IS NULL) any authenticated user can.
      const canStart = room.created_by === user.id || room.created_by === null;
      if (!canStart) return NextResponse.json({ error: "forbidden" }, { status: 403 });
      if (!room.pomodoro_started_at) {
        const mode = (room.pomodoro_mode ?? "25/5") as string;
        const phase = (room.pomodoro_phase ?? "work") as Phase;
        await admin.from("rooms").update({
          pomodoro_running: true,
          pomodoro_started_at: new Date().toISOString(),
          pomodoro_mode: mode,
          pomodoro_phase: phase,
          pomodoro_phase_duration: phaseDuration(room, mode, phase),
        }).eq("id", roomId);
      }
      break;
    }

    case "set_pending_mode": {
      if (room.created_by !== user.id) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (currentMode === "custom") return NextResponse.json({ ok: true });
      const m = (newMode === "50/10" ? "50/10" : "25/5") as PresetMode;
      await admin.from("rooms").update({
        pomodoro_pending_mode: m === currentMode ? null : m,
      }).eq("id", roomId);
      break;
    }

    case "next_phase": {
      // Idempotency: ignore if the phase hasn't actually expired yet (duplicate requests)
      if (room.pomodoro_started_at && room.pomodoro_phase_duration) {
        const elapsed = Math.floor(
          (Date.now() - new Date(room.pomodoro_started_at).getTime()) / 1000
        );
        if (elapsed < room.pomodoro_phase_duration - 5) {
          return NextResponse.json({ ok: true });
        }
      }

      const nextPhase: Phase = currentPhase === "work" ? "break" : "work";
      const pendingMode = (room.pomodoro_pending_mode ?? null) as string | null;

      let nextMode = currentMode;
      let clearPending = false;
      if (pendingMode && currentPhase === "break" && currentMode !== "custom") {
        nextMode = pendingMode;
        clearPending = true;
      }

      await admin.from("rooms").update({
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
