import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Keeps a study session alive: updates ended_at + duration server-side via the
// touch_study_session() function. Called on an interval and on leave/unload
// (the latter via sendBeacon, which posts text/plain — parsed defensively).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let sessionId: string | undefined;
  try {
    const text = await request.text();
    sessionId = text ? (JSON.parse(text) as { sessionId?: string }).sessionId : undefined;
  } catch {
    sessionId = undefined;
  }
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });

  const { error } = await supabase.rpc("touch_study_session", { p_session_id: sessionId });
  if (error) {
    console.error("[study/session/heartbeat]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
