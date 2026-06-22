import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DaylightWrapper } from "@/components/DaylightWrapper";
import { StatsDashboard } from "@/components/stats/StatsDashboard";
import type { Profile, StudySession, Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: subjects }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("subjects").select("*").order("sort_order"),
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(5000),
  ]);

  return (
    <DaylightWrapper className="min-h-screen bg-background text-foreground">
      <StatsDashboard
        profile={(profile as Profile) ?? null}
        subjects={(subjects ?? []) as Subject[]}
        sessions={(sessions ?? []) as StudySession[]}
      />
    </DaylightWrapper>
  );
}
