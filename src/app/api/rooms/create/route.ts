import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { containsProfanity } from "@/lib/moderation";

const PRESET_WORK = { "25/5": 25 * 60, "50/10": 50 * 60 } as const;

function clampMin(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

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
    pomodoroCustomWork?: number;
    pomodoroCustomBreak?: number;
  };

  const { name, description, studyGoal, subjectId, color, isPublic, maxParticipants,
    pomodoroEnabled, pomodoroMode, pomodoroCustomWork, pomodoroCustomBreak } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!subjectId) return NextResponse.json({ error: "Matière requise" }, { status: 400 });

  const fieldsToCheck = [name, description, studyGoal].filter(Boolean) as string[];
  if (fieldsToCheck.some(containsProfanity)) {
    return NextResponse.json({ error: "Le contenu de la salle contient un langage inapproprié." }, { status: 422 });
  }

  const max = Math.min(60, Math.max(1, maxParticipants ?? 20));
  const inviteToken = isPublic ? null : randomUUID();

  const isCustom = pomodoroMode === "custom";
  const mode = isCustom ? "custom" : (pomodoroMode === "50/10" ? "50/10" : "25/5");

  // Durations in seconds
  const workDur = isCustom
    ? clampMin(pomodoroCustomWork ?? 25 * 60, 60, 240 * 60)
    : PRESET_WORK[mode as "25/5" | "50/10"];
  const breakDur = isCustom
    ? clampMin(pomodoroCustomBreak ?? 5 * 60, 60, 60 * 60)
    : Math.round(workDur / 5);

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
      pomodoro_phase_duration: pomodoroEnabled ? workDur : null,
      pomodoro_work_duration: isCustom ? workDur : null,
      pomodoro_break_duration: isCustom ? breakDur : null,
      pomodoro_running: false,
      pomodoro_started_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error("[rooms/create]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roomId: room.id, inviteToken });
}
