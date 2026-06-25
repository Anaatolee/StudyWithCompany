"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  MessageSquare,
  Music,
  Phone,
  Play,
  Plus,
  Send,
  SkipBack,
  SkipForward,
  Timer,
  Users,
  Video,
} from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";

// --- Static placeholder data (branché sur les vraies données en prod) --------

const SUBJECTS = [
  "Mathématiques",
  "Droit",
  "Médecine",
  "Informatique",
  "Langues",
  "Histoire-Géo",
  "Économie",
  "Physique-Chimie",
];

const HERO_TILES = [
  { initials: "TM", name: "Toi", from: "#c0613a", to: "#9e4e2f" },
  { initials: "AL", name: "Aline", from: "#9bb8d3", to: "#7a9cbd" },
  { initials: "LU", name: "Lucas", from: "#5aa775", to: "#3f7350" },
  { initials: "LÉ", name: "Léa", from: "#d4a5c4", to: "#b67fa3" },
];

const PARTICIPANTS = [
  { initials: "TO", name: "Toi (vous)", from: "#2f7dc4", to: "#235e94", me: true },
  { initials: "LU", name: "Lucas", from: "#5aa775", to: "#3f7350" },
  { initials: "AL", name: "Aline", from: "#9bb8d3", to: "#7a9cbd" },
  { initials: "LÉ", name: "Léa", from: "#d4a5c4", to: "#b67fa3" },
  { initials: "SO", name: "Sofia", from: "#7fb3ad", to: "#5e918c" },
  { initials: "MA", name: "Marc", from: "#cbb46b", to: "#a8965a" },
  { initials: "NA", name: "Nadia", from: "#b294cc", to: "#8d6cab" },
  { initials: "EM", name: "Emma", from: "#e0a07f", to: "#c47f5c" },
  { initials: "YA", name: "Yanis", from: "#6f8fc4", to: "#4f6ea0" },
];

const STEPS = [
  {
    n: "01",
    title: "Choisis ta matière",
    text: "Maths, droit, médecine, langues… Choisis parmi une longue liste de matières académiques.",
  },
  {
    n: "02",
    title: "Rejoins une salle d'étude",
    text: "Tu apparais aux côtés d'autres étudiants et professionnels. Des outils sont à ta disposition pour rester concentré.",
  },
  {
    n: "03",
    title: "Avancez ensemble",
    text: "Plonge toi dans ton travail, pose tes questions dans le chat, ou passe un appel à un autre utilisateur disponible pour te venir en aide.",
  },
];

const FEATURES = [
  {
    icon: Layers,
    title: "Salles triées par matière",
    text: "Chaque salle regroupe des personnes qui travaillent sur le même sujet que toi. On se sent moins seul, et on avance plus vite.",
  },
  {
    icon: Video,
    title: "Caméra allumée",
    text: "La caméra est fortement recommandée. La présence des autres recrée la pression bienveillante d'une vraie salle de travail.",
  },
  {
    icon: Clock,
    title: "Minuteur pomodoro collectif",
    text: "Toute la salle suit le même minuteur. Vous travaillez et faites vos pauses ensemble, pour vous tirer vers le haut.",
  },
  {
    icon: Timer,
    title: "Minuteur pomodoro personnel",
    text: "Besoin de ton propre rythme ? Lance un minuteur perso en parallèle, visible seulement par toi.",
  },
  {
    icon: MessageSquare,
    title: "Chat général",
    text: "Une question, un point à débloquer ? Le chat général de la salle est là pour s'entraider et communiquer facilement.",
  },
  {
    icon: Phone,
    title: "Appels privés",
    text: "Pour expliquer un point de vive voix, lance un appel privé avec un autre utilisateur en un clic, sans déranger la salle.",
  },
];

const FAQ = [
  {
    q: "C'est vraiment gratuit ?",
    a: "Oui. Tu crées un compte et tu rejoins les salles d'étude gratuitement. On veut d'abord t'aider à reprendre le rythme.",
  },
  {
    q: "Comment fonctionnent les salles par matière ?",
    a: "Chaque salle regroupe des personnes qui travaillent sur le même domaine (maths, droit, langues…). Tu choisis ta matière et tu retrouves des gens dans le même état d'esprit que toi.",
  },
  {
    q: "Dois-je vraiment montrer mon visage ?",
    a: "La caméra est encouragée : c'est elle qui recrée la présence des autres et la concentration. Mais tu restes libre de la couper quand tu en as besoin.",
  },
  {
    q: "Le micro est-il toujours coupé ?",
    a: "Par défaut oui, pour préserver le calme de la salle. Pour échanger de vive voix, tu peux lancer un appel privé 1-à-1 avec un camarade.",
  },
  {
    q: "À quoi sert le Pomodoro collectif ?",
    a: "Toute la salle suit le même minuteur : vous démarrez vos sessions de travail et vos pauses en même temps. C'est plus facile de tenir quand tout le monde avance avec toi.",
  },
  {
    q: "Sur quels appareils ça marche ?",
    a: "Directement dans ton navigateur, sur ordinateur — rien à installer. L'expérience mobile arrive prochainement.",
  },
];

function fmt(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function Landing() {
  // Live pomodoro shared by the hero floating card and the room mockup top bar.
  const [seconds, setSeconds] = useState(23 * 60 + 12);
  const [openFaq, setOpenFaq] = useState(0);
  // Carrousel d'aperçu : 0 = mode sérieux, 1 = mode Chill
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 25 * 60 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const timer = fmt(seconds);

  return (
    <>
      {/* ---------------------------------------------------------------- Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1180px] mx-auto px-6 py-[15px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-accent grid place-items-center shrink-0">
              <BookOpen className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </span>
            <span className="font-display text-[20px] font-semibold">StudyWithCompany</span>
          </Link>
          <nav className="flex items-center gap-2.5">
            <a href="#fonctionnalites" className="hidden sm:block px-2 text-[14.5px] text-muted hover:text-foreground transition">
              Fonctionnalités
            </a>
            <a href="#faq" className="hidden sm:block px-2 text-[14.5px] text-muted hover:text-foreground transition">
              FAQ
            </a>
            <DarkModeToggle />
            <Link href="/login" className="px-2 text-[14.5px] font-semibold hover:text-accent transition">
              Connexion
            </Link>
            <Link
              href="/signup"
              className="bg-accent text-white text-[14.5px] font-semibold rounded-[10px] px-[18px] py-2.5 shadow-[0_8px_20px_rgba(47,125,196,.3)] hover:opacity-90 transition"
            >
              S&apos;inscrire
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------- Hero */}
        <section className="max-w-[1180px] mx-auto px-6 pt-[clamp(48px,7vw,92px)] pb-[clamp(40px,5vw,64px)]">
          <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-[clamp(32px,5vw,72px)] items-center">
            {/* Left column */}
            <div>
              <span className="inline-flex items-center gap-2 bg-accent-soft text-accent text-[13px] font-semibold px-3 py-1.5 rounded-full">
                <span className="w-[7px] h-[7px] rounded-full bg-accent lp-pulse" />
                Plus de 60 étudiants en train de travailler maintenant
              </span>
              <h1 className="font-display font-semibold text-[clamp(42px,5.6vw,68px)] leading-[1.02] tracking-[-0.02em] mt-5">
                Étudiez ensemble,
                <br />
                maximisez votre productivité.
              </h1>
              <p className="text-muted text-[clamp(17px,2vw,19px)] leading-[1.6] max-w-[520px] mt-5">
                Du mal à t&apos;y mettre, à rester concentré, à tenir sur la
                durée&nbsp;? Rejoins une salle d&apos;étude virtuelle dédiée à ta
                matière et travaille aux côtés d&apos;autres étudiants.
                <br />
                La motivation vient des autres.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-7">
                <Link
                  href="/signup"
                  className="bg-accent text-white font-semibold rounded-[12px] px-6 py-3 shadow-[0_10px_24px_rgba(47,125,196,.35)] hover:opacity-90 transition"
                >
                  Commencer gratuitement
                </Link>
                <a
                  href="#apercu"
                  className="border border-border bg-surface font-semibold rounded-[12px] px-6 py-3 hover:border-accent/50 transition"
                >
                  Voir une salle d&apos;étude
                </a>
              </div>
              <div className="flex flex-wrap gap-2 mt-7">
                {SUBJECTS.map((s) => (
                  <span
                    key={s}
                    className="bg-surface border border-border text-muted text-sm rounded-full px-3 py-1.5"
                  >
                    {s}
                  </span>
                ))}
                <span className="bg-accent text-white text-sm font-medium rounded-full px-3 py-1.5">
                  et plus encore&nbsp;!
                </span>
              </div>
            </div>

            {/* Right column — composite visual */}
            <div className="relative h-[clamp(360px,42vw,460px)]">
              {/* Room card */}
              <div className="absolute inset-0 bg-surface rounded-[22px] shadow-[0_30px_70px_rgba(40,30,20,.18)] p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-display font-semibold text-[15px]">Salle · Mathématiques</span>
                  <span className="text-xs text-muted">14 en ligne</span>
                </div>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  {HERO_TILES.map((t) => (
                    <div
                      key={t.initials}
                      className="relative rounded-[14px] overflow-hidden grid place-items-center"
                      style={{ backgroundImage: `linear-gradient(150deg, ${t.from}, ${t.to})` }}
                    >
                      <span className="text-white text-2xl font-display font-semibold">{t.initials}</span>
                      <span className="absolute bottom-2 left-2 text-[11px] text-white bg-black/35 rounded-md px-1.5 py-0.5">
                        {t.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating: pomodoro */}
              <div className="absolute -top-4 -right-3 bg-[#19222e] text-white rounded-[14px] px-4 py-3 shadow-[0_18px_40px_rgba(40,30,20,.28)] lp-float">
                <div className="text-[10px] uppercase tracking-[0.08em] text-white/60">Pomodoro collectif</div>
                <div className="font-display text-[30px] leading-none mt-1">{timer}</div>
              </div>

              {/* Floating: chat */}
              <div className="absolute -bottom-4 -left-4 bg-surface rounded-[14px] px-3.5 py-3 shadow-[0_18px_40px_rgba(40,30,20,.18)] flex items-start gap-2.5 max-w-[230px] lp-float-slow">
                <span className="w-8 h-8 rounded-lg bg-accent-soft grid place-items-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-accent" />
                </span>
                <div>
                  <p className="text-[13px] leading-snug">Léa : « Je t&apos;explique en appel 🙂 »</p>
                  <p className="text-[11px] text-muted mt-0.5 font-semibold">Chat général</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Comment ça marche */}
        <section className="max-w-[1180px] mx-auto px-6 py-[clamp(48px,6vw,80px)]">
          <Eyetag>Comment ça marche</Eyetag>
          <H2>Trois étapes pour s&apos;y mettre</H2>
          <div className="grid md:grid-cols-3 gap-[22px] mt-10">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-surface border border-border rounded-[18px] p-[30px]">
                <div className="font-display text-[40px] text-accent leading-none">{s.n}</div>
                <h3 className="text-[20px] font-bold mt-3">{s.title}</h3>
                <p className="text-muted text-[15px] leading-relaxed mt-2">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------- Aperçu salle */}
        <section id="apercu" className="scroll-mt-24 bg-surface-2 border-y border-border py-[clamp(48px,6vw,88px)]">
          <div className="max-w-[1180px] mx-auto px-6">
            <Eyetag>À l&apos;intérieur d&apos;une salle</Eyetag>
            <H2>L&apos;énergie d&apos;une salle pleine, depuis ton bureau</H2>

            {/* Carrousel : un aperçu à la fois (mode sérieux / mode Chill), on slide
                horizontalement pour passer de l'un à l'autre → chaque visuel garde
                ses proportions plein écran. */}
            <div className="mt-10 relative">
              {/* Ombre des cartes posée sur un calque séparé, DERRIÈRE et HORS du
                  conteneur clippé → elle s'étale librement sur tous les côtés (aucune
                  délimitation), pendant que le clip ci-dessous ne masque que l'autre
                  slide. Les cartes elles-mêmes n'ont plus de box-shadow. */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-[20px] shadow-[0_34px_80px_rgba(20,30,45,.18)]"
              />
              {/* overflow-x-clip : masque l'autre slide horizontalement (z-10 = au-dessus
                  du calque d'ombre). */}
              <div className="relative z-10 overflow-x-clip">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${slide * 100}%)` }}
                >
                  <div className="w-full shrink-0">
                    <RoomMockup timer={timer} />
                  </div>
                  <div className="w-full shrink-0">
                    <ChillRoomMockup timer={timer} />
                  </div>
                </div>
              </div>

              {/* Flèche précédente */}
              <button
                onClick={() => setSlide(0)}
                disabled={slide === 0}
                aria-label="Aperçu précédent"
                className="absolute left-2 sm:-left-4 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-surface border border-border shadow-[0_8px_22px_rgba(20,30,45,.16)] text-foreground transition hover:bg-surface-2 disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {/* Flèche suivante */}
              <button
                onClick={() => setSlide(1)}
                disabled={slide === 1}
                aria-label="Aperçu suivant"
                className="absolute right-2 sm:-right-4 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-surface border border-border shadow-[0_8px_22px_rgba(20,30,45,.16)] text-foreground transition hover:bg-surface-2 disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Pastilles + libellés de mode */}
            <div className="flex items-center justify-center gap-3 mt-6">
              {["Mode sérieux", "Mode Chill"].map((label, i) => (
                <button
                  key={label}
                  onClick={() => setSlide(i)}
                  className={`flex items-center gap-2 text-[13.5px] font-semibold px-3.5 py-1.5 rounded-full transition ${
                    slide === i
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${slide === i ? "bg-white" : "bg-border"}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-24 max-w-[1180px] mx-auto px-6 py-[clamp(48px,6vw,80px)]">
          <Eyetag>Tout ce qu&apos;il te faut</Eyetag>
          <H2>Pensé pour rester concentré, ensemble</H2>
          <div className="grid md:grid-cols-3 gap-[22px] mt-10">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface border border-border rounded-[18px] p-7">
                <span className="w-[46px] h-[46px] rounded-[12px] bg-accent-soft text-accent grid place-items-center">
                  <f.icon className="w-[22px] h-[22px]" />
                </span>
                <h3 className="text-[19px] font-bold mt-4">{f.title}</h3>
                <p className="text-muted text-[14.5px] leading-relaxed mt-2">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- FAQ */}
        <section id="faq" className="scroll-mt-24 bg-surface-2 py-[clamp(48px,6vw,88px)]">
          <div className="max-w-[760px] mx-auto px-6">
            <Eyetag>Questions fréquentes</Eyetag>
            <H2>Tout ce que tu veux savoir</H2>
            <div className="space-y-3 mt-10">
              {FAQ.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className="bg-surface border border-border rounded-[14px] overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-[16.5px] font-semibold">{item.q}</span>
                      <Plus
                        className={`w-6 h-6 text-accent shrink-0 transition-transform duration-200 ${open ? "rotate-45" : ""}`}
                      />
                    </button>
                    {open && (
                      <p className="px-5 pb-4 -mt-1 text-muted text-[15px] leading-[1.65]">{item.a}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-muted text-[15px] mt-9">
              Tu ne trouves pas ta réponse&nbsp;? Écris-nous à{" "}
              <SupportEmail className="font-semibold text-accent hover:underline" />
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------- CTA final */}
        <section className="max-w-[1180px] mx-auto px-6 py-[clamp(48px,6vw,80px)]">
          <div className="relative overflow-hidden bg-[#19222e] rounded-[26px] px-6 py-[clamp(48px,6vw,72px)] text-center">
            <span className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-accent/30 blur-3xl" />
            <h2 className="relative font-display font-semibold text-[clamp(30px,3.6vw,44px)] tracking-[-0.02em] text-[#f9fbfc]">
              Ta prochaine session
              <br />
              commence maintenant.
            </h2>
            <p className="relative text-white/60 max-w-[460px] mx-auto mt-4">
              Rejoins une salle, allume ta caméra et avance avec les autres. C&apos;est gratuit.
            </p>
            <Link
              href="/signup"
              className="relative inline-block mt-7 bg-accent text-white font-semibold rounded-[12px] px-6 py-3 shadow-[0_10px_24px_rgba(47,125,196,.4)] hover:opacity-90 transition"
            >
              Commencer gratuitement
            </Link>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------ Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1180px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-[30px] h-[30px] rounded-[8px] bg-accent grid place-items-center">
              <BookOpen className="w-4 h-4 text-white" />
            </span>
            <span className="font-display font-semibold">StudyWithCompany</span>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-1 text-center sm:text-right">
            <p className="text-muted text-sm">Étudiez ensemble, maximisez votre productivité.</p>
            <SupportEmail className="text-muted text-sm hover:text-accent transition" />
          </div>
        </div>
      </footer>
    </>
  );
}

// --- Small shared pieces -----------------------------------------------------

// Support email — click to copy (mailto only opens a client when the visitor
// has one registered as a handler, which Gmail-in-browser users often don't).
function SupportEmail({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const email = "support@studywithcompany.com";
  return (
    <button
      type="button"
      title="Cliquer pour copier l'adresse"
      onClick={() => {
        navigator.clipboard
          ?.writeText(email)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {});
      }}
      className={className}
    >
      {copied ? "Copié ✓" : email}
    </button>
  );
}

function Eyetag({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] font-semibold tracking-[0.08em] uppercase text-accent text-center">
      {children}
    </p>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display font-semibold text-[clamp(30px,3.6vw,44px)] tracking-[-0.02em] text-center mt-2">
      {children}
    </h2>
  );
}

// --- Room mockup (fixed blue palette, independent from the page theme) -------

function RoomMockup({ timer }: { timer: string }) {
  return (
    <div className="bg-[#f9fbfc] border border-[#e7edf2] rounded-[20px] overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-[#e7edf2] flex items-center gap-[13px] px-[18px] py-[11px] flex-wrap">
        <button className="w-8 h-8 grid place-items-center rounded-lg border border-[#e7edf2] text-[#19222e] shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#3f9d6a] lp-pulse" />
          <div className="leading-tight">
            <div className="font-display font-semibold text-[17px] text-[#19222e]">Révisions du bac</div>
            <div className="text-[12px] text-[#5c6675]">Géographie</div>
          </div>
        </div>
        <span className="w-px h-7 bg-[#e7edf2] hidden md:block" />
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[12px] uppercase tracking-wide text-[#2f7dc4] font-semibold">Objectif</span>
          <span className="text-[13px] text-[#19222e]">Chap. 4 — Climats</span>
        </div>

        {/* Music player */}
        <div className="mx-auto flex items-center gap-2 bg-white border border-[#e7edf2] rounded-full px-3 py-1.5">
          <Music className="w-3.5 h-3.5 text-[#2f7dc4]" />
          <span className="text-[12.5px] text-[#19222e] hidden sm:inline">Good Night Lofi Cozy</span>
          <SkipBack className="w-3.5 h-3.5 text-[#5c6675]" />
          <span className="w-6 h-6 rounded-full bg-[#2f7dc4] grid place-items-center">
            <Play className="w-3 h-3 text-white fill-white" />
          </span>
          <SkipForward className="w-3.5 h-3.5 text-[#5c6675]" />
        </div>

        {/* Bouton Chill mode (démonstratif, non fonctionnel comme le lecteur) */}
        <span className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white shrink-0 bg-gradient-to-br from-[#ffa546] to-[#f5822a] shadow-[0_2px_10px_rgba(240,130,40,.35)]">
          Chill mode
        </span>

        {/* Pomodoro */}
        <div className="flex items-center gap-2 border border-[#e7edf2] rounded-full px-3 py-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 text-[#5c6675]" />
          <span className="text-[12px] font-semibold text-[#3f9d6a]">Focus</span>
          {/* Largeur fixe + chiffres tabulaires → le timer ne décale plus rien selon le nombre */}
          <span className="font-display text-[14px] text-[#19222e] inline-block text-center tabular-nums min-w-[46px]">{timer}</span>
          <span className="text-[11px] font-semibold rounded px-1.5 py-0.5 bg-[#2f7dc4] text-white">25/5</span>
          <span className="text-[11px] font-semibold rounded px-1.5 py-0.5 bg-[#eef3f8] text-[#5c6675]">50/10</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex h-[480px]">
        {/* Video scene */}
        <div className="relative flex-1 min-w-0">
          <div className="grid grid-cols-3 gap-[11px] p-4 h-full">
            {PARTICIPANTS.map((p) => (
              <div
                key={p.initials}
                className={`relative rounded-[14px] overflow-hidden grid place-items-center ${p.me ? "ring-2 ring-[#2f7dc4]" : ""}`}
                style={{ backgroundImage: `linear-gradient(150deg, ${p.from}, ${p.to})` }}
              >
                <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#3f9d6a]" />
                <span className="text-white text-[23px] font-display font-semibold">{p.initials}</span>
                <span className="absolute bottom-2 left-2 text-[11px] text-white bg-black/40 rounded-md px-1.5 py-0.5">
                  {p.name.replace(" (vous)", "")}
                </span>
              </div>
            ))}
          </div>

          {/* Floating dock */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-[5px] bg-white border border-[#e7edf2] rounded-[11px] px-2 py-1.5 shadow-md">
            <span className="flex items-center gap-1 text-[11px] text-[#2f7dc4] px-2 py-1">
              <Camera className="w-3 h-3" /> Caméra coupée
            </span>
            <span className="flex items-center gap-1 text-[11px] text-white bg-[#b8473f] rounded-md px-2 py-1">
              Quitter
            </span>
          </div>
        </div>

        {/* Side panel */}
        <div className="hidden lg:flex w-[330px] shrink-0 bg-white border-l border-[#e7edf2] flex-col">
          {/* Participants header */}
          <div className="flex items-center justify-between px-4 py-3 text-[12px] uppercase tracking-wide text-[#5c6675]">
            <span>Participants (9)</span>
            <ChevronDown className="w-4 h-4" />
          </div>

          {/* Participant rows */}
          <div className="px-2 space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#eef3f8]">
              <span
                className="w-7 h-7 rounded-full grid place-items-center text-white text-xs font-semibold"
                style={{ backgroundImage: "linear-gradient(150deg, #2f7dc4, #235e94)" }}
              >
                T
              </span>
              <span className="text-[14px] text-[#19222e]">Toi (vous)</span>
            </div>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full grid place-items-center text-white text-[11px] font-semibold"
                  style={{ backgroundImage: "linear-gradient(150deg, #5aa775, #3f7350)" }}
                >
                  LU
                </span>
                <span className="text-[14px] text-[#19222e]">Lucas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-[30px] h-[30px] grid place-items-center rounded-md bg-[#e3eef8]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#2f7dc4]" />
                </span>
                <span className="w-[30px] h-[30px] grid place-items-center rounded-md bg-[#e3eef8]">
                  <Phone className="w-3.5 h-3.5 text-[#2f7dc4]" />
                </span>
              </div>
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-1.5 py-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2f7dc4]" />
            <span className="w-1 h-1 rounded-full bg-[#c4ccd5]" />
            <span className="w-1 h-1 rounded-full bg-[#c4ccd5]" />
            <span className="w-1 h-1 rounded-full bg-[#c4ccd5]" />
            <span className="w-1 h-1 rounded-full bg-[#c4ccd5]" />
          </div>

          <div className="border-t border-[#e7edf2]" />

          {/* Chat */}
          <div className="flex-1 overflow-hidden px-4 py-3">
            <div className="text-[12px] uppercase tracking-wide text-[#5c6675] mb-3">Chat</div>
            <div className="space-y-3">
              <div>
                <div className="text-[12px] font-semibold text-[#3f7350] mb-1">Lucas</div>
                <div className="inline-block bg-[#eef3f8] text-[#19222e] text-[13px] rounded-lg rounded-bl-sm px-3 py-2 max-w-[85%]">
                  Quelqu&apos;un a fini la fiche sur les climats ?
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-semibold text-[#5c6675] mb-1">Toi</div>
                <div className="inline-block bg-[#2f7dc4] text-white text-[13px] rounded-lg rounded-br-sm px-3 py-2 max-w-[85%] text-left">
                  Oui, je te l&apos;envoie 🙂
                </div>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-2 border-t border-[#e7edf2]">
            <div className="flex-1 bg-[#f9fbfc] border border-[#e7edf2] rounded-lg px-3 py-2 text-[13px] text-[#5c6675]">
              Écrire un message…
            </div>
            <span className="w-9 h-9 grid place-items-center rounded-lg bg-[#2f7dc4]">
              <Send className="w-4 h-4 text-white" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Chill mode mockup (fond vidéo lofi + UI « liquid glass », démonstratif) --

function ChillRoomMockup({ timer }: { timer: string }) {
  return (
    <div className="relative h-[542px] rounded-[20px] overflow-hidden border border-[#2a3340] bg-[#0f1620]">
      {/* Fond lofi (image fixe = toujours visible, contrairement à la vidéo qui se
          met en pause hors-écran dans le carrousel). C'est un visuel de démo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/videos/BG_DEFAULT_poster.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Voile assombrissant pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1018]/45 via-[#0a1018]/20 to-[#0a1018]/55" />

      {/* Contenu glass */}
      <div className="relative flex flex-col h-full text-white">
        {/* En-tête glass */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 flex-wrap">
          <span className="w-8 h-8 grid place-items-center rounded-lg bg-white/12 border border-white/20 backdrop-blur-md shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </span>
          <div className="leading-tight mr-auto">
            <div className="font-display font-semibold text-[16px]">Révisions du bac</div>
            <div className="text-[12px] text-white/70">Géographie</div>
          </div>

          {/* Lecteur de musique (glass) */}
          <div className="flex items-center gap-2 bg-white/12 border border-white/20 backdrop-blur-md rounded-full px-3 py-1.5">
            <Music className="w-3.5 h-3.5" />
            <span className="text-[12.5px] hidden sm:inline">Good Night Lofi Cozy</span>
            <SkipBack className="w-3.5 h-3.5 text-white/70" />
            <span className="w-6 h-6 rounded-full bg-[#3b82f6] grid place-items-center">
              <Play className="w-3 h-3 text-white fill-white" />
            </span>
            <SkipForward className="w-3.5 h-3.5 text-white/70" />
          </div>

          {/* Bouton bascule (en chill → propose « Serious mode ») */}
          <span className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold bg-gradient-to-br from-[#ffa546] to-[#f5822a] shadow-[0_2px_10px_rgba(240,130,40,.4)] shrink-0">
            Serious mode
          </span>

          {/* Pomodoro (glass) */}
          <div className="flex items-center gap-2 bg-white/12 border border-white/20 backdrop-blur-md rounded-full px-3 py-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-white/80" />
            <span className="font-display text-[14px] inline-block text-center tabular-nums min-w-[46px]">{timer}</span>
            <span className="text-[11px] font-semibold rounded px-1.5 py-0.5 bg-[#3b82f6] text-white">25/5</span>
          </div>

          {/* Boutons Caméras / Participants (glass) — comme dans la vraie salle */}
          <span className="flex items-center gap-1.5 bg-white/12 border border-white/20 backdrop-blur-md rounded-full px-3 py-1.5 text-[12.5px] shrink-0">
            <Video className="w-3.5 h-3.5" /> Caméras
          </span>
          <span className="flex items-center gap-1.5 bg-white/12 border border-white/20 backdrop-blur-md rounded-full px-3 py-1.5 text-[12.5px] shrink-0">
            <Users className="w-3.5 h-3.5" /> Participants
          </span>
        </div>

        {/* Corps : le fond lofi reste visible (pas de tuiles). Chat flottant + dock. */}
        <div className="relative flex-1">
          {/* Chat flottant : messages « liquid glass » + barre de saisie (contenu repris du visuel sérieux) */}
          <div className="absolute bottom-4 right-4 w-[320px] flex flex-col gap-2.5">
            {/* Message d'un autre participant */}
            <div className="self-start max-w-[88%]">
              <div className="text-[11px] font-semibold text-white/75 mb-1 ml-1">Lucas</div>
              <div className="bg-white/15 border border-white/25 backdrop-blur-lg rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] leading-snug shadow-[0_4px_14px_rgba(10,16,24,.25),inset_0_1px_0_rgba(255,255,255,.28)]">
                Quelqu&apos;un a fini la fiche sur les climats&nbsp;?
              </div>
            </div>
            {/* Mon message */}
            <div className="self-end max-w-[88%] text-right">
              <div className="text-[11px] font-semibold text-white/70 mb-1 mr-1">Toi</div>
              <div className="inline-block text-left bg-[#3b82f6]/70 border border-white/25 backdrop-blur-lg rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] leading-snug shadow-[0_4px_14px_rgba(10,16,24,.25),inset_0_1px_0_rgba(255,255,255,.32)]">
                Oui, je te l&apos;envoie 🙂
              </div>
            </div>
            {/* Barre de saisie (verre) */}
            <div className="flex items-center gap-2 bg-white/12 border border-white/20 backdrop-blur-lg rounded-2xl pl-4 pr-2 py-2 mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]">
              <span className="flex-1 text-[13px] text-white/55">Écrire un message…</span>
              <span className="w-8 h-8 grid place-items-center rounded-xl bg-white/15 border border-white/20 text-white/85">
                <Send className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Dock flottant (verre) — sans « Partager l'écran » */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/12 border border-white/20 backdrop-blur-md rounded-[12px] px-2 py-1.5">
            <span className="flex items-center gap-1 text-[11px] px-2 py-1">
              <Camera className="w-3 h-3" /> Caméra coupée
            </span>
            <span className="flex items-center gap-1 text-[11px] text-white bg-[#b8473f] rounded-md px-2 py-1">
              Quitter
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
