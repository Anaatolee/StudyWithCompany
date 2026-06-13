"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/rooms";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="flex items-center gap-2 mb-8 text-foreground hover:text-accent transition"
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xl font-semibold">StudyTogether</span>
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-semibold mb-1">Connexion</h1>
          <p className="text-muted text-sm mb-6">
            Retrouvez vos camarades dans les salles d'étude.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white font-medium rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
