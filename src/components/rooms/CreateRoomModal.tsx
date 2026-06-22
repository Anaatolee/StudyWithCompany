"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Globe, Lock, X } from "lucide-react";
import { subjectIcon } from "@/lib/subjects";
import type { Subject } from "@/lib/types";

type Props = {
  subjects: Subject[];
  onClose: () => void;
  // Validation / API errors bubble up to the dashboard toast.
  onError: (message: string) => void;
};

const COLORS = [
  "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#10b981", "#22c55e",
  "#f59e0b", "#ef4444", "#ec4899", "#a855f7", "#6b7280",
];

const inputClass =
  "w-full bg-background border border-border rounded-[10px] px-[15px] py-[13px] text-[15px] text-foreground placeholder:text-muted outline-none transition-[border-color,background-color] duration-150 focus:border-accent focus:bg-surface";
const labelClass = "block text-[14.5px] font-semibold text-foreground mb-[9px]";
const eyebrowClass =
  "text-[12px] font-bold tracking-[0.09em] uppercase text-muted mb-5 flex items-center gap-1.5";
const cardClass =
  "bg-surface border border-border rounded-[18px] p-[clamp(22px,3vw,30px)] shadow-[0_1px_3px_rgba(25,34,46,.04)]";
// Selected state shared by subject / visibility / mode options.
const selectedOption = "bg-accent-soft border-accent shadow-[0_0_0_1px_rgb(var(--accent))]";
const unselectedOption = "bg-surface border-border hover:border-accent/40";

export function CreateRoomModal({ subjects, onClose, onError }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [color, setColor] = useState("#3b82f6");
  const [isPublic, setIsPublic] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [pomodoro, setPomodoro] = useState(true);
  const [mode, setMode] = useState<"25/5" | "50/10" | "custom">("25/5");
  const [customWork, setCustomWork] = useState(25);   // minutes
  const [customBreak, setCustomBreak] = useState(5);  // minutes
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length > 0 && subjectId.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          studyGoal: objective.trim() || undefined,
          subjectId,
          color,
          isPublic,
          maxParticipants,
          pomodoroEnabled: pomodoro,
          pomodoroMode: mode,
          ...(mode === "custom" && {
            pomodoroCustomWork: Math.max(1, Math.min(240, customWork)) * 60,
            pomodoroCustomBreak: Math.max(1, Math.min(120, customBreak)) * 60,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Impossible de créer la salle.");
        setLoading(false);
        return;
      }
      // Created → enter the new room.
      router.push(`/rooms/${data.roomId}`);
    } catch {
      onError("Impossible de créer la salle.");
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-5 py-[clamp(24px,5vw,56px)] bg-[rgba(25,34,46,.42)] backdrop-blur-[3px] swc-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[720px] bg-background rounded-[22px] shadow-[0_40px_90px_rgba(25,34,46,.28)] p-[clamp(24px,4vw,40px)] swc-pop"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-5 right-5 w-9 h-9 grid place-items-center rounded-[10px] bg-surface border border-border text-muted hover:bg-surface-2 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="mb-[34px] pr-10">
          <h1 className="font-display font-bold text-[clamp(34px,4.4vw,46px)] leading-[1.04] tracking-[-0.02em]">
            Créer une salle
          </h1>
          <p className="text-[17px] text-muted mt-2">
            Configurez votre espace d&apos;étude personnalisé.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
          {/* INFORMATIONS */}
          <section className={cardClass}>
            <p className={eyebrowClass}>Informations</p>

            <div className="mb-[18px]">
              <label className={labelClass} htmlFor="room-name">
                Nom de la salle <span className="text-accent">*</span>
              </label>
              <input
                id="room-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Révisions du bac blanc"
                maxLength={80}
                autoFocus
                className={inputClass}
              />
            </div>

            <div className="mb-[18px]">
              <label className={labelClass} htmlFor="room-desc">
                Description
              </label>
              <textarea
                id="room-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="De quoi parle cette salle ? Qui peut la rejoindre ?"
                rows={3}
                maxLength={300}
                className={`${inputClass} min-h-[96px] leading-[1.5] resize-y`}
              />
            </div>

            <div className="mb-[18px]">
              <label className={labelClass} htmlFor="room-objective">
                Objectif du jour
              </label>
              <input
                id="room-objective"
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Ex. Terminer 3 chapitres d'analyse"
                maxLength={120}
                className={inputClass}
              />
              <p className="text-[13px] text-muted mt-2">
                Affiché dans la salle pour tous les membres.
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Matière <span className="text-accent">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5 max-h-[236px] overflow-y-auto scrollbar-thin p-1 pr-2">
                {subjects.map((s) => {
                  const Icon = subjectIcon(s.icon);
                  const active = subjectId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubjectId(s.id)}
                      className={`flex items-center gap-2.5 text-left px-[15px] py-[13px] rounded-[11px] border text-[14.5px] font-semibold transition-all duration-150 ${
                        active ? selectedOption : unselectedOption
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: s.color }} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* APPARENCE */}
          <section className={cardClass}>
            <p className={eyebrowClass}>Apparence</p>
            <label className={labelClass}>Couleur de la salle</label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className="w-[30px] h-[30px] rounded-full border-2 border-surface transition"
                  style={{
                    background: c,
                    boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3.5">
              <span className="w-[13px] h-[13px] rounded-full" style={{ background: color }} />
              <span className="text-[13.5px] font-semibold text-muted [font-variant-numeric:tabular-nums]">
                {color}
              </span>
            </div>
          </section>

          {/* ACCÈS */}
          <section className={cardClass}>
            <p className={eyebrowClass}>Accès</p>

            <label className={labelClass}>Visibilité</label>
            <div className="flex gap-3 mb-6">
              {[
                { pub: true, Icon: Globe, title: "Publique", sub: "Visible par tous", iconColor: "rgb(var(--accent))" },
                { pub: false, Icon: Lock, title: "Privée", sub: "Via lien uniquement", iconColor: "rgb(var(--muted))" },
              ].map(({ pub, Icon, title, sub, iconColor }) => {
                const active = isPublic === pub;
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setIsPublic(pub)}
                    className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-[12px] border text-left transition-all duration-150 ${
                      active ? selectedOption : unselectedOption
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" style={{ color: iconColor }} />
                    <span>
                      <span className="block text-[15px] font-bold text-foreground">{title}</span>
                      <span className="block text-[12.5px] text-muted">{sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} mb-0`}>Participants max</label>
              <span className="text-[16px] font-bold text-accent [font-variant-numeric:tabular-nums]">
                {maxParticipants}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[12.5px] text-muted mt-1">
              <span>1</span>
              <span>30</span>
            </div>
          </section>

          {/* POMODORO */}
          <section className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`${eyebrowClass} mb-1.5`}>
                  <Clock className="w-[15px] h-[15px]" />
                  Pomodoro collectif
                </p>
                <p className="text-[13.5px] text-muted">
                  Un timer partagé, synchronisé pour tous les membres.
                </p>
              </div>
              {/* Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={pomodoro}
                onClick={() => setPomodoro((v) => !v)}
                className={`relative shrink-0 w-[46px] h-[26px] rounded-full transition-colors duration-200 ${
                  pomodoro ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-[left] duration-200"
                  style={{ left: pomodoro ? "23px" : "3px" }}
                />
              </button>
            </div>

            {pomodoro && (
              <div className="mt-5">
                <label className={labelClass}>Mode par défaut</label>
                <div className="flex gap-3 flex-wrap">
                  {([
                    { val: "25/5"  as const, label: "25/5",  sub: "25 min travail · 5 min pause" },
                    { val: "50/10" as const, label: "50/10", sub: "50 min travail · 10 min pause" },
                    { val: "custom" as const, label: "Personnalisé", sub: "Choisissez vos durées" },
                  ]).map(({ val, label, sub }) => {
                    const active = mode === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMode(val)}
                        className={`flex-1 min-w-[140px] flex flex-col items-center text-center px-4 py-3.5 rounded-[12px] border transition-all duration-150 ${
                          active ? selectedOption : unselectedOption
                        }`}
                      >
                        <span className={`text-[17px] font-bold ${active ? "text-accent" : "text-foreground"}`}>
                          {label}
                        </span>
                        <span className="text-[12.5px] text-muted mt-0.5">{sub}</span>
                      </button>
                    );
                  })}
                </div>

                {mode === "custom" && (
                  <div className="mt-4 flex gap-4">
                    <label className="flex-1">
                      <span className={labelClass}>Travail (min)</span>
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={customWork}
                        onChange={(e) => setCustomWork(Number(e.target.value))}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex-1">
                      <span className={labelClass}>Pause (min)</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={customBreak}
                        onChange={(e) => setCustomBreak(Number(e.target.value))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full rounded-[13px] bg-accent text-white font-bold text-[16px] py-[17px] shadow-[0_10px_24px_rgba(47,125,196,.3)] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Création…" : "Créer la salle"}
          </button>
        </form>
      </div>
    </div>
  );
}
