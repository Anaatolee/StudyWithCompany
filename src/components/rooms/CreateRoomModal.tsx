"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Subject } from "@/lib/types";

type Props = {
  subjects: Subject[];
  onClose: () => void;
  // Fired with the created room name + id so the parent can toast + navigate/refresh.
  onCreated: (name: string, roomId: string) => void;
  // Validation failure (e.g. empty name) bubbles up to the shared toast.
  onError: (message: string) => void;
};

const inputClass =
  "w-full bg-[#fbfcfe] border border-border rounded-[11px] px-[14px] py-3 text-[14.5px] text-foreground placeholder:text-[#9aa4b2] outline-none transition-colors focus:border-accent focus:bg-white";
const labelClass = "block text-[13px] font-semibold text-foreground mb-[7px]";

export function CreateRoomModal({ subjects, onClose, onCreated, onError }: Props) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [max, setMax] = useState("20");
  const [pomodoro, setPomodoro] = useState("50/10");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmed = name.trim();
    if (!trimmed) {
      onError("Donne un nom à ta salle");
      return;
    }

    const mode = pomodoro.trim() === "25/5" ? "25/5" : "50/10";
    const pomodoroEnabled = pomodoro.trim() === "25/5" || pomodoro.trim() === "50/10";
    const subject = subjects.find((s) => s.id === subjectId);

    setLoading(true);
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: desc.trim() || undefined,
          subjectId,
          color: subject?.color,
          isPublic: true,
          maxParticipants: Number(max) || 20,
          pomodoroEnabled,
          pomodoroMode: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Impossible de créer la salle.");
        setLoading(false);
        return;
      }
      onCreated(trimmed, data.roomId);
    } catch {
      onError("Impossible de créer la salle.");
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-5 py-12 bg-[rgba(25,34,46,.42)] backdrop-blur-[3px] swc-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] bg-surface border border-border rounded-[20px] shadow-[0_40px_90px_rgba(25,34,46,.28)] swc-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[26px] py-5 border-b border-[#eef3f8]">
          <h2 className="font-display font-bold text-[20px] text-foreground">Créer une salle</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 grid place-items-center rounded-[9px] bg-[#eef3f8] text-muted hover:bg-[#e3eef8] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-[26px] py-6 flex flex-col gap-[18px]">
            <div>
              <label className={labelClass} htmlFor="room-name">
                Nom de la salle
              </label>
              <input
                id="room-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Révisions partiel maths"
                maxLength={80}
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="room-desc">
                Description
              </label>
              <input
                id="room-desc"
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Quel est l'objectif de la session ?"
                maxLength={300}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="room-subject">
                Matière
              </label>
              <select
                id="room-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={inputClass}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="room-max">
                  Participants max
                </label>
                <input
                  id="room-max"
                  type="number"
                  min={1}
                  max={30}
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="room-pomodoro">
                  Pomodoro (focus / pause)
                </label>
                <input
                  id="room-pomodoro"
                  type="text"
                  value={pomodoro}
                  onChange={(e) => setPomodoro(e.target.value)}
                  placeholder="50/10"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-[26px] py-[18px] border-t border-[#eef3f8] bg-[#fbfcfe] rounded-b-[20px]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[11px] border border-border bg-white text-muted font-semibold text-[14.5px] px-4 py-2.5 hover:bg-[#eef3f8] transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-[11px] bg-accent text-white font-semibold text-[14.5px] px-4 py-2.5 shadow-[0_8px_18px_rgba(47,125,196,.26)] transition hover:bg-[#2a6fad] disabled:opacity-60"
            >
              {loading ? "Création…" : "Créer la salle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
