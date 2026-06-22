import {
  Sigma,
  Atom,
  FlaskConical,
  Leaf,
  Landmark,
  Globe,
  BookOpen,
  Languages,
  Code,
  BrainCircuit,
  TrendingUp,
  Library,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Sigma,
  Atom,
  FlaskConical,
  Leaf,
  Landmark,
  Globe,
  BookOpen,
  Languages,
  Code,
  BrainCircuit,
  TrendingUp,
  Library,
};

export function subjectIcon(name: string): LucideIcon {
  return ICONS[name] ?? Library;
}

// Subject tag colors — harmonious OKLCH set (equal lightness/chroma, hue per
// subject) from the design handoff. Keyed by subject name; unknown → hue 250.
const SUBJECT_HUES: Record<string, number> = {
  Mathématiques: 255,
  Physique: 25,
  Chimie: 150,
  Biologie: 140,
  Histoire: 70,
  Géographie: 195,
  Littérature: 350,
  Langues: 300,
  Informatique: 270,
  Philosophie: 320,
  Économie: 165,
  "Étude libre": 250,
};

// Returns the subject's hue. The tag's lightness/chroma are applied by the
// `.subject-tag` CSS class (globals.css), which adapts to the active theme — set
// the hue as the `--tag-hue` custom property on the tag element.
export function subjectHue(name: string): number {
  return SUBJECT_HUES[name] ?? 250;
}
