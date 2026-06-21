import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomsDashboard } from "@/components/rooms/RoomsDashboard";
import { DaylightWrapper } from "@/components/DaylightWrapper";
import type { Profile, Room, Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: subjects }, { data: rooms }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("subjects").select("*").order("sort_order"),
    supabase.from("rooms").select("*")
      .or(`is_public.eq.true,created_by.eq.${user.id}`)
      .order("created_at"),
  ]);

  return (
    <DaylightWrapper className="min-h-screen bg-background text-foreground">
      <RoomsDashboard
        userId={user.id}
        profile={(profile as Profile) ?? null}
        rooms={(rooms ?? []) as Room[]}
        subjects={(subjects ?? []) as Subject[]}
      />
    </DaylightWrapper>
  );
}
