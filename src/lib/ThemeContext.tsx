"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeCtx = { isDark: boolean; toggle: () => void };

const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The pre-paint script in layout.tsx sets the `.dark` class before React
  // hydrates, so we initialise from the actual class to stay in sync (no flash).
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      const root = document.documentElement;
      root.classList.toggle("dark", next);
      try {
        localStorage.setItem("swc-theme", next ? "dark" : "light");
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
