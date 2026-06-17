import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { livekitHttpUrl, livekitRoomName } from "@/lib/livekit";

const EMPTY_THRESHOLD_MS = 5 * 60 * 1000;

// GET /api/cron/purge-empty-rooms
// Scheduled by vercel.json (every minute). For each study room with zero
// connected participants, tracks how long it's been empty; once it has been
// empty for more than 5 minutes, wipes its chat history.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const livekit = new RoomServiceClient(
    livekitHttpUrl(),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  const activeRooms = await livekit.listRooms();
  const participantCounts = new Map(
    activeRooms.map((r) => [r.name, r.numParticipants])
  );

  const supabase = createAdminClient();
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, empty_since");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  let purged = 0;

  for (const room of rooms ?? []) {
    const count = participantCounts.get(livekitRoomName(room.id)) ?? 0;

    if (count > 0) {
      if (room.empty_since) {
        await supabase.from("rooms").update({ empty_since: null }).eq("id", room.id);
      }
      continue;
    }

    if (!room.empty_since) {
      await supabase
        .from("rooms")
        .update({ empty_since: new Date().toISOString() })
        .eq("id", room.id);
      continue;
    }

    const emptyFor = now - new Date(room.empty_since).getTime();
    if (emptyFor >= EMPTY_THRESHOLD_MS) {
      await supabase.from("messages").delete().eq("room_id", room.id);
      purged++;
    }
  }

  return NextResponse.json({ ok: true, purged });
}
