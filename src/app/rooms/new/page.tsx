import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import type { Profile, Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/rooms/new");

  const [{ data: profile }, { data: subjects }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("subjects").select("*").order("sort_order"),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={(profile as Profile) ?? null} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Créer une salle</h1>
          <p className="text-muted">Configurez votre espace d'étude personnalisé.</p>
        </div>
        <CreateRoomForm subjects={(subjects ?? []) as Subject[]} />
      </main>
    </div>
  );
}
