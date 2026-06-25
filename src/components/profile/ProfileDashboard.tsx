"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AtSign, BookOpen, Camera, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Profile | null;
  email: string;
  createdAt: string;
};

export function ProfileDashboard({ profile, email, createdAt }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memberSince = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file || !profile) return;

    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Veuillez choisir un fichier image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image trop lourde (2 Mo maximum).");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${profile.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (upErr) {
      setUploading(false);
      setError("Échec de l'envoi de l'image. Réessayez.");
      return;
    }

    // Cache-busting : sans le ?t, le navigateur garderait l'ancienne image (même URL)
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    setUploading(false);
    if (updErr) {
      setError("La photo a été envoyée mais le profil n'a pas pu être mis à jour.");
      return;
    }
    setAvatarUrl(publicUrl);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError("");

    const trimmedName = username.trim();
    if (trimmedName.length < 3) {
      setError("Le pseudo doit contenir au moins 3 caractères.");
      return;
    }
    if (trimmedName.length > 24) {
      setError("Le pseudo ne peut pas dépasser 24 caractères.");
      return;
    }

    setStatus("saving");
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ username: trimmedName, bio: bio.trim() || null })
      .eq("id", profile.id);

    if (updErr) {
      setStatus("error");
      setError(
        updErr.code === "23505"
          ? "Ce pseudo est déjà pris."
          : "La mise à jour a échoué. Réessayez."
      );
      return;
    }

    // Synchronise le display name dans auth.users.raw_user_meta_data
    // pour qu'il apparaisse dans le dashboard Supabase (Authentication > Users)
    await supabase.auth.updateUser({ data: { full_name: trimmedName } });

    setUsername(trimmedName);
    setStatus("success");
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setStatus("idle"), 4000);
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[760px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/rooms" className="flex items-center gap-[11px]">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-accent grid place-items-center">
              <BookOpen className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </span>
            <span className="font-display font-bold text-[20px] tracking-[-0.01em]">
              StudyWithCompany
            </span>
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
        <div className="mb-9">
          <h1 className="font-display font-bold text-[clamp(28px,4vw,40px)] leading-[1.05] tracking-[-0.025em] mb-2">
            Mon profil
          </h1>
          <p className="text-muted text-[16px]">
            Votre photo et votre bio sont visibles par les autres membres dans les salles.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          noValidate
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          {/* Bandeau photo + identité */}
          <div className="flex items-center gap-6 px-7 py-7 border-b border-border">
            <div className="relative shrink-0">
              <Avatar url={avatarUrl} name={username || "?"} identity={profile?.id ?? ""} size={88} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-accent text-white grid place-items-center shadow-[0_4px_12px_rgba(47,125,196,.35)] border-[3px] border-surface hover:opacity-90 transition disabled:opacity-60"
                title="Changer la photo"
              >
                {uploading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera className="w-[17px] h-[17px]" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-[22px] tracking-[-0.01em] truncate">
                @{username || "—"}
              </p>
              <p className="text-[13.5px] text-muted mt-0.5">{email}</p>
              <p className="text-[13px] text-muted mt-1.5">Membre depuis le {memberSince}</p>
            </div>
          </div>

          {/* Champs */}
          <div className="px-7 py-7 flex flex-col gap-5">
            <div>
              <label className="block text-[13.5px] font-semibold text-foreground mb-2">Pseudo</label>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={24}
                  placeholder="votre_pseudo"
                  className="w-full bg-background border border-border rounded-[10px] pl-10 pr-4 py-[11px] text-[14.5px] text-foreground placeholder:text-muted outline-none transition-[border-color] focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13.5px] font-semibold text-foreground mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                rows={4}
                placeholder="Parlez un peu de vous, de ce que vous étudiez…"
                className="w-full bg-background border border-border rounded-[10px] px-4 py-[11px] text-[14.5px] text-foreground placeholder:text-muted outline-none transition-[border-color] focus:border-accent resize-none leading-[1.5]"
              />
              <div className="text-right text-[12px] text-muted mt-1">{bio.length}/280</div>
            </div>

            {error && (
              <p className="text-[13.5px] text-[#c0392f] font-medium">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={status === "saving" || !username.trim()}
                className="flex items-center gap-2 bg-accent text-white font-semibold text-[14.5px] px-5 py-[11px] rounded-[10px] shadow-[0_6px_16px_rgba(47,125,196,.25)] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "saving" ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {status === "saving" ? "Enregistrement…" : "Enregistrer"}
              </button>

              {status === "success" && (
                <span className="flex items-center gap-1.5 text-[#2ecc71] font-semibold text-[14px]">
                  <Check className="w-4 h-4" />
                  Profil mis à jour
                </span>
              )}
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
