import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { RoomCard } from "@/components/RoomCard";
import { subjectIcon } from "@/lib/subjects";
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

  const subjectList = (subjects ?? []) as Subject[];
  const roomList = (rooms ?? []) as Room[];

  const myRooms = roomList.filter((r) => r.created_by === user.id);
  const publicOtherRooms = roomList.filter((r) => r.is_public && r.created_by !== user.id);

  const roomsBySubject = new Map<string, Room[]>();
  for (const room of publicOtherRooms) {
    const arr = roomsBySubject.get(room.subject_id) ?? [];
    arr.push(room);
    roomsBySubject.set(room.subject_id, arr);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={(profile as Profile) ?? null} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Salles d'étude</h1>
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

        <div className="space-y-10">
          {/* Mes salles */}
          {myRooms.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Mes salles</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myRooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            </section>
          )}

          {/* Salles publiques groupées par matière */}
          {subjectList.map((subject) => {
            const Icon = subjectIcon(subject.icon);
            const list = roomsBySubject.get(subject.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={subject.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${subject.color}20`, color: subject.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg font-semibold">{subject.name}</h2>
                  <span className="text-xs text-muted">({list.length} salle{list.length > 1 ? "s" : ""})</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
