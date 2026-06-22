import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsDashboard } from "@/components/settings/SettingsDashboard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <SettingsDashboard
      profile={profile}
      email={user.email ?? ""}
      createdAt={user.created_at}
    />
  );
}
