import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDailyMeetingToken } from "@/lib/daily";

// POST /api/daily/private-call/join
// body: { roomName: string }
// Issues a meeting token (audio enabled) for the callee to join an existing
// private call room. We don't verify the invite server-side beyond auth — the
// Daily room name is shared via Supabase Realtime, which is auth-gated.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { roomName } = (await request.json()) as { roomName?: string };
  if (!roomName || !roomName.startsWith("call-"))
    return NextResponse.json({ error: "invalid room" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const userName = profile?.username ?? "anonyme";

  try {
    const token = await createDailyMeetingToken({
      roomName,
      userId: user.id,
      userName,
      startAudioOff: false,
      expiresInSeconds: 60 * 60,
    });
    return NextResponse.json({ token });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "could not generate token" },
      { status: 500 }
    );
  }
}
