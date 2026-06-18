import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { livekitHttpUrl, livekitRoomName } from "@/lib/livekit";

const EMPTY_THRESHOLD_MS = 5 * 60 * 1000;

// GET /api/cron/purge-empty-rooms
// Called every minute by an external cron service (cron-job.org).
// For each room with zero connected participants for more than 5 minutes:
//   - Default seeded rooms (created_by IS NULL): wipe chat messages only
//   - Community-created rooms (created_by IS NOT NULL): delete the room entirely
//     (messages are removed automatically via ON DELETE CASCADE)
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
    .select("id, created_by, empty_since");
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
      if (room.created_by) {
        // Community room — delete entirely, messages cascade automatically
        await supabase.from("rooms").delete().eq("id", room.id);
      } else {
        // Default seeded room — keep the room, only wipe messages
        await supabase.from("messages").delete().eq("room_id", room.id);
        await supabase.from("rooms").update({ empty_since: null }).eq("id", room.id);
      }
      purged++;
    }
  }

  return NextResponse.json({ ok: true, purged });
}
