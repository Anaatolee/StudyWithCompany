import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";
import { display, body } from "@/app/fonts";
import { daylightVars } from "@/lib/daylight";

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
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-background text-foreground`}
      style={{ ...daylightVars, fontFamily: "var(--font-body)" }}
    >
      <Landing />
    </div>
  );
}
