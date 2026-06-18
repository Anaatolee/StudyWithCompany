"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Timer, Globe } from "lucide-react";
import { subjectIcon } from "@/lib/subjects";
import type { Subject } from "@/lib/types";

const COLORS = [
  "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6",
  "#10b981", "#22c55e", "#f59e0b", "#ef4444",
  "#ec4899", "#a855f7", "#737373",
];

export function CreateRoomForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [color, setColor] = useState(COLORS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [studyGoal, setStudyGoal] = useState("");
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<"25/5" | "50/10">("25/5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, studyGoal, subjectId, color, isPublic, maxParticipants, pomodoroEnabled, pomodoroMode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); return; }
      router.push(`/rooms/${data.roomId}`);
    } catch {
      setError("Impossible de créer la salle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Informations générales */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted">Informations</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nom de la salle *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            placeholder="Ex: Révisions bac, Projet data science…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Décrivez l'objectif de la salle…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Objectif du jour</label>
          <input
            type="text"
            value={studyGoal}
            onChange={(e) => setStudyGoal(e.target.value)}
            maxLength={120}
            placeholder="Ex: Révisions chapitre 5, Projet data science…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <p className="text-xs text-muted">Affiché dans la salle pour tous les membres.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Matière *</label>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {subjects.map((s) => {
              const Icon = subjectIcon(s.icon);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubjectId(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition ${
                    subjectId === s.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 bg-background"
                  }`}
                >
                  <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded" style={{ color: s.color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Apparence */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted">Apparence</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Couleur de la salle</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${color === c ? "scale-110" : "hover:scale-105"}`}
                style={{ background: c, outline: color === c ? `2px solid ${c}` : undefined, outlineOffset: "2px" }}
                title={c}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-4 h-4 rounded-full" style={{ background: color }} />
            <span className="text-xs text-muted font-mono">{color}</span>
          </div>
        </div>
      </section>

      {/* Accès */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted">Accès</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">Visibilité</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition ${
                isPublic ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 bg-background"
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Publique</div>
                <div className="text-xs text-muted">Visible par tous</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition ${
                !isPublic ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 bg-background"
              }`}
            >
              <Lock className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Privée</div>
                <div className="text-xs text-muted">Via lien uniquement</div>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Participants max : <span className="text-accent font-semibold">{maxParticipants}</span>
          </label>
          <input
            type="range"
            min={1}
            max={30}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            className="w-full accent-[--accent]"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>1</span>
            <span>30</span>
          </div>
        </div>
      </section>

      {/* Pomodoro collectif */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              Pomodoro collectif
            </h2>
            <p className="text-xs text-muted mt-0.5">Un timer partagé, synchronisé pour tous les membres</p>
          </div>
          <button
            type="button"
            onClick={() => setPomodoroEnabled((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${pomodoroEnabled ? "bg-accent" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pomodoroEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {pomodoroEnabled && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode par défaut</label>
            <div className="grid grid-cols-2 gap-2">
              {(["25/5", "50/10"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPomodoroMode(m)}
                  className={`py-2 rounded-lg border text-sm font-medium transition ${
                    pomodoroMode === m ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50 bg-background"
                  }`}
                >
                  {m}
                  <span className="block text-xs font-normal text-muted mt-0.5">
                    {m === "25/5" ? "25 min travail / 5 min pause" : "50 min travail / 10 min pause"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim() || !subjectId}
        className="w-full py-3 bg-accent text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Création en cours…" : "Créer la salle"}
      </button>
    </form>
  );
}
