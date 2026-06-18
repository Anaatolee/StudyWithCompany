"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { RoomCard } from "./RoomCard";
import { subjectIcon } from "@/lib/subjects";
import type { Room, Subject } from "@/lib/types";

type Tab = "subjects" | "community";

type Props = {
  userId: string;
  rooms: Room[];
  subjects: Subject[];
};

export function RoomsPageClient({ userId, rooms, subjects }: Props) {
  const [tab, setTab] = useState<Tab>("subjects");
  const [query, setQuery] = useState("");

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const myRooms = useMemo(
    () => rooms.filter((r) => r.created_by === userId),
    [rooms, userId]
  );

  // Default seeded rooms (created_by IS NULL) grouped by subject
  const seededRoomsBySubject = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const r of rooms) {
      if (r.created_by !== null) continue;
      const arr = map.get(r.subject_id) ?? [];
      arr.push(r);
      map.set(r.subject_id, arr);
    }
    return map;
  }, [rooms]);

  // Community rooms: public + created by a user (any user)
  const communityRooms = useMemo(
    () => rooms.filter((r) => r.is_public && r.created_by !== null),
    [rooms]
  );

  const filteredCommunity = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communityRooms;
    return communityRooms.filter((r) => {
      const subject = subjectMap.get(r.subject_id);
      return (
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        subject?.name.toLowerCase().includes(q)
      );
    });
  }, [communityRooms, query, subjectMap]);

  return (
    <div className="space-y-8">
      {/* Mes salles — always visible above tabs */}
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

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-border mb-6">
          {([
            { key: "subjects", label: "Par matière" },
            { key: "community", label: "Salles de la communauté" },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setQuery(""); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                tab === key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Par matière */}
        {tab === "subjects" && (
          <div className="space-y-10">
            {subjects.map((subject) => {
              const Icon = subjectIcon(subject.icon);
              const list = seededRoomsBySubject.get(subject.id) ?? [];
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
                    <span className="text-xs text-muted">
                      ({list.length} salle{list.length > 1 ? "s" : ""})
                    </span>
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
        )}

        {/* Tab: Communauté */}
        {tab === "community" && (
          <div className="space-y-6">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par nom, description ou matière…"
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:border-accent transition"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {filteredCommunity.length === 0 ? (
              <p className="text-center text-muted py-12 text-sm">
                {query ? `Aucune salle ne correspond à « ${query} »` : "Aucune salle communautaire publique pour l'instant."}
              </p>
            ) : (
              <>
                {query && (
                  <p className="text-xs text-muted">
                    {filteredCommunity.length} résultat{filteredCommunity.length > 1 ? "s" : ""}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCommunity.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
