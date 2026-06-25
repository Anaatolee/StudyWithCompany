"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, LogOut, Plus, Search, Settings, TrendingUp, User, Users } from "lucide-react";
import { RoomCard } from "@/components/RoomCard";
import { CreateRoomModal } from "./CreateRoomModal";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Avatar } from "@/components/Avatar";
import { FriendRequestNotifier } from "@/components/FriendRequestNotifier";
import { createClient } from "@/lib/supabase/client";
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
  const [pendingRequests, setPendingRequests] = useState(0);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [presenceCounts, setPresenceCounts] = useState<Record<string, number>>({});

  // Compteurs de présence live (LiveKit) — rafraîchis toutes les 30 s
  useEffect(() => {
    const fetchPresence = () =>
      fetch("/api/rooms/presence")
        .then((r) => r.json())
        .then((d) => setPresenceCounts(d.counts ?? {}))
        .catch(() => {});
    fetchPresence();
    const id = setInterval(fetchPresence, 30_000);
    return () => clearInterval(id);
  }, []);

  // Nombre de demandes d'amis reçues en attente → badge sur l'entrée « Amis »
  useEffect(() => {
    const supabase = createClient();
    const loadPending = async () => {
      const { count } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", userId)
        .eq("status", "pending");
      setPendingRequests(count ?? 0);
    };
    loadPending();
    const channel = supabase
      .channel(`friendships-badge:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, loadPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

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
                <Avatar
                  url={profile?.avatar_url}
                  name={username}
                  identity={userId}
                  size={28}
                />
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
                      href="/profile"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[14px] font-semibold text-foreground hover:bg-surface-2 transition"
                    >
                      <User className="w-[18px] h-[18px] text-accent" />
                      Profil
                    </Link>
                    <Link
                      href="/friends"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[14px] font-semibold text-foreground hover:bg-surface-2 transition"
                    >
                      <Users className="w-[18px] h-[18px] text-accent" />
                      Amis
                      {pendingRequests > 0 && (
                        <span className="ml-auto bg-accent text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1.5 grid place-items-center">
                          {pendingRequests}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/stats"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[14px] font-semibold text-foreground hover:bg-surface-2 transition"
                    >
                      <TrendingUp className="w-[18px] h-[18px] text-accent" />
                      Mes statistiques
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[14px] font-semibold text-foreground hover:bg-surface-2 transition"
                    >
                      <Settings className="w-[18px] h-[18px] text-accent" />
                      Paramètres
                    </Link>
                    <div className="my-1 border-t border-border" />
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
                  <RoomCard room={room} subject={subject} online={presenceCounts[room.id] ?? 0} />
                </div>
              ))
            : filteredCommunityRooms.map((room) => (
                <div key={room.id} className="swc-fadeUp">
                  <RoomCard
                    room={room}
                    subject={subjectMap.get(room.subject_id)}
                    online={presenceCounts[room.id] ?? 0}
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

      <FriendRequestNotifier currentUserId={userId} />
    </>
  );
}

