import { Bricolage_Grotesque, Public_Sans } from "next/font/google";

// Shared "Lumière du jour" typography — used by the landing and auth screens.
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

export const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
