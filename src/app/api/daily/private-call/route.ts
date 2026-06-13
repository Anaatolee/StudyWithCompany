import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createDailyMeetingToken, createDailyRoom } from "@/lib/daily";

// POST /api/daily/private-call
// body: { peerUserId: string }
// Creates a short-lived 1-on-1 Daily room with audio enabled and returns a
// meeting token for the *caller*. The caller broadcasts the room URL to the
// peer via Supabase Realtime.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { peerUserId } = (await request.json()) as { peerUserId?: string };
  if (!peerUserId || peerUserId === user.id)
    return NextResponse.json({ error: "invalid peer" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const userName = profile?.username ?? "anonyme";
  const callId = randomUUID();
  const roomName = `call-${callId.slice(0, 12)}`;

  try {
    const room = await createDailyRoom({
      name: roomName,
      privacy: "private",
      expiresInSeconds: 60 * 60,
    });

    const token = await createDailyMeetingToken({
      roomName: room.name,
      userId: user.id,
      userName,
      isOwner: true,
      startAudioOff: false,
      expiresInSeconds: 60 * 60,
    });

    return NextResponse.json({
      callId,
      roomName: room.name,
      roomUrl: room.url,
      token,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "private call provisioning failed" },
      { status: 500 }
    );
  }
}
