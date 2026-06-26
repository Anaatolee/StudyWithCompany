// Normalise le texte pour détecter les variantes courantes (l33tspeak, accents supprimés)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les accents : é→e, â→a…
    .replace(/[@0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/\*/g, "");
}

// Liste des termes bloqués (FR + EN). Volontairement non exhaustive
// pour éviter les faux positifs — se concentre sur les insultes non ambiguës.
const BLOCKED: string[] = [
  // Français
  "connard", "connasse", "salope", "enculer", "encule", "enculee",
  "fils de pute", "nique ta mere", "nique ta mère", "ntm", "niquer",
  "pedophile", "pedophile",
  // Anglais
  "motherfucker", "faggot", "nigger", "nigga",
];

// Termes courts traités comme des mots entiers (pour éviter "content" → "con")
const BLOCKED_WORDS: string[] = [
  "pute", "putain", "batard", "fdp", "vtff",
  "fuck", "shit", "bitch", "asshole", "cunt", "whore", "bastard",
];

export function containsProfanity(text: string): boolean {
  const n = normalize(text);

  if (BLOCKED.some((term) => n.includes(normalize(term)))) return true;

  // Vérification mot entier pour les termes courts
  if (BLOCKED_WORDS.some((word) => {
    const nw = normalize(word);
    return new RegExp(`(?<![a-z])${nw}(?![a-z])`, "i").test(n);
  })) return true;

  return false;
}

export const MSG_PROFANITY_ERROR = "Ce message contient un langage inapproprié.";
export const BIO_PROFANITY_ERROR = "La biographie contient un langage inapproprié.";
