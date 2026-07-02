import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationsDashboard } from "@/components/conversations/ConversationsDashboard";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return <ConversationsDashboard currentUser={profile as Profile} />;
}
