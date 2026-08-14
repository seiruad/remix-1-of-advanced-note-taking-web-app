import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [1, 1.25, 1.5, 2];

export function VideoPlayer({ src, title }: VideoPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setBuffered(0);
    setSpeedIdx(0);
    setWaiting(true);
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx, src]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2800);
  }, []);

  useEffect(() => {
    if (!playing || scrubbing) {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setControlsVisible(true);
      return;
    }
    bumpControls();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [playing, scrubbing, bumpControls]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    bumpControls();
  }, [bumpControls]);

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    bumpControls();
  };

  const seekFromEvent = (clientX: number, el: HTMLElement) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') skip(5);
      else if (e.key === 'ArrowLeft') skip(-5);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="w-full h-full flex items-center justify-center p-0 sm:p-4">
      <div
        ref={wrapRef}
        className="relative w-full max-w-3xl bg-black sm:rounded-2xl overflow-hidden sm:border sm:border-slate-700/70 sm:shadow-2xl group"
        onMouseMove={bumpControls}
        onPointerDown={bumpControls}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted={muted}
          preload="metadata"
          className="w-full max-h-[70vh] bg-black block"
          onClick={toggle}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0);
            setWaiting(false);
          }}
          onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => {
            setCurrent(e.currentTarget.currentTime);
            const b = e.currentTarget.buffered;
            if (b.length) setBuffered(b.end(b.length - 1));
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />

        {/* Loading spinner */}
        {waiting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-9 h-9 text-white/80 animate-spin" />
          </div>
        )}

        {/* Big center play */}
        {!playing && !waiting && (
          <button
            onClick={toggle}
            className="absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity"
            aria-label="Play"
          >
            <span className="w-16 h-16 rounded-full bg-emerald-600/95 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-colors">
              <Play className="w-7 h-7 translate-x-[2px]" />
            </span>
          </button>
        )}

        {/* Controls */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2.5 pb-2.5 pt-8 sm:px-4 sm:pb-3 transition-opacity duration-200 ${
            controlsVisible || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {title && (
            <p className="hidden sm:block text-[11px] text-white/70 truncate mb-1.5">{title}</p>
          )}

          {/* Seek bar */}
          <div
            className="relative h-6 flex items-center cursor-pointer touch-none"
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setScrubbing(true);
              seekFromEvent(e.clientX, e.currentTarget);
            }}
            onPointerMove={(e) => {
              if (scrubbing) seekFromEvent(e.clientX, e.currentTarget);
            }}
            onPointerUp={() => setScrubbing(false)}
            onPointerCancel={() => setScrubbing(false)}
          >
            <div className="relative w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-white/25"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-emerald-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-md -translate-x-1/2 transition-transform"
              style={{ left: `${progress}%`, transform: `translateX(-50%) scale(${scrubbing ? 1.2 : 1})` }}
            />
          </div>

          {/* Buttons row */}
          <div className="mt-1 flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white hover:bg-white/15 transition-colors flex-shrink-0"
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-[1px]" />}
            </button>
            <button
              onClick={() => skip(-10)}
              className="w-9 h-9 rounded-lg hidden xs:flex sm:flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0"
              title="-10s"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => skip(10)}
              className="w-9 h-9 rounded-lg hidden xs:flex sm:flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0"
              title="+10s"
            >
              <RotateCw className="w-4.5 h-4.5" />
            </button>

            <span className="ml-1 text-[11px] text-white/80 tabular-nums whitespace-nowrap">
              {formatTime(current)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button
              onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
              className="h-9 px-2 rounded-lg flex items-center justify-center text-[11px] font-semibold text-white/85 hover:text-white hover:bg-white/15 transition-colors tabular-nums flex-shrink-0"
              title="Playback speed"
            >
              {SPEEDS[speedIdx]}x
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0"
              title="Fullscreen"
            >
              {fullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
