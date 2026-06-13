import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createDailyMeetingToken,
  dailyRoomUrl,
  getOrCreateDailyRoom,
} from "@/lib/daily";

// POST /api/daily/room
// body: { roomId: string }
// Provisions (or reuses) the Daily.co room backing this study room and returns
// a meeting token for the current user. Audio is locked off.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { roomId } = (await request.json()) as { roomId?: string };
  if (!roomId)
    return NextResponse.json({ error: "missing roomId" }, { status: 400 });

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError || !room)
    return NextResponse.json({ error: "room not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const userName = profile?.username ?? user.email ?? "anonyme";

  const dailyRoomName = room.daily_room_name ?? `study-${room.id}`;

  try {
    const dailyRoom = await getOrCreateDailyRoom(dailyRoomName, {
      privacy: "private",
    });

    if (!room.daily_room_url) {
      await supabase
        .from("rooms")
        .update({
          daily_room_name: dailyRoom.name,
          daily_room_url: dailyRoom.url,
        })
        .eq("id", room.id);
    }

    // startAudioOff: true — mic locked at the token level.
    // The client also passes audioSource: false so the browser never requests mic.
    const token = await createDailyMeetingToken({
      roomName: dailyRoom.name,
      userId: user.id,
      userName,
      startAudioOff: true,
    });

    return NextResponse.json({
      url: dailyRoom.url ?? dailyRoomUrl(dailyRoom.name),
      token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[daily/room]", message);
    return NextResponse.json(
      { error: "daily provisioning failed", detail: message },
      { status: 500 }
    );
  }
}
