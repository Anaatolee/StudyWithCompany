import { redirect } from "next/navigation";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});
const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// "Lumière du jour" palette — overrides the global (dark) theme tokens locally,
// so existing Tailwind color utilities (bg-surface, text-muted, …) render light
// on this page only, leaving the rest of the app untouched.
const daylight = {
  "--background": "249 251 252", // #f9fbfc
  "--surface": "255 255 255",
  "--border": "231 237 242", // #e7edf2
  "--foreground": "25 34 46", // #19222e (ink)
  "--muted": "92 102 117", // #5c6675
  "--accent": "47 125 196", // #2f7dc4
  fontFamily: "var(--font-body)",
} as React.CSSProperties;

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/rooms");

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-background text-foreground`}
      style={daylight}
    >
      <Landing />
    </div>
  );
}
