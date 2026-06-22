"use client";

import { useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";

export type DmNotification = {
  fromId: string;
  fromUsername: string;
  preview: string;
};

export function DmToast({
  notification,
  onReply,
  onClose,
}: {
  notification: DmNotification;
  onReply: () => void;
  onClose: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onClose, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [notification.fromId, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 w-[320px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200">
      {/* Progress bar */}
      <div className="h-[3px] bg-accent/20">
        <div className="h-full bg-accent origin-left animate-[shrink_4s_linear_forwards]" />
      </div>

      <div className="flex items-start gap-3 p-4">
        <span className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
          <MessageCircle className="w-4 h-4 text-accent" />
        </span>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13.5px] text-foreground leading-none mb-1">
            {notification.fromUsername}
          </p>
          <p className="text-[13px] text-muted truncate leading-snug">
            {notification.preview}
          </p>
          <button
            onClick={() => { onReply(); onClose(); }}
            className="mt-2.5 text-[12.5px] font-semibold text-accent hover:underline"
          >
            Répondre
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-6 h-6 grid place-items-center rounded-md text-muted hover:bg-surface-2 transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
