import type { UserStatus } from "@/lib/types";

// Libellés affichés pour chaque statut.
export const STATUS_META: Record<UserStatus, { label: string }> = {
  online: { label: "Connecté" },
  away: { label: "Absent" },
  dnd: { label: "Ne pas déranger" },
  invisible: { label: "Invisible" },
  offline: { label: "Déconnecté" },
};

// Choix proposés dans le menu (Déconnecté est exclu : il est attribué automatiquement
// aux utilisateurs hors-ligne, ce n'est pas un statut sélectionnable).
export const STATUS_ORDER: UserStatus[] = ["online", "away", "dnd", "invisible"];

// Statut tel qu'il apparaît aux AUTRES utilisateurs : « invisible » se montre comme
// « déconnecté » (c'est tout l'intérêt du mode invisible). null → déconnecté.
export function peerDisplayStatus(status: UserStatus | null | undefined): UserStatus {
  if (!status || status === "invisible") return "offline";
  return status;
}

// Pastille de couleur selon le statut :
//  - online  → point vert plein
//  - away    → point jaune plein
//  - dnd     → cercle rouge barré de blanc (panneau « sens interdit »)
//  - invisible / offline → cercle gris creux (anneau)
// `title` = infobulle affichée au survol.
export function StatusDot({ status, size = 10, title }: { status: UserStatus; size?: number; title?: string }) {
  const box = { width: size, height: size } as const;

  if (status === "online") {
    return <span title={title} className="inline-block rounded-full align-middle" style={{ ...box, background: "#3f9d6a" }} />;
  }
  if (status === "away") {
    return <span title={title} className="inline-block rounded-full align-middle" style={{ ...box, background: "#e6a817" }} />;
  }
  if (status === "dnd") {
    return (
      <span title={title} className="inline-grid place-items-center rounded-full align-middle" style={{ ...box, background: "#d93d3d" }}>
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
      title={title}
      className="inline-block rounded-full align-middle"
      style={{ ...box, border: `${Math.max(2, Math.round(size * 0.2))}px solid #9aa5b1`, background: "transparent" }}
    />
  );
}

// Pastille d'un AUTRE utilisateur : applique le masquage « invisible → déconnecté »
// et fournit automatiquement l'infobulle correspondante.
export function PeerStatusDot({ status, size = 9 }: { status: UserStatus | null | undefined; size?: number }) {
  const s = peerDisplayStatus(status);
  return <StatusDot status={s} size={size} title={STATUS_META[s].label} />;
}
