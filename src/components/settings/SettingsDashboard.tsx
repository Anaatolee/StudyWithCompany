"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Check, Eye, EyeOff, KeyRound, Lock,
  Moon, Settings, Sun, User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/lib/ThemeContext";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Profile | null;
  email: string;
  createdAt: string;
};

// ── Preference helpers ────────────────────────────────────────────────────────

function getPref(key: string, defaultVal: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? defaultVal : v === "true"; }
  catch { return defaultVal; }
}
function setPref(key: string, val: boolean) {
  try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-7 py-5 border-b border-border">
        <span className="w-8 h-8 rounded-[9px] bg-accent-soft text-accent grid place-items-center shrink-0">
          <Icon className="w-[17px] h-[17px]" />
        </span>
        <h2 className="font-display font-bold text-[17px]">{title}</h2>
      </div>
      <div className="px-7 py-6">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
      <span className="text-[14px] font-semibold text-muted">{label}</span>
      <span className="text-[14.5px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold text-foreground">{label}</p>
        {description && <p className="text-[13px] text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-[42px] h-[24px] rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-[left] duration-200"
          style={{ left: checked ? "21px" : "3px" }}
        />
      </button>
    </div>
  );
}

function PasswordInput({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-[13.5px] font-semibold text-foreground mb-2">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          autoComplete="new-password"
          className="w-full bg-background border border-border rounded-[10px] px-4 py-[11px] pr-11 text-[14.5px] text-foreground placeholder:text-muted outline-none transition-[border-color] focus:border-accent"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsDashboard({ profile, email, createdAt }: Props) {
  const { isDark, toggle: toggleTheme } = useTheme();

  // Preferences (from localStorage, hydrated after mount)
  const [sound, setSound] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    setSound(getPref("swc-pomodoro-sound", true));
    setReduceMotion(getPref("swc-reduce-motion", false));
    setPrefsReady(true);
  }, []);

  function handleSound(val: boolean) {
    setSound(val);
    setPref("swc-pomodoro-sound", val);
  }

  function handleReduceMotion(val: boolean) {
    setReduceMotion(val);
    setPref("swc-reduce-motion", val);
    document.documentElement.classList.toggle("reduce-motion", val);
  }

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdStatus, setPwdStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwdError, setPwdError] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");

    if (newPwd.length < 8) {
      setPwdError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (currentPwd === newPwd) {
      setPwdError("Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }

    setPwdStatus("loading");
    const supabase = createClient();

    // Vérifie le mot de passe actuel en tentant une reconnexion silencieuse
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPwd,
    });

    if (signInError) {
      setPwdStatus("error");
      setPwdError("Mot de passe actuel incorrect.");
      return;
    }

    // Applique le nouveau mot de passe
    const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });

    if (updateError) {
      setPwdStatus("error");
      setPwdError(updateError.message);
      return;
    }

    setPwdStatus("success");
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setPwdStatus("idle"), 4000);
  }

  const username = profile?.username ?? "—";
  const memberSince = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

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
            Paramètres
          </h1>
          <p className="text-muted text-[16px]">Gérez votre compte et vos préférences.</p>
        </div>

        <div className="flex flex-col gap-5">

          {/* ── Informations du compte ─────────────────────────────────── */}
          <SectionCard title="Informations du compte" icon={User}>
            <InfoRow label="Pseudo" value={`@${username}`} />
            <InfoRow label="Adresse e-mail" value={email} />
            <InfoRow label="Membre depuis" value={memberSince} />
          </SectionCard>

          {/* ── Changer le mot de passe ────────────────────────────────── */}
          <SectionCard title="Changer le mot de passe" icon={KeyRound}>
            <div className="flex items-start gap-3 bg-accent-soft border border-accent/20 rounded-[10px] px-4 py-3 mb-6">
              <Lock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-[13px] text-accent font-medium leading-snug">
                Votre mot de passe actuel est requis pour confirmer toute modification.
              </p>
            </div>

            <form onSubmit={handlePasswordChange} noValidate className="flex flex-col gap-4">
              <PasswordInput
                label="Mot de passe actuel"
                value={currentPwd}
                onChange={setCurrentPwd}
                placeholder="Votre mot de passe actuel"
              />
              <PasswordInput
                label="Nouveau mot de passe"
                value={newPwd}
                onChange={setNewPwd}
                placeholder="8 caractères minimum"
              />
              <PasswordInput
                label="Confirmer le nouveau mot de passe"
                value={confirmPwd}
                onChange={setConfirmPwd}
                placeholder="Répétez le nouveau mot de passe"
              />

              {pwdError && (
                <p className="text-[13.5px] text-[#c0392f] font-medium">{pwdError}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pwdStatus === "loading" || !currentPwd || !newPwd || !confirmPwd}
                  className="flex items-center gap-2 bg-accent text-white font-semibold text-[14.5px] px-5 py-[11px] rounded-[10px] shadow-[0_6px_16px_rgba(47,125,196,.25)] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwdStatus === "loading" ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  {pwdStatus === "loading" ? "Vérification…" : "Mettre à jour"}
                </button>

                {pwdStatus === "success" && (
                  <span className="flex items-center gap-1.5 text-[#2ecc71] font-semibold text-[14px]">
                    <Check className="w-4 h-4" />
                    Mot de passe mis à jour
                  </span>
                )}
              </div>
            </form>
          </SectionCard>

          {/* ── Préférences ────────────────────────────────────────────── */}
          <SectionCard title="Préférences" icon={Settings}>
            {/* Thème */}
            <div className="flex items-center justify-between gap-6 py-4 border-b border-border">
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">Thème</p>
                <p className="text-[13px] text-muted mt-0.5">Apparence de l&apos;interface</p>
              </div>
              <div className="flex items-center gap-1 bg-surface-2 rounded-[10px] p-1">
                <button
                  onClick={() => isDark && toggleTheme()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition ${!isDark ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  <Sun className="w-3.5 h-3.5" /> Clair
                </button>
                <button
                  onClick={() => !isDark && toggleTheme()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition ${isDark ? "bg-surface shadow-sm text-foreground" : "text-muted hover:text-foreground"}`}
                >
                  <Moon className="w-3.5 h-3.5" /> Sombre
                </button>
              </div>
            </div>

            {/* Son Pomodoro */}
            {prefsReady && (
              <>
                <ToggleRow
                  label="Son du Pomodoro"
                  description="Bip sonore à la fin de chaque phase de travail ou de pause"
                  checked={sound}
                  onChange={handleSound}
                />
                <ToggleRow
                  label="Réduire les animations"
                  description="Désactive les transitions et animations dans toute l'application"
                  checked={reduceMotion}
                  onChange={handleReduceMotion}
                />
              </>
            )}
          </SectionCard>

        </div>
      </main>
    </>
  );
}
