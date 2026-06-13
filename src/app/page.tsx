import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Camera, MessageSquare, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/rooms");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" />
            <span className="text-xl font-semibold">StudyWithCompany</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm hover:text-accent transition"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:opacity-90 transition"
            >
              S'inscrire
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Étudiez ensemble.
            <br />
            <span className="text-accent">Restez motivés.</span>
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-10">
            Rejoignez des salles d'étude virtuelles par matière, allumez votre
            caméra, et travaillez aux côtés d'autres étudiants. Comme une
            bibliothèque, mais en ligne.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:opacity-90 transition"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-surface transition"
            >
              J'ai déjà un compte
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
          <Feature
            icon={<Camera className="w-5 h-5" />}
            title="Caméra allumée, micro coupé"
            text="Recréez l'ambiance d'une bibliothèque. La caméra encourage la concentration, le micro reste muet pour ne pas déranger."
          />
          <Feature
            icon={<MessageSquare className="w-5 h-5" />}
            title="Chat temps réel"
            text="Posez vos questions, partagez vos ressources et entraidez-vous avec les autres étudiants de la salle."
          />
          <Feature
            icon={<Users className="w-5 h-5" />}
            title="Appels privés"
            text="Besoin d'expliquer un point en vocal ? Lancez un appel privé 1-à-1 avec un camarade."
          />
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        StudyWithCompany — étudier seul, mais pas tout seul.
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
