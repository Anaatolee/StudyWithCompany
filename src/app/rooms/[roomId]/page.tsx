import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudyRoomClient } from "@/components/StudyRoomClient";
import type { Profile, Room, Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudyRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { roomId } = await params;
  const { invite } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/rooms/${roomId}`);

  const [{ data: room }, { data: profile }] = await Promise.all([
    supabase.from("rooms").select("*").eq("id", roomId).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  if (!room) notFound();

  // Private room: only creator or invite-link holders may enter
  if (!room.is_public && room.created_by !== user.id) {
    if (!invite || invite !== room.invite_token) {
      redirect("/rooms?error=private");
    }
  }

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", room.subject_id)
    .single();

  if (!subject || !profile) notFound();

  return (
    <StudyRoomClient
      room={room as Room}
      subject={subject as Subject}
      currentUser={profile as Profile}
    />
  );
}
