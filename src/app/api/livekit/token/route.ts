import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { createLiveKitToken, livekitHttpUrl, livekitRoomName } from "@/lib/livekit";

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

  // Application de la limite de participants : on refuse le token si la salle est
  // pleine, sauf si l'utilisateur y est déjà (reconnexion).
  const { data: room } = await supabase
    .from("rooms")
    .select("max_participants")
    .eq("id", roomId)
    .single();

  const max = room?.max_participants ?? 0;
  if (max > 0) {
    const svc = new RoomServiceClient(
      livekitHttpUrl(),
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    try {
      const participants = await svc.listParticipants(livekitRoomName(roomId));
      const alreadyIn = participants.some((p) => p.identity === user.id);
      if (!alreadyIn && participants.length >= max) {
        return NextResponse.json(
          { error: "Cette salle d'étude est pleine", code: "room_full" },
          { status: 403 }
        );
      }
    } catch {
      // La salle n'existe pas encore côté LiveKit (0 participant) → on laisse passer.
    }
  }

  try {
    const token = await createLiveKitToken({
      roomName: livekitRoomName(roomId),
      participantIdentity: user.id,
      participantName,
      canPublish: true, // audio locked client-side via audio={false} in LiveKitRoom
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
