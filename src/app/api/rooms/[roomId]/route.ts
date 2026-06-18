import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/rooms/[roomId]
// Only the room creator can delete their room.
export async function DELETE(
  _request: Request,
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

  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
