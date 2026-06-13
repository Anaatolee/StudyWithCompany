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
