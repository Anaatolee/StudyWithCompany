import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLiveKitToken } from "@/lib/livekit";

// POST /api/livekit/private-call/join
// body: { roomName: string }
// Issues a token (audio enabled) for the callee joining an existing private call.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { roomName } = (await request.json()) as { roomName?: string };
  if (!roomName || !roomName.startsWith("call-"))
    return NextResponse.json({ error: "invalid room" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const participantName = profile?.username ?? "anonyme";

  try {
    const token = await createLiveKitToken({
      roomName,
      participantIdentity: user.id,
      participantName,
      canPublish: true,
      ttlSeconds: 60 * 60,
    });

    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[livekit/private-call/join]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
