"use client";

import { participantGradient, initials } from "@/lib/participantColors";

// Avatar réutilisable : affiche la photo de profil si elle existe, sinon un
// dégradé déterministe (par identité) avec les initiales — même palette que les
// tuiles vidéo. Utilisé dans le chat, les DM et le panneau participants.
export function Avatar({
  url,
  name,
  identity,
  isLocal = false,
  size = 32,
  className = "",
}: {
  url?: string | null;
  name: string;
  identity: string;
  isLocal?: boolean;
  size?: number;
  className?: string;
}) {
  const px = `${size}px`;

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      className={`rounded-full grid place-items-center text-white font-bold shrink-0 uppercase select-none ${className}`}
      style={{
        width: px,
        height: px,
        fontSize: `${Math.round(size * 0.4)}px`,
        background: participantGradient(identity, isLocal),
      }}
    >
      {initials(name)}
    </span>
  );
}
