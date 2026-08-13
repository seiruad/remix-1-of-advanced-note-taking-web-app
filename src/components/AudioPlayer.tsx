import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Music } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title: string;
  subtitle?: string;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [1, 1.25, 1.5, 2];

export function AudioPlayer({ src, title, subtitle }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setSpeedIdx(0);
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx, src]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  // simple static waveform, deterministic per src
  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) % 100000;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    return Array.from({ length: 48 }, () => 0.25 + rand() * 0.75);
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const skip = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  };

  const seekTo = (ratio: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  return (
    <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-8">
      <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-b from-slate-800 to-slate-800/50 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Music className={`w-6 h-6 text-emerald-400 ${playing ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 leading-snug break-all line-clamp-2">
              {title}
            </p>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* waveform / seek */}
        <div
          className="mt-5 h-14 flex items-end gap-[2px] cursor-pointer touch-none"
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
        >
          {bars.map((h, i) => {
            const active = (i / bars.length) * 100 <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  active ? 'bg-emerald-400' : 'bg-slate-600/70'
                }`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* controls */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setMuted((m) => !m)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => skip(-10)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
              title="-10s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={toggle}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 transition-colors"
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 translate-x-[1px]" />
              )}
            </button>
            <button
              onClick={() => skip(10)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
              title="+10s"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors tabular-nums"
            title="Playback speed"
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        muted={muted}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
