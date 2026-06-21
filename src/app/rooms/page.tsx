import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { RoomsPageClient } from "@/components/RoomsPageClient";
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
    <div className="min-h-screen flex flex-col">
      <Navbar profile={(profile as Profile) ?? null} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Salles d&apos;étude</h1>
            <p className="text-muted">Rejoignez une salle existante ou créez la vôtre.</p>
          </div>
          <Link
            href="/rooms/new"
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Créer une salle
          </Link>
        </div>

        <RoomsPageClient
          userId={user.id}
          rooms={(rooms ?? []) as Room[]}
          subjects={(subjects ?? []) as Subject[]}
        />
      </main>
    </div>
  );
}
