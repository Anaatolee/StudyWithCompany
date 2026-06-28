import Link from "next/link";
import { ArrowRight, Lock, Timer, Users } from "lucide-react";
import { subjectHue } from "@/lib/subjects";
import type { Room, Subject } from "@/lib/types";

type Props = {
  room: Room;
  subject?: Subject;
  // "mine" → footer shows "<max> max" + pomodoro; "listing" → "<n> en ligne" + Rejoindre
  variant?: "mine" | "listing";
  // Live online count (presence). TODO(backend): wire real presence counts.
  online?: number;
};

export function RoomCard({ room, subject, variant = "listing", online }: Props) {
  const isMine = variant === "mine";
  const tagHue = subject ? subjectHue(subject.name) : null;
  const dotColor = room.color ?? "rgb(var(--accent))";

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group relative flex flex-col bg-surface border border-border rounded-2xl p-[22px] shadow-[0_1px_2px_rgba(25,34,46,.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_16px_34px_rgba(25,34,46,.10)] hover:border-accent/40"
    >
      {/* Status dot */}
      {room.created_by && (
        <span
          className={`absolute top-[18px] right-[18px] w-[9px] h-[9px] rounded-full ${isMine ? "lp-pulse" : ""}`}
          style={{ backgroundColor: dotColor, boxShadow: `0 0 0 4px ${dotColor}22` }}
        />
      )}

      <h3
        className={`font-display font-bold text-foreground leading-tight pr-[22px] ${
          isMine ? "text-[18px]" : "text-[17.5px]"
        }`}
      >
        {room.name}
      </h3>

      {tagHue !== null && (
        <span
          className="subject-tag self-start mt-2.5 rounded-full font-bold text-[12px] px-[11px] py-1"
          style={{ "--tag-hue": tagHue } as React.CSSProperties}
        >
          {subject!.name}
        </span>
      )}

      {room.description && (
        <p
          className={`text-muted leading-[1.55] mt-2.5 ${isMine ? "text-[14px]" : "text-[13.5px]"}`}
        >
          {room.description}
        </p>
      )}

      <div className="mt-auto pt-[15px] flex items-center justify-between gap-2 border-t border-border text-[12.5px] text-muted">
        {isMine ? (
          <>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {room.max_participants} max
            </span>
            <span className="flex items-center gap-1.5 text-accent">
              {room.pomodoro_enabled ? (
                <>
                  <Timer className="w-3.5 h-3.5" />
                  {room.pomodoro_mode}
                </>
              ) : !room.is_public ? (
                <span className="flex items-center gap-1 text-muted">
                  <Lock className="w-3 h-3" /> Privée
                </span>
              ) : null}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {online ?? 0} en ligne
            </span>
            <span className="flex items-center gap-1 font-semibold text-accent">
              Rejoindre
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
