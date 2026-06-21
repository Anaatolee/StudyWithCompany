// "Lumière du jour" palette — overrides the global (dark) theme tokens locally
// so existing Tailwind color utilities (bg-surface, text-muted, …) render light
// on the pages that opt in, without touching the rest of the (dark) app.
export const daylightVars = {
  "--background": "249 251 252", // #f9fbfc
  "--surface": "255 255 255",
  "--border": "231 237 242", // #e7edf2
  "--foreground": "25 34 46", // #19222e (ink)
  "--muted": "92 102 117", // #5c6675
  "--accent": "47 125 196", // #2f7dc4
} as React.CSSProperties;
