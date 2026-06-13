"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: trimmedUsername },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/rooms");
      router.refresh();
      return;
    }

    setInfo(
      "Compte créé. Vérifiez votre email pour confirmer votre inscription."
    );
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="flex items-center gap-2 mb-8 text-foreground hover:text-accent transition"
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xl font-semibold">StudyWithCompany</span>
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-semibold mb-1">Créer un compte</h1>
          <p className="text-muted text-sm mb-6">
            Rejoignez la communauté et étudiez avec d'autres.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5">Nom d'utilisateur</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}
            {info && (
              <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white font-medium rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
