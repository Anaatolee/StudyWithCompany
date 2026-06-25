import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { livekitHttpUrl } from "@/lib/livekit";

// GET /api/rooms/presence
// Public endpoint — returns live participant counts per room + global total.
// Used by the dashboard (room cards) and the landing page hero badge.
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ counts: {}, total: 0 });
  }

  try {
    const svc = new RoomServiceClient(livekitHttpUrl(), apiKey, apiSecret);
    const lkRooms = await svc.listRooms();

    const counts: Record<string, number> = {};
    let total = 0;

    for (const room of lkRooms) {
      // Skip private call rooms (call-*), only count study rooms (study-{roomId})
      if (!room.name.startsWith("study-")) continue;
      const roomId = room.name.slice("study-".length);
      const n = Number(room.numParticipants);
      counts[roomId] = n;
      total += n;
    }

    return NextResponse.json({ counts, total });
  } catch (err) {
    console.error("[rooms/presence]", err);
    return NextResponse.json({ counts: {}, total: 0 });
  }
}
