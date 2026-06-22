"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, LogOut, Plus, Search, TrendingUp } from "lucide-react";
import { RoomCard } from "@/components/RoomCard";
import { CreateRoomModal } from "./CreateRoomModal";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import type { Profile, Room, Subject } from "@/lib/types";

type Tab = "subject" | "community";

type Props = {
  userId: string;
  profile: Profile | null;
  rooms: Room[];
  subjects: Subject[];
};

export function RoomsDashboard({ userId, profile, rooms, subjects }: Props) {
  const [tab, setTab] = useState<Tab>("subject");
  const [communitySearch, setCommunitySearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const myRooms = useMemo(() => rooms.filter((r) => r.created_by === userId), [rooms, userId]);

  // Default seeded rooms (created_by IS NULL), in subject sort order.
  const subjectRooms = useMemo(() => {
    const seeded = rooms.filter((r) => r.created_by === null);
    return subjects.flatMap((s) =>
      seeded.filter((r) => r.subject_id === s.id).map((room) => ({ room, subject: s }))
    );
  }, [rooms, subjects]);

  // Community rooms: public + created by a user.
  const communityRooms = useMemo(
    () => rooms.filter((r) => r.is_public && r.created_by !== null),
    [rooms]
  );

  // Search filter (community tab): matches name, description or subject name.
  const filteredCommunityRooms = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();
    if (!q) return communityRooms;
    return communityRooms.filter((room) => {
      const subjectName = subjectMap.get(room.subject_id)?.name ?? "";
      return (
        room.name.toLowerCase().includes(q) ||
        (room.description ?? "").toLowerCase().includes(q) ||
        subjectName.toLowerCase().includes(q)
      );
    });
  }, [communityRooms, communitySearch, subjectMap]);

  const username = profile?.username ?? "moi";
  const initial = username.charAt(0).toUpperCase();

  return (
    <>
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/rooms" className="flex items-center gap-[11px]">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-accent grid place-items-center">
              <BookOpen className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </span>
            <span className="font-display font-bold text-[20px] tracking-[-0.01em]">
              StudyWithCompany
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-surface-2 transition"
                title="Mon profil"
              >
                <span className="w-7 h-7 rounded-full bg-accent/15 grid place-items-center text-accent font-bold text-[12px]">
                  {initial}
                </span>
                <span className="text-muted font-semibold text-[14.5px] hidden sm:inline">
                  @{username}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-[13px] shadow-[0_18px_44px_rgba(25,34,46,.18)] p-1.5 z-40 swc-pop">
                    <Link
                      href="/stats"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[14px] font-semibold text-foreground hover:bg-surface-2 transition"
                    >
                      <TrendingUp className="w-[18px] h-[18px] text-accent" />
                      Mes statistiques
                    </Link>
                    <form action="/auth/signout" method="post">
                      <button
                        type="submit"
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[14px] font-semibold text-muted hover:bg-surface-2 hover:text-foreground transition"
                      >
                        <LogOut className="w-[18px] h-[18px]" />
                        Déconnexion
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
            <DarkModeToggle />
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1240px] mx-auto px-7 pt-[clamp(32px,4vw,52px)] pb-20">
        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display font-bold text-[clamp(32px,4vw,44px)] leading-[1.05] tracking-[-0.025em] mb-2.5">
              Salles d&apos;étude
            </h1>
            <p className="text-muted text-[16.5px] leading-[1.5]">
              Rejoignez une salle existante ou créez la vôtre.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-accent text-white font-semibold text-[15px] px-[22px] py-[13px] rounded-[11px] shadow-[0_8px_20px_rgba(47,125,196,.28)] hover:bg-[#2a6fad] transition"
          >
            <Plus className="w-[18px] h-[18px]" />
            Créer une salle
          </button>
        </div>

        {/* Mes salles */}
        {myRooms.length > 0 && (
          <section className="mb-[46px]">
            <h2 className="font-display font-bold text-[21px] tracking-[-0.01em] mb-[18px]">
              Mes salles
            </h2>
            <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
              {myRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  subject={subjectMap.get(room.subject_id)}
                  variant="mine"
                />
              ))}
            </div>
          </section>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-7">
          {([
            { key: "subject", label: "Par matière" },
            { key: "community", label: "Salles de la communauté" },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-[13px] text-[15px] -mb-px border-b-2 transition ${
                tab === key
                  ? "font-bold text-accent border-accent"
                  : "font-semibold text-muted border-transparent hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Community search */}
        {tab === "community" && (
          <div className="relative mb-6 max-w-[440px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted pointer-events-none" />
            <input
              type="text"
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
              placeholder="Rechercher une salle par nom, matière…"
              className="w-full bg-surface border border-border rounded-[11px] pl-11 pr-4 py-[12px] text-[14.5px] text-foreground placeholder:text-muted outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(47,125,196,.14)]"
            />
          </div>
        )}

        {/* Room grid */}
        <div
          key={tab}
          className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(264px,1fr))]"
        >
          {tab === "subject"
            ? subjectRooms.map(({ room, subject }) => (
                <div key={room.id} className="swc-fadeUp">
                  <RoomCard room={room} subject={subject} online={onlineCount(room)} />
                </div>
              ))
            : filteredCommunityRooms.map((room) => (
                <div key={room.id} className="swc-fadeUp">
                  <RoomCard
                    room={room}
                    subject={subjectMap.get(room.subject_id)}
                    online={onlineCount(room)}
                  />
                </div>
              ))}
        </div>

        {tab === "subject" && subjectRooms.length === 0 && (
          <p className="text-center text-muted py-12 text-sm">Aucune salle disponible.</p>
        )}
        {tab === "community" && filteredCommunityRooms.length === 0 && (
          <p className="text-center text-muted py-12 text-sm">
            {communitySearch.trim()
              ? `Aucune salle ne correspond à « ${communitySearch.trim()} ».`
              : "Aucune salle communautaire pour l'instant."}
          </p>
        )}
      </main>

      {/* Create modal */}
      {createOpen && (
        <CreateRoomModal
          subjects={subjects}
          onClose={() => setCreateOpen(false)}
          onError={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[26px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#19222e] text-[#f9fbfc] text-[14px] px-5 py-[13px] rounded-[13px] shadow-[0_18px_44px_rgba(25,34,46,.32)] swc-pop">
          <span className="w-[9px] h-[9px] rounded-full bg-[#5fbf7e] lp-pulse" />
          {toast}
        </div>
      )}
    </>
  );
}

// TODO(backend): replace with real live presence counts per room.
// Deterministic placeholder so the UI shows a stable "en ligne" number.
function onlineCount(room: Room): number {
  let h = 0;
  for (let i = 0; i < room.id.length; i++) h = (h * 31 + room.id.charCodeAt(i)) % 30;
  return h + 1;
}
