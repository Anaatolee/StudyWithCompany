"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export function DarkModeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className={`w-[34px] h-[34px] grid place-items-center rounded-[9px] border border-border bg-surface text-muted hover:text-foreground hover:bg-border/50 transition ${className ?? ""}`}
    >
      {isDark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
    </button>
  );
}
