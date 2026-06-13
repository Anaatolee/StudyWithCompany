import Link from "next/link";
import { Users } from "lucide-react";
import type { Room } from "@/lib/types";

export function RoomCard({
  room,
  color,
}: {
  room: Room;
  color: string;
}) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium leading-tight group-hover:text-accent transition">
          {room.name}
        </h3>
        <span
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: color }}
        />
      </div>
      {room.description && (
        <p className="text-sm text-muted line-clamp-2">{room.description}</p>
      )}
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs text-muted">
        <Users className="w-3.5 h-3.5" />
        <span>jusqu'à {room.max_participants} participants</span>
      </div>
    </Link>
  );
}
