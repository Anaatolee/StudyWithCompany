// Participant tile gradients — exact palette from the design handoff
// (linear-gradient(150deg, c1, c2)). The first pair is reserved for the
// current user ("vous"); the others are assigned deterministically by identity.
const SELF: [string, string] = ["#3f8fd0", "#2563a6"]; // bleu (vous)
const OTHERS: [string, string][] = [
  ["#56a86f", "#3a7d52"], // vert
  ["#8fb4d6", "#6f96bd"], // bleu clair
  ["#c98fb0", "#a86a92"], // rose
  ["#7fb8af", "#5e978e"], // sarcelle
  ["#cbb066", "#a88f47"], // or
  ["#9b8fd0", "#736aa8"], // violet
  ["#d69a7a", "#b8765a"], // terracotta
  ["#6f8fcf", "#4f6fac"], // indigo
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function participantGradient(identity: string, isLocal: boolean): string {
  const [c1, c2] = isLocal ? SELF : OTHERS[hash(identity) % OTHERS.length];
  return `linear-gradient(150deg, ${c1}, ${c2})`;
}

// Two-letter uppercase initials from a display name.
export function initials(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
