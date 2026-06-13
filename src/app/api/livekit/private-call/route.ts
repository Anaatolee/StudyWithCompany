import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  createLiveKitToken,
  livekitPrivateRoomName,
} from "@/lib/livekit";

// POST /api/livekit/private-call
// body: { peerUserId: string }
// Creates a private call room name and returns a token (audio enabled)
// for the caller. The room is created lazily when the first participant joins.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { peerUserId } = (await request.json()) as { peerUserId?: string };
  if (!peerUserId || peerUserId === user.id)
    return NextResponse.json({ error: "invalid peer" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const participantName = profile?.username ?? "anonyme";
  const callId = randomUUID();
  const roomName = livekitPrivateRoomName(callId);

  try {
    const token = await createLiveKitToken({
      roomName,
      participantIdentity: user.id,
      participantName,
      canPublishAudio: true,
      canPublishVideo: false,
      ttlSeconds: 60 * 60,
    });

    return NextResponse.json({ callId, roomName, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[livekit/private-call]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
