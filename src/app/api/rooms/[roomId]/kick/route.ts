import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { livekitHttpUrl, livekitRoomName } from "@/lib/livekit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: room } = await supabase
    .from("rooms")
    .select("created_by")
    .eq("id", roomId)
    .single();

  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (room.created_by !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { userId } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }
  if (userId === user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const svc = new RoomServiceClient(
    livekitHttpUrl(),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );

  try {
    await svc.removeParticipant(livekitRoomName(roomId), userId);
  } catch {
    // Le participant a peut-être déjà quitté — pas bloquant
  }

  return NextResponse.json({ ok: true });
}
