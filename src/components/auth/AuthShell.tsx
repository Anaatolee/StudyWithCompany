import Link from "next/link";
import { BookOpen } from "lucide-react";
import { display, body } from "@/app/fonts";

// Themed chrome shared by the login and signup screens: full-viewport background,
// decorative ambient glows, top-left brand, and a vertically-centered card slot.
// Theming is global (light by default, `.dark` opt-in), so the glows use the
// accent token at low opacity to stay subtle in both themes.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${display.variable} ${body.variable} relative min-h-screen overflow-hidden bg-background text-foreground`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Ambient glows (decorative) */}
      <div
        className="pointer-events-none absolute -top-[180px] -right-[120px] w-[520px] h-[520px] rounded-full lp-glow-a"
        style={{ background: "radial-gradient(circle, rgb(var(--accent) / 0.16) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-[220px] -left-[140px] w-[560px] h-[560px] rounded-full lp-glow-b"
        style={{ background: "radial-gradient(circle, rgb(var(--accent) / 0.12) 0%, transparent 70%)" }}
      />

      {/* Brand header */}
      <header className="relative z-10 px-[30px] py-[26px]">
        <Link href="/" className="inline-flex items-center gap-[11px]">
          <span className="w-[34px] h-[34px] rounded-[9px] bg-accent grid place-items-center shadow-[0_6px_16px_rgba(47,125,196,.28)]">
            <BookOpen className="w-[19px] h-[19px] text-white" strokeWidth={2} />
          </span>
          <span className="font-display font-bold text-[20px] tracking-[-0.01em]">
            StudyWithCompany
          </span>
        </Link>
      </header>

      {/* Centered card slot */}
      <div className="relative z-10 flex justify-center px-6 pb-16 pt-2">
        {children}
      </div>
    </div>
  );
}
