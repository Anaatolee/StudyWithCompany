import type { UserStatus } from "@/lib/types";

// Libellés affichés pour chaque statut (ordre du menu déroulant).
export const STATUS_META: Record<UserStatus, { label: string }> = {
  online: { label: "Connecté" },
  away: { label: "Absent" },
  dnd: { label: "Ne pas déranger" },
  invisible: { label: "Invisible" },
  offline: { label: "Déconnecté" },
};

export const STATUS_ORDER: UserStatus[] = ["online", "away", "dnd", "invisible", "offline"];

// Pastille de couleur selon le statut :
//  - online  → point vert plein
//  - away    → point jaune plein
//  - dnd     → cercle rouge barré de blanc (panneau « sens interdit »)
//  - invisible / offline → cercle gris creux (anneau)
export function StatusDot({ status, size = 10 }: { status: UserStatus; size?: number }) {
  const box = { width: size, height: size } as const;

  if (status === "online") {
    return <span className="inline-block rounded-full" style={{ ...box, background: "#3f9d6a" }} />;
  }
  if (status === "away") {
    return <span className="inline-block rounded-full" style={{ ...box, background: "#e6a817" }} />;
  }
  if (status === "dnd") {
    return (
      <span className="inline-grid place-items-center rounded-full" style={{ ...box, background: "#d93d3d" }}>
        <span
          className="rounded-full"
          style={{ width: Math.round(size * 0.55), height: Math.max(1.5, Math.round(size * 0.2)), background: "#fff" }}
        />
      </span>
    );
  }
  // invisible / offline → anneau gris creux
  return (
    <span
      className="inline-block rounded-full"
      style={{ ...box, border: `${Math.max(2, Math.round(size * 0.2))}px solid #9aa5b1`, background: "transparent" }}
    />
  );
}
