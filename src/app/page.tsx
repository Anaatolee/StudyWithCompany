import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";
import { DaylightWrapper } from "@/components/DaylightWrapper";

export const metadata: Metadata = {
  title: "StudyWithCompany",
  description:
    "Rejoignez des salles d'étude virtuelles par matière, allumez votre caméra, et travaillez aux côtés d'autres étudiants.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/rooms");

  return (
    <DaylightWrapper className="min-h-screen bg-background text-foreground">
      <Landing />
    </DaylightWrapper>
  );
}
