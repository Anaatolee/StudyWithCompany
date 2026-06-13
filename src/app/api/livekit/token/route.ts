import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLiveKitToken, livekitRoomName } from "@/lib/livekit";

// POST /api/livekit/token
// body: { roomId: string }
// Returns a LiveKit token for the current user to join the study room.
// Audio publish is disabled — mic is locked in public study rooms.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { roomId } = (await request.json()) as { roomId?: string };
  if (!roomId)
    return NextResponse.json({ error: "missing roomId" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const participantName = profile?.username ?? user.email ?? "anonyme";

  try {
    const token = await createLiveKitToken({
      roomName: livekitRoomName(roomId),
      participantIdentity: user.id,
      participantName,
      canPublishAudio: false,
      canPublishVideo: true,
    });

    return NextResponse.json({
      token,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[livekit/token]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
