import Link from "next/link";
import { Lock, Timer, Users } from "lucide-react";
import type { Room } from "@/lib/types";

export function RoomCard({ room }: { room: Room }) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium leading-tight group-hover:text-accent transition">{room.name}</h3>
        <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: room.color ?? "#6366f1" }} />
      </div>

      {room.description && (
        <p className="text-sm text-muted line-clamp-2">{room.description}</p>
      )}

      <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {room.max_participants} max
        </span>
        <div className="flex items-center gap-1.5">
          {room.pomodoro_enabled && (
            <span className="flex items-center gap-0.5 text-accent/80">
              <Timer className="w-3 h-3" />
              {room.pomodoro_mode}
            </span>
          )}
          {!room.is_public && (
            <span className="flex items-center gap-0.5 text-muted">
              <Lock className="w-3 h-3" />
              Privée
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
