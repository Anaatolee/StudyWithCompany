import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const MODES = { "25/5": { work: 25 * 60 }, "50/10": { work: 50 * 60 } } as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    description?: string;
    studyGoal?: string;
    subjectId?: string;
    color?: string;
    isPublic?: boolean;
    maxParticipants?: number;
    pomodoroEnabled?: boolean;
    pomodoroMode?: string;
  };

  const { name, description, studyGoal, subjectId, color, isPublic, maxParticipants, pomodoroEnabled, pomodoroMode } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!subjectId) return NextResponse.json({ error: "Matière requise" }, { status: 400 });

  const max = Math.min(30, Math.max(1, maxParticipants ?? 20));
  const mode = (pomodoroMode === "50/10" ? "50/10" : "25/5") as "25/5" | "50/10";
  const inviteToken = isPublic ? null : randomUUID();

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      study_goal: studyGoal?.trim() || null,
      subject_id: subjectId,
      color: color || "#6366f1",
      is_public: isPublic !== false,
      invite_token: inviteToken,
      max_participants: max,
      created_by: user.id,
      pomodoro_enabled: pomodoroEnabled === true,
      pomodoro_mode: mode,
      pomodoro_phase: "work",
      pomodoro_phase_duration: pomodoroEnabled ? MODES[mode].work : null,
      pomodoro_running: pomodoroEnabled === true,
      pomodoro_started_at: pomodoroEnabled ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error("[rooms/create]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roomId: room.id, inviteToken });
}
