"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { UserStatus } from "@/lib/types";
import { StatusDot, STATUS_META, STATUS_ORDER } from "./StatusIndicator";

// Bouton de statut (header). Affiche le statut courant (pastille + libellé) et
// ouvre un menu déroulant pour en changer. La valeur est persistée dans profiles.status.
export function StatusSelector({ userId, initial }: { userId: string; initial: UserStatus }) {
  const [status, setStatus] = useState<UserStatus>(initial);
  const [open, setOpen] = useState(false);

  async function choose(s: UserStatus) {
    setOpen(false);
    if (s === status) return;
    setStatus(s); // maj optimiste
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ status: s }).eq("id", userId);
    if (error) console.error("[status] maj:", error);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2.5 pr-2 py-[7px] rounded-full border border-border hover:bg-surface-2 transition"
        title="Changer mon statut"
      >
        <StatusDot status={status} />
        <span className="text-[13.5px] font-semibold text-foreground hidden sm:inline">
          {STATUS_META[status].label}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-[13px] shadow-[0_18px_44px_rgba(25,34,46,.18)] p-1.5 z-40 swc-pop">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => choose(s)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[14px] font-semibold text-foreground transition ${
                  s === status ? "bg-accent-soft" : "hover:bg-surface-2"
                }`}
              >
                <StatusDot status={s} />
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
