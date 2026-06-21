"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

const RAW_TRACKS = [
  "alex-morgan-calm-chillout-541036.mp3",
  "alex-morgan-chill-545522.mp3",
  "alex-morgan-peaceful-cafe-jazz-relaxing-coffee-shop-541031.mp3",
  "alex-morgan-sad-piano-548643.mp3",
  "alex-morgan-study-lofi-music-548638.mp3",
  "artur_aravidi_music-lumen-lofi-to-study-lo-fi-cafe-music-399106.mp3",
  "atlasaudio-sad-lofi-516966.mp3",
  "fassounds-good-night-lofi-cozy-chill-music-160166.mp3",
  "fassounds-lofi-study-calm-peaceful-chill-hop-112191.mp3",
  "fberns5-final-exam-spring-time-lofi-beats-to-study-to-345979.mp3",
  "leberch-lofi-516620.mp3",
  "prettyjohn1-lofi-beats-524251.mp3",
  "prettyjohn1-lofi-lofi-music-533423.mp3",
  "purrplecat-a-place-to-hide-518600.mp3",
  "purrplecat-ghost-town-518603.mp3",
  "purrplecat-itx27s-going-to-be-a-good-day-185240.mp3",
  "purrplecat-learning-to-love-myself-lofi-hiphop-beats-185245.mp3",
  "purrplecat-long-day-518602.mp3",
  "purrplecat-silent-wood-533706.mp3",
  "purrplecat-stranded-533707.mp3",
  "purrplecat-time-to-think-388889.mp3",
  "purrplecat-walking-to-the-park-at-3-am-lofi-hiphop-beats-188361.mp3",
  "sonican-lo-fi-music-loop-sentimental-jazzy-love-473154.mp3",
  "soulprodmusic-mars-lofi-study-beat-beats-to-relax-chillhop-122874.mp3",
  "vividillustrate-lofi-beat-to-study-299573.mp3",
];

function toTitle(filename: string): string {
  return filename
    .replace(/\.mp3$/, "")
    .replace(/_/g, "-")
    .replace(/-\d+$/, "")
    .split("-")
    .slice(1) // drop author prefix (first segment)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || filename;
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TRACKS = RAW_TRACKS.map((f) => ({ src: `/music/${f}`, title: toTitle(f) }));

type Props = { compact?: boolean };

export function LofiPlayer({ compact = false }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [order] = useState(() => shuffle(TRACKS.map((_, i) => i)));
  const [orderIdx, setOrderIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);

  const currentIdx = order[orderIdx];
  const track = TRACKS[currentIdx];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.play().catch(() => setPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [playing]);

  function loadTrack(newOrderIdx: number, autoplay: boolean) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = TRACKS[order[newOrderIdx]].src;
    audio.load();
    if (autoplay) audio.play().catch(() => setPlaying(false));
  }

  function goNext() {
    const next = (orderIdx + 1) % order.length;
    setOrderIdx(next);
    loadTrack(next, playing);
  }

  function goPrev() {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const prev = (orderIdx - 1 + order.length) % order.length;
    setOrderIdx(prev);
    loadTrack(prev, playing);
  }

  const controls = (
    <>
      <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-background transition" title="Précédent">
        <SkipBack className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setPlaying((p) => !p)}
        className="p-1.5 rounded-lg bg-accent text-white hover:opacity-90 transition"
        title={playing ? "Pause" : "Lecture"}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-background transition" title="Suivant">
        <SkipForward className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setMuted((m) => !m)}
        className="p-1 text-muted hover:text-foreground transition"
        title={muted ? "Activer le son" : "Couper le son"}
      >
        {muted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
      <input
        type="range" min={0} max={1} step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (v > 0) setMuted(false); }}
        className="w-20 accent-[var(--accent)] h-1 cursor-pointer"
      />
      <audio ref={audioRef} src={track.src} onEnded={goNext} preload="auto" />
    </>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 pl-3 pr-[7px] py-[5px] rounded-full bg-surface border border-border shadow-[0_2px_8px_rgba(20,30,45,.05)]">
        <Music className="w-[15px] h-[15px] text-accent shrink-0" />
        <span className="text-[11.5px] font-semibold text-foreground/80 max-w-[110px] truncate">{track.title}</span>
        <button onClick={goPrev} className="w-[23px] h-[23px] grid place-items-center rounded-lg text-muted hover:bg-background transition" title="Précédent">
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-[30px] h-[30px] grid place-items-center rounded-full bg-accent text-white hover:opacity-90 transition shrink-0"
          title={playing ? "Pause" : "Lecture"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-px" />}
        </button>
        <button onClick={goNext} className="w-[23px] h-[23px] grid place-items-center rounded-lg text-muted hover:bg-background transition" title="Suivant">
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-5 bg-border mx-0.5" />
        <button
          onClick={() => setMuted((m) => !m)}
          className="text-muted hover:text-foreground transition shrink-0"
          title={muted ? "Activer le son" : "Couper le son"}
        >
          {muted || volume === 0 ? <VolumeX className="w-[15px] h-[15px]" /> : <Volume2 className="w-[15px] h-[15px]" />}
        </button>
        <input
          type="range" min={0} max={1} step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => { const v = Number(e.target.value); setVolume(v); if (v > 0) setMuted(false); }}
          className="w-[54px] accent-accent h-1 cursor-pointer"
        />
        <audio ref={audioRef} src={track.src} onEnded={goNext} preload="auto" />
      </div>
    );
  }

  return (
    <div className="border-b border-border px-3 py-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
        <Music className="w-3.5 h-3.5" />
        Lofi
      </div>
      <p className="text-xs font-medium truncate text-foreground/80 px-0.5">{track.title}</p>
      <div className="flex items-center gap-1">{controls}</div>
    </div>
  );
}
