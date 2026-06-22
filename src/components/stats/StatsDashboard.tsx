"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Flame, Layers, Timer, TrendingUp } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import type { Profile, StudySession, Subject } from "@/lib/types";

type Props = {
  profile: Profile | null;
  subjects: Subject[];
  sessions: StudySession[];
};

// --- helpers ---------------------------------------------------------------

function fmtDur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  return `${m} min`;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const DAY_MS = 86_400_000;
const ACTIVE_THRESHOLD = 60; // seconds in a day to count it as "studied"

export function StatsDashboard({ profile, subjects, sessions }: Props) {
  const [hoverSeg, setHoverSeg] = useState<number | null>(null);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const stats = useMemo(() => {
    const perDay = new Map<string, number>();
    const perSubject = new Map<string, number>();
    let total = 0;

    for (const s of sessions) {
      const dur = s.duration_seconds || 0;
      total += dur;
      const key = dayKey(new Date(s.started_at));
      perDay.set(key, (perDay.get(key) ?? 0) + dur);
      const sid = s.subject_id ?? "none";
      perSubject.set(sid, (perSubject.get(sid) ?? 0) + dur);
    }

    const today = startOfDay(new Date());
    const todayKey = dayKey(today);

    // This week (Monday → now)
    const jsDay = today.getDay(); // 0=Sun
    const mondayIndex = (jsDay + 6) % 7; // 0=Mon
    const weekStart = new Date(today.getTime() - mondayIndex * DAY_MS);
    let weekSeconds = 0;
    for (const [k, v] of perDay) if (k >= dayKey(weekStart)) weekSeconds += v;

    // Active days set (for streaks)
    const activeDays = new Set<string>();
    for (const [k, v] of perDay) if (v >= ACTIVE_THRESHOLD) activeDays.add(k);

    // Current streak: count back from today (or yesterday if nothing yet today)
    let current = 0;
    const cursor = new Date(today);
    if (!activeDays.has(todayKey)) cursor.setTime(cursor.getTime() - DAY_MS);
    while (activeDays.has(dayKey(cursor))) {
      current += 1;
      cursor.setTime(cursor.getTime() - DAY_MS);
    }

    // Longest streak across all active days
    const sortedDays = [...activeDays].sort();
    let longest = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const k of sortedDays) {
      const d = new Date(k + "T00:00:00");
      if (prev && d.getTime() - prev.getTime() === DAY_MS) run += 1;
      else run = 1;
      longest = Math.max(longest, run);
      prev = d;
    }

    const avgPerActiveDay = activeDays.size > 0 ? total / activeDays.size : 0;

    // Last 14 days bar chart
    const bars: { key: string; label: string; weekday: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      const k = dayKey(d);
      bars.push({
        key: k,
        label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        weekday: d.toLocaleDateString("fr-FR", { weekday: "short" }).charAt(0).toUpperCase(),
        value: perDay.get(k) ?? 0,
      });
    }

    // Per-subject segments (sorted desc)
    const segments = [...perSubject.entries()]
      .map(([sid, value]) => ({
        sid,
        value,
        name: sid === "none" ? "Autre" : subjectMap.get(sid)?.name ?? "Autre",
        color: sid === "none" ? "#94a3b8" : subjectMap.get(sid)?.color ?? "#94a3b8",
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);

    // Monthly calendar: current month
    const calYear = today.getFullYear();
    const calMonth = today.getMonth();
    const firstOfMonth = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    // 0=Sun → offset to Mon-first grid
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Mon
    const calCells: { day: number | null; key: string; value: number; isToday: boolean }[] = [];
    for (let i = 0; i < firstWeekday; i++) calCells.push({ day: null, key: "", value: 0, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth, d);
      const k = dayKey(date);
      calCells.push({ day: d, key: k, value: perDay.get(k) ?? 0, isToday: k === todayKey });
    }
    const calMonthLabel = today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    return {
      total,
      weekSeconds,
      sessionsCount: sessions.length,
      avgPerActiveDay,
      current,
      longest,
      bars,
      segments,
      calCells,
      calMonthLabel,
    };
  }, [sessions, subjectMap]);

  const hasData = sessions.length > 0 && stats.total > 0;
  const maxBar = Math.max(1, ...stats.bars.map((b) => b.value));

  return (
    <>
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-7 py-3.5 flex items-center justify-between">
          <Link href="/rooms" className="flex items-center gap-[11px]">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-accent grid place-items-center">
              <BookOpen className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </span>
            <span className="font-display font-bold text-[20px] tracking-[-0.01em]">
              StudyWithCompany
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/rooms"
              className="flex items-center gap-1.5 text-muted font-semibold text-[14.5px] px-3 py-2 rounded-[9px] hover:bg-surface-2 hover:text-foreground transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Salles</span>
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-7 pt-[clamp(28px,4vw,44px)] pb-20">
        <div className="mb-9">
          <h1 className="font-display font-bold text-[clamp(28px,4vw,40px)] leading-[1.05] tracking-[-0.025em] mb-2">
            Mes statistiques
          </h1>
          <p className="text-muted text-[16px]">
            {profile ? `@${profile.username} · ` : ""}Suis ton temps d&apos;étude et tes séries.
          </p>
        </div>

        {!hasData ? (
          <div className="bg-surface border border-border rounded-2xl py-16 px-6 text-center">
            <span className="w-14 h-14 rounded-2xl bg-accent-soft text-accent grid place-items-center mx-auto mb-5">
              <TrendingUp className="w-7 h-7" />
            </span>
            <h2 className="font-display font-bold text-[22px] mb-2">Pas encore de statistiques</h2>
            <p className="text-muted text-[15px] max-w-[420px] mx-auto mb-6">
              Rejoins une salle d&apos;étude pour commencer à enregistrer ton temps de travail.
              Tes stats et tes séries apparaîtront ici.
            </p>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 bg-accent text-white font-semibold text-[15px] px-[22px] py-[13px] rounded-[11px] shadow-[0_8px_20px_rgba(47,125,196,.28)] hover:opacity-90 transition"
            >
              Rejoindre une salle
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-[18px]">
            {/* KPI cards */}
            <div className="grid gap-[18px] grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={Clock} label="Temps total" value={fmtDur(stats.total)} />
              <KpiCard icon={TrendingUp} label="Cette semaine" value={fmtDur(stats.weekSeconds)} />
              <KpiCard icon={Timer} label="Sessions" value={String(stats.sessionsCount)} />
              <KpiCard icon={Layers} label="Moy. / jour actif" value={fmtDur(stats.avgPerActiveDay)} />
            </div>

            {/* Streak + heatmap */}
            <section className="bg-surface border border-border rounded-2xl p-[clamp(20px,3vw,28px)]">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-[#fff1e6] text-[#e8843c] grid place-items-center shrink-0">
                    <Flame className="w-6 h-6" />
                  </span>
                  <div>
                    <div className="font-display font-bold text-[26px] leading-none">
                      {stats.current} {stats.current > 1 ? "jours" : "jour"}
                    </div>
                    <div className="text-muted text-[13.5px] mt-1">Série en cours</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-[22px] leading-none text-accent">
                    {stats.longest}
                  </div>
                  <div className="text-muted text-[13.5px] mt-1">Record</div>
                </div>
              </div>

              {/* Monthly calendar */}
              <div>
                <p className="text-muted text-[13px] font-medium mb-3 capitalize">{stats.calMonthLabel}</p>
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 mb-1">
                  {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                    <div key={i} className="text-center text-muted text-[11.5px] font-semibold py-1">{d}</div>
                  ))}
                </div>
                {/* Cells */}
                <div className="grid grid-cols-7 gap-[5px]">
                  {stats.calCells.map((cell, i) => {
                    if (!cell.day) return <div key={i} />;
                    const studied = cell.value >= ACTIVE_THRESHOLD;
                    const intensity = studied ? calIntensity(cell.value) : 0;
                    return (
                      <div
                        key={cell.key}
                        title={studied ? fmtDur(cell.value) : undefined}
                        className={`aspect-square flex items-center justify-center rounded-[8px] text-[13px] font-semibold transition-all ${
                          cell.isToday
                            ? "ring-2 ring-accent ring-offset-1 ring-offset-surface"
                            : ""
                        }`}
                        style={{
                          background: studied
                            ? `rgb(var(--accent) / ${intensity})`
                            : "rgb(var(--surface-2))",
                          color: studied && intensity > 0.6 ? "white" : undefined,
                        }}
                      >
                        {cell.day}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-muted text-[12px]">Aucune session</span>
                  <div className="flex gap-1.5 items-center">
                    {[0.25, 0.5, 0.75, 1].map((op) => (
                      <div key={op} className="w-4 h-4 rounded-[4px]" style={{ background: `rgb(var(--accent) / ${op})` }} />
                    ))}
                  </div>
                  <span className="text-muted text-[12px]">Journée chargée</span>
                </div>
              </div>
            </section>

            <div className="grid gap-[18px] lg:grid-cols-[1.4fr_1fr]">
              {/* Bar chart — last 14 days */}
              <section className="bg-surface border border-border rounded-2xl p-[clamp(20px,3vw,28px)]">
                <h2 className="font-display font-bold text-[18px] mb-1">Temps par jour</h2>
                <p className="text-muted text-[13.5px] mb-6">14 derniers jours</p>
                <div className="flex items-end justify-between gap-1.5 h-[180px]">
                  {stats.bars.map((b) => (
                    <div key={b.key} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-foreground text-background text-[11.5px] font-semibold px-2 py-1 rounded-md z-10">
                        {b.label} · {fmtDur(b.value)}
                      </div>
                      <div
                        className="w-full max-w-[26px] rounded-t-[5px] bg-accent/85 group-hover:bg-accent transition-[height,background] min-h-[3px]"
                        style={{ height: `${(b.value / maxBar) * 100}%` }}
                      />
                      <span className="text-muted text-[10.5px] mt-1.5">{b.weekday}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Donut — per subject */}
              <section className="bg-surface border border-border rounded-2xl p-[clamp(20px,3vw,28px)]">
                <h2 className="font-display font-bold text-[18px] mb-1">Par matière</h2>
                <p className="text-muted text-[13.5px] mb-5">Répartition du temps</p>
                <div className="flex flex-col items-center gap-5">
                  <Donut
                    segments={stats.segments}
                    total={stats.total}
                    hover={hoverSeg}
                    setHover={setHoverSeg}
                  />
                  <ul className="w-full space-y-1.5">
                    {stats.segments.slice(0, 6).map((s, i) => (
                      <li
                        key={s.sid}
                        onMouseEnter={() => setHoverSeg(i)}
                        onMouseLeave={() => setHoverSeg(null)}
                        className={`flex items-center gap-2.5 text-[13.5px] px-2 py-1 rounded-lg transition ${
                          hoverSeg === i ? "bg-surface-2" : ""
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="font-semibold text-foreground truncate flex-1">{s.name}</span>
                        <span className="text-muted">{fmtDur(s.value)}</span>
                        <span className="text-muted/70 w-10 text-right">
                          {Math.round((s.value / stats.total) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function calIntensity(seconds: number): number {
  const min = seconds / 60;
  if (min < 30) return 0.25;
  if (min < 60) return 0.5;
  if (min < 120) return 0.75;
  return 1;
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-[18px]">
      <span className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent grid place-items-center mb-3">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <div className="font-display font-bold text-[24px] leading-none tracking-[-0.01em]">{value}</div>
      <div className="text-muted text-[13px] mt-1.5">{label}</div>
    </div>
  );
}

function Donut({
  segments,
  total,
  hover,
  setHover,
}: {
  segments: { sid: string; value: number; name: string; color: string }[];
  total: number;
  hover: number | null;
  setHover: (i: number | null) => void;
}) {
  const size = 180;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const active = hover != null ? segments[hover] : null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.sid}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? stroke + 4 : stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              opacity={hover == null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: "opacity .15s, stroke-width .15s", cursor: "pointer" }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <span className="font-display font-bold text-[20px] leading-none">
          {fmtDur(active ? active.value : total)}
        </span>
        <span className="text-muted text-[12px] mt-1 truncate max-w-[120px]">
          {active ? active.name : "Total"}
        </span>
      </div>
    </div>
  );
}
