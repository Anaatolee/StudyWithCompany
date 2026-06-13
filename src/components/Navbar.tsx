import Link from "next/link";
import { BookOpen, LogOut } from "lucide-react";
import type { Profile } from "@/lib/types";

export function Navbar({ profile }: { profile: Profile | null }) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/rooms" className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <span className="font-semibold">StudyTogether</span>
        </Link>

        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-sm text-muted hidden sm:inline">
              @{profile.username}
            </span>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg hover:bg-surface transition"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
