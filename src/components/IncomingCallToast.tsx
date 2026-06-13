"use client";

import { Phone, PhoneOff } from "lucide-react";

export type IncomingInvite = {
  roomName: string;
  fromUserId: string;
  fromUsername: string;
};

export function IncomingCallToast({
  invite,
  onAccept,
  onDecline,
}: {
  invite: IncomingInvite;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 bg-surface border border-border rounded-xl shadow-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <Phone className="w-4 h-4 text-accent animate-pulse" />
        </div>
        <div>
          <p className="font-medium">{invite.fromUsername}</p>
          <p className="text-xs text-muted">vous appelle en privé</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Phone className="w-4 h-4" /> Accepter
        </button>
        <button
          onClick={onDecline}
          className="flex-1 bg-background border border-border hover:bg-red-500/10 hover:border-red-500/40 rounded-lg py-2 text-sm flex items-center justify-center gap-1.5"
        >
          <PhoneOff className="w-4 h-4" /> Refuser
        </button>
      </div>
    </div>
  );
}
