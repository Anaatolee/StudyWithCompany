"use client";

import { display, body } from "@/app/fonts";
import { daylightVars } from "@/lib/daylight";
import { useTheme } from "@/lib/ThemeContext";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function DaylightWrapper({ children, className }: Props) {
  const { isDark } = useTheme();
  return (
    <div
      className={`${display.variable} ${body.variable} ${className ?? ""}`}
      style={isDark ? { fontFamily: "var(--font-body)" } : { ...daylightVars, fontFamily: "var(--font-body)" }}
    >
      {children}
    </div>
  );
}
