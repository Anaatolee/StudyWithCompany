"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "w-full bg-background border border-border rounded-[12px] px-[14px] py-[13px] text-[15px] text-foreground placeholder:text-muted outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(47,125,196,.14)]";
const labelClass = "block text-[13.5px] font-semibold text-foreground mb-[7px]";

export function AuthCard({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/rooms";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");

  const isLogin = mode === "login";

  function switchMode() {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setEmailError("");
    setFormError("");
    setInfo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setFormError("");
    setInfo("");

    if (!EMAIL_RE.test(email)) {
      setEmailError("Entre une adresse email valide.");
      return;
    }
    if (!password) return; // abort silently, per spec

    const supabase = createClient();

    if (!isLogin) {
      const trimmed = name.trim();
      if (trimmed.length < 3) {
        setFormError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
        return;
      }
      setLoading(true);

      // Pré-vérifie que le pseudo n'est pas déjà pris (insensible à la casse)
      const { data: available, error: checkError } = await supabase.rpc(
        "username_is_available",
        { check_username: trimmed }
      );
      if (!checkError && available === false) {
        setFormError("Ce pseudo est déjà pris. Choisis-en un autre.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: trimmed },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setFormError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/rooms");
        router.refresh();
        return;
      }
      setInfo("Compte créé. Vérifie ton email pour confirmer ton inscription.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFormError(error.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleGoogle() {
    setFormError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setFormError(error.message);
  }

  async function handleForgotPassword() {
    setEmailError("");
    setFormError("");
    setInfo("");
    if (!EMAIL_RE.test(email)) {
      setEmailError("Entre ton email pour réinitialiser ton mot de passe.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/rooms`,
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setInfo("Email de réinitialisation envoyé. Vérifie ta boîte de réception.");
  }

  return (
    <div className="w-full max-w-[430px] bg-surface border border-border rounded-[22px] shadow-[0_30px_70px_rgba(25,34,46,.08),0_2px_6px_rgba(25,34,46,.04)] p-[clamp(30px,5vw,42px)] lp-rise">
      <h1 className="font-display font-bold text-[30px] tracking-[-0.02em] text-foreground mb-[7px]">
        {isLogin ? "Connexion" : "Créer un compte"}
      </h1>
      <p className="text-[15px] leading-[1.5] text-muted mb-7">
        {isLogin
          ? "Retrouvez vos camarades dans les salles d'étude."
          : "Rejoins les salles d'étude et avance avec les autres."}
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[18px]">
        {!isLogin && (
          <div>
            <label className={labelClass} htmlFor="auth-name">
              Nom d&apos;utilisateur
            </label>
            <input
              id="auth-name"
              type="text"
              autoComplete="username"
              placeholder="Ton prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="toi@exemple.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            className={inputClass}
          />
          {emailError && (
            <p className="mt-[7px] text-[12.5px] font-medium text-[#c0492f]">{emailError}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="auth-password">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPw ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-[44px]`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-[34px] h-[34px] grid place-items-center rounded-[8px] text-muted hover:bg-background transition"
            >
              {showPw ? <EyeOff className="w-[19px] h-[19px]" /> : <Eye className="w-[19px] h-[19px]" />}
            </button>
          </div>
        </div>

        {isLogin && (
          <div className="flex items-center justify-between -mt-1">
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              className="flex items-center gap-2 text-[14px] text-muted"
            >
              <span
                className={`w-[19px] h-[19px] rounded-[6px] grid place-items-center transition-all duration-150 ${
                  remember ? "bg-accent border border-accent" : "bg-surface border border-border"
                }`}
              >
                {remember && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
              </span>
              Se souvenir de moi
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[13.5px] font-semibold text-accent hover:underline"
            >
              Mot de passe oublié&nbsp;?
            </button>
          </div>
        )}

        {formError && (
          <p className="text-[12.5px] font-medium text-[#c0492f]">{formError}</p>
        )}
        {info && (
          <p className="text-[12.5px] font-medium text-accent">{info}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[50px] flex items-center justify-center gap-[9px] rounded-[12px] text-white font-bold text-[15.5px] shadow-[0_10px_24px_rgba(47,125,196,.30)] transition-[background,transform] duration-150 active:scale-[.99]"
          style={{ background: loading ? "rgb(var(--accent) / 0.7)" : "rgb(var(--accent))" }}
        >
          {loading ? (
            <span
              className="w-[17px] h-[17px] rounded-full border-[2.5px] border-white border-t-transparent animate-spin"
              style={{ animationDuration: "0.7s" }}
            />
          ) : isLogin ? (
            "Se connecter"
          ) : (
            "Créer mon compte"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-[14px] my-6">
        <span className="flex-1 h-px bg-border" />
        <span className="text-[12.5px] font-medium text-muted">ou</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-[9px] rounded-[12px] border border-border bg-surface py-[13px] text-[14.5px] font-semibold text-foreground transition hover:bg-surface-2 hover:border-border"
      >
        <GoogleIcon />
        Continuer avec Google
      </button>

      {/* Mode switch */}
      <p className="text-center text-[14px] text-muted mt-6">
        {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
        <button
          type="button"
          onClick={switchMode}
          className="font-semibold text-accent hover:underline"
        >
          {isLogin ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
