"use client";

import { useEffect, useState } from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { ChevronUp, ChevronDown } from "lucide-react";
import { VideoTile } from "./VideoTile";
import { useChillMode } from "./ChillModeContext";
import { participantGradient, initials } from "@/lib/participantColors";

// Taille de tuile par défaut : plus grand carré qui laisse une grille 3×3 (9 tuiles)
// tenir dans la scène, en unités container-query pour rester responsive.
const TILE_SIZE_DEFAULT = "min(calc((100cqw - 28px) / 3), calc((100cqh - 28px) / 3))";

// Nombre maximum de tuiles affichées par page (au-delà → pagination).
const PAGE_SIZE = 15;

// Noms factices pour le mode démo (?demo=N) — purement visuel, aucun compte requis.
const DEMO_NAMES = [
  "Léa Martin", "Hugo Bernard", "Emma Petit", "Lucas Durand",
  "Chloé Moreau", "Nathan Simon", "Inès Laurent", "Tom Garcia",
  "Jade Roux", "Noah Fontaine", "Manon Girard", "Léo Mercier",
  "Sarah Blanc", "Enzo Faure", "Camille Robin", "Paul Vidal",
  "Alice Henry", "Gabriel Roy", "Louna Dupont", "Théo Lopez",
];

// Colonnes/lignes adaptées au nombre de tuiles d'une page.
function gridForCount(n: number): { cols: number; rows: number } {
  let cols: number;
  if (n <= 1) cols = 1;
  else if (n <= 4) cols = 2;
  else if (n <= 9) cols = 3;
  else if (n <= 12) cols = 4;
  else if (n <= 20) cols = 5;
  else cols = 6;
  return { cols, rows: Math.ceil(n / cols) };
}

// Côté carré qui fait tenir une grille cols×rows dans le conteneur (container query).
function sizeFor(cols: number, rows: number): string {
  return `min(calc((100cqw - ${(cols - 1) * 14}px) / ${cols}), calc((100cqh - ${(rows - 1) * 14}px) / ${rows}))`;
}

type Item =
  | { kind: "real"; participant: Participant; isLocal: boolean }
  | { kind: "demo"; name: string; id: string };

function DemoTile({ name, id }: { name: string; id: string }) {
  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center shadow-[0_12px_30px_rgba(20,30,45,.12)]"
      style={{ background: participantGradient(id, false), transform: "translateZ(0)", isolation: "isolate" }}
    >
      <span
        className="font-display font-bold uppercase select-none"
        style={{ fontSize: "42px", letterSpacing: "0.02em", color: "rgba(255,255,255,.96)", textShadow: "0 1px 6px rgba(20,30,45,.18)" }}
      >
        {initials(name)}
      </span>
      <span
        className="absolute left-[13px] bottom-[13px] text-[12.5px] font-semibold text-white rounded-lg px-2.5 py-1"
        style={{ background: "rgba(10,16,24,.42)", backdropFilter: "blur(4px)" }}
      >
        {name}
      </span>
    </div>
  );
}

export function VideoGrid() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { chillMode, tilesVisible } = useChillMode();

  // Mode démo : ?demo=20 ajoute des tuiles factices pour visualiser une salle pleine.
  const [demoCount, setDemoCount] = useState(0);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("demo");
    const n = raw ? parseInt(raw, 10) : 0;
    if (Number.isFinite(n) && n > 0) setDemoCount(Math.min(n, 1000));
  }, []);

  const hidden = chillMode && !tilesVisible;
  const total = 1 + remoteParticipants.length;

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
        Connexion à la salle...
      </div>
    );
  }

  // Chaque client se voit toujours EN PREMIER (page 1). Les autres sont triés par
  // ordre d'arrivée → un nouveau venu apparaît en dernier (donc dernière page) pour
  // les autres, mais reste premier pour lui-même.
  const sortedRemotes = [...remoteParticipants].sort(
    (a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0)
  );
  const realItems: Item[] = [
    { kind: "real", participant: localParticipant, isLocal: true },
    ...sortedRemotes.map((p) => ({ kind: "real" as const, participant: p, isLocal: false })),
  ];

  const demoExtra = Math.max(0, demoCount - realItems.length);
  const demoItems: Item[] = Array.from({ length: demoExtra }, (_, i) => ({
    kind: "demo",
    name: DEMO_NAMES[i % DEMO_NAMES.length],
    id: `demo-${i}`,
  }));
  const items: Item[] = [...realItems, ...demoItems];

  // Pagination : seulement quand on dépasse PAGE_SIZE.
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paginated = items.length > PAGE_SIZE;
  const visibleItems = paginated
    ? items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
    : items;

  // Colonnes + taille de tuile. En pagination, on dimensionne pour une page pleine
  // (PAGE_SIZE) → tuiles identiques d'une page à l'autre. Une GRILLE à colonnes fixes
  // garantit le même agencement en mode normal et en chill (pas de recalcul flex).
  let cols: number;
  let tileSize: string;
  if (paginated) {
    const g = gridForCount(PAGE_SIZE);
    cols = g.cols;
    tileSize = sizeFor(g.cols, g.rows);
  } else if (demoCount > 0) {
    const g = gridForCount(items.length);
    cols = g.cols;
    tileSize = sizeFor(g.cols, g.rows);
  } else {
    cols = 3;
    tileSize = TILE_SIZE_DEFAULT;
  }

  return (
    <div className="flex-1 relative p-[18px] overflow-auto" style={{ containerType: "size" }}>
      <div
        className={`flex flex-wrap content-center justify-center items-center gap-[14px] h-full mx-auto transition-opacity duration-[360ms] ease-out ${
          hidden ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ maxWidth: `calc(${cols} * ${tileSize} + ${(cols - 1) * 14}px)` }}
      >
        {visibleItems.map((item) => (
          <div
            key={item.kind === "real" ? item.participant.identity : item.id}
            className="shrink-0"
            style={{ width: tileSize, height: tileSize }}
          >
            {item.kind === "real" ? (
              <VideoTile participant={item.participant} isLocal={item.isLocal} />
            ) : (
              <DemoTile name={item.name} id={item.id} />
            )}
          </div>
        ))}
      </div>

      {paginated && !chillMode && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 bg-surface border border-border rounded-full px-1.5 py-2 shadow-[0_8px_22px_rgba(20,30,45,.18)]">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="w-7 h-7 grid place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Page précédente"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-[12px] font-bold text-foreground tabular-nums leading-none py-0.5" title={`${items.length} participants`}>
            {safePage + 1}/{pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={safePage >= pages - 1}
            className="w-7 h-7 grid place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Page suivante"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
