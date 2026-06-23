"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Clock, Search, UserCheck, UserPlus, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Avatar } from "@/components/Avatar";
import type { Friendship, FriendState } from "@/lib/types";

type Props = { currentUserId: string };

type PeerProfile = { id: string; username: string; avatar_url: string | null; bio: string | null };
type Row = Friendship & { peer: PeerProfile };

export function FriendsDashboard({ currentUserId }: Props) {
  const supabase = useRef(createClient()).current;
  const [friends, setFriends] = useState<Row[]>([]);
  const [incoming, setIncoming] = useState<Row[]>([]);
  const [outgoing, setOutgoing] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PeerProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const { data: rows } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (!rows) { setLoading(false); return; }

    // Récupère les profils des autres utilisateurs impliqués
    const peerIds = rows.map((r: Friendship) =>
      r.requester_id === currentUserId ? r.addressee_id : r.requester_id
    );
    const profileMap: Record<string, PeerProfile> = {};
    if (peerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .in("id", peerIds);
      for (const p of profiles ?? []) profileMap[p.id] = p as PeerProfile;
    }

    const withPeer: Row[] = rows.map((r: Friendship) => {
      const peerId = r.requester_id === currentUserId ? r.addressee_id : r.requester_id;
      return { ...r, peer: profileMap[peerId] ?? { id: peerId, username: "Utilisateur", avatar_url: null, bio: null } };
    });

    setFriends(withPeer.filter((r) => r.status === "accepted"));
    setIncoming(withPeer.filter((r) => r.status === "pending" && r.addressee_id === currentUserId));
    setOutgoing(withPeer.filter((r) => r.status === "pending" && r.requester_id === currentUserId));
    setLoading(false);
  }, [supabase, currentUserId]);

  useEffect(() => {
    load();
    // Rafraîchit en direct dès qu'une relation me concernant change
    const channel = supabase
      .channel(`friendships:${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, currentUserId, load]);

  async function accept(row: Row) {
    await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    load();
  }

  async function remove(row: Row) {
    await supabase.from("friendships").delete().eq("id", row.id);
    load();
  }

  async function sendRequest(peerId: string) {
    await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: peerId,
      status: "pending",
    });
    load();
  }

  async function acceptById(rowId: string) {
    await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", rowId);
    load();
  }

  // Recherche d'utilisateurs à ajouter (par pseudo, insensible à la casse, debounce 300 ms)
  useEffect(() => {
    const q = userSearch.trim();
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .ilike("username", `%${q}%`)
        .neq("id", currentUserId)
        .limit(12);
      setSearchResults((data ?? []) as PeerProfile[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, supabase, currentUserId]);

  // État de relation vis-à-vis d'un utilisateur (pour les résultats de recherche)
  function stateOf(peerId: string): { state: FriendState; rowId: string | null } {
    const f = friends.find((r) => r.peer.id === peerId);
    if (f) return { state: "friends", rowId: f.id };
    const inc = incoming.find((r) => r.peer.id === peerId);
    if (inc) return { state: "incoming", rowId: inc.id };
    const out = outgoing.find((r) => r.peer.id === peerId);
    if (out) return { state: "outgoing", rowId: out.id };
    return { state: "none", rowId: null };
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[760px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/rooms" className="flex items-center gap-[11px]">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-accent grid place-items-center">
              <BookOpen className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </span>
            <span className="font-display font-bold text-[20px] tracking-[-0.01em]">StudyWithCompany</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/rooms"
              className="flex items-center gap-1.5 text-muted font-semibold text-[14.5px] px-3 py-2 rounded-[9px] hover:bg-surface-2 hover:text-foreground transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-7 pt-[clamp(28px,4vw,44px)] pb-20">
        <div className="mb-7">
          <h1 className="font-display font-bold text-[clamp(28px,4vw,40px)] leading-[1.05] tracking-[-0.025em] mb-2">
            Amis
          </h1>
          <p className="text-muted text-[16px]">
            Ajoutez des amis pour pouvoir les appeler en vocal dans les salles.
          </p>
        </div>

        {/* Recherche d'utilisateurs à ajouter */}
        <div className="mb-7">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted pointer-events-none" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Rechercher un utilisateur par son pseudo…"
              className="w-full bg-surface border border-border rounded-[12px] pl-11 pr-4 py-[13px] text-[15px] text-foreground placeholder:text-muted outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_3px_rgba(47,125,196,.14)]"
            />
          </div>

          {userSearch.trim().length >= 2 && (
            <div className="mt-2 bg-surface border border-border rounded-2xl overflow-hidden">
              {searching ? (
                <p className="text-muted text-[14px] px-5 py-5 text-center">Recherche…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-muted text-[14px] px-5 py-5 text-center">Aucun utilisateur trouvé.</p>
              ) : (
                <div className="px-3 py-2 flex flex-col">
                  {searchResults.map((u) => {
                    const { state, rowId } = stateOf(u.id);
                    return (
                      <div key={u.id} className="flex items-center gap-[11px] px-3 py-2.5 rounded-[11px] hover:bg-surface-2 transition">
                        <Avatar url={u.avatar_url} name={u.username} identity={u.id} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14.5px] font-semibold text-foreground truncate">{u.username}</p>
                          {u.bio && <p className="text-[12.5px] text-muted truncate">{u.bio}</p>}
                        </div>
                        <div className="shrink-0">
                          {state === "friends" ? (
                            <span className="flex items-center gap-1.5 text-[#46d784] font-semibold text-[13px]">
                              <UserCheck className="w-4 h-4" /> Amis
                            </span>
                          ) : state === "outgoing" ? (
                            <span className="flex items-center gap-1.5 text-muted font-semibold text-[13px]">
                              <Clock className="w-4 h-4" /> Envoyée
                            </span>
                          ) : state === "incoming" && rowId ? (
                            <button
                              onClick={() => acceptById(rowId)}
                              className="flex items-center gap-1.5 bg-accent text-white font-semibold text-[13.5px] px-3.5 py-2 rounded-[9px] hover:opacity-90 transition"
                            >
                              <Check className="w-4 h-4" /> Accepter
                            </button>
                          ) : (
                            <button
                              onClick={() => sendRequest(u.id)}
                              className="flex items-center gap-1.5 bg-accent text-white font-semibold text-[13.5px] px-3.5 py-2 rounded-[9px] hover:opacity-90 transition"
                            >
                              <UserPlus className="w-4 h-4" /> Ajouter
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-muted text-[15px]">Chargement…</p>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Demandes reçues */}
            {incoming.length > 0 && (
              <Section title={`Demandes reçues (${incoming.length})`} icon={UserPlus}>
                {incoming.map((row) => (
                  <RowItem key={row.id} row={row}>
                    <button
                      onClick={() => accept(row)}
                      className="flex items-center gap-1.5 bg-accent text-white font-semibold text-[13.5px] px-3.5 py-2 rounded-[9px] hover:opacity-90 transition"
                    >
                      <Check className="w-4 h-4" /> Accepter
                    </button>
                    <button
                      onClick={() => remove(row)}
                      className="flex items-center gap-1.5 bg-surface-2 text-muted font-semibold text-[13.5px] px-3.5 py-2 rounded-[9px] hover:text-foreground transition"
                    >
                      <X className="w-4 h-4" /> Refuser
                    </button>
                  </RowItem>
                ))}
              </Section>
            )}

            {/* Mes amis */}
            <Section title={`Mes amis (${friends.length})`} icon={Users}>
              {friends.length === 0 ? (
                <Empty text="Vous n'avez pas encore d'amis. Ajoutez-en depuis le panneau Participants d'une salle." />
              ) : (
                friends.map((row) => (
                  <RowItem key={row.id} row={row}>
                    <button
                      onClick={() => remove(row)}
                      className="flex items-center gap-1.5 bg-surface-2 text-muted font-semibold text-[13.5px] px-3.5 py-2 rounded-[9px] hover:text-[#c0392f] transition"
                    >
                      <X className="w-4 h-4" /> Retirer
                    </button>
                  </RowItem>
                ))
              )}
            </Section>

            {/* Demandes envoyées */}
            {outgoing.length > 0 && (
              <Section title={`Demandes envoyées (${outgoing.length})`} icon={Clock}>
                {outgoing.map((row) => (
                  <RowItem key={row.id} row={row}>
                    <span className="flex items-center gap-1.5 text-muted font-semibold text-[13px]">
                      <Clock className="w-4 h-4" /> En attente
                    </span>
                    <button
                      onClick={() => remove(row)}
                      className="flex items-center gap-1.5 bg-surface-2 text-muted font-semibold text-[13.5px] px-3.5 py-2 rounded-[9px] hover:text-foreground transition"
                    >
                      <X className="w-4 h-4" /> Annuler
                    </button>
                  </RowItem>
                ))}
              </Section>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-7 py-5 border-b border-border">
        <span className="w-8 h-8 rounded-[9px] bg-accent-soft text-accent grid place-items-center shrink-0">
          <Icon className="w-[17px] h-[17px]" />
        </span>
        <h2 className="font-display font-bold text-[17px]">{title}</h2>
      </div>
      <div className="px-4 py-3 flex flex-col">{children}</div>
    </section>
  );
}

function RowItem({ row, children }: { row: Row; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[11px] px-3 py-2.5 rounded-[11px] hover:bg-surface-2 transition">
      <Avatar url={row.peer.avatar_url} name={row.peer.username} identity={row.peer.id} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold text-foreground truncate">{row.peer.username}</p>
        {row.peer.bio && <p className="text-[12.5px] text-muted truncate">{row.peer.bio}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted text-[14px] px-3 py-6 text-center">{text}</p>;
}
