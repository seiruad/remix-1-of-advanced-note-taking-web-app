import { useCallback, useEffect, useRef, useState, ReactNode } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 20;

function clampZoom(scale: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

interface ZoomPanSurfaceProps {
  children: ReactNode;
  className?: string;
  /** Change this to reset the transform (e.g. new file / new page) */
  resetKey?: string | number;
  /**
   * Keep native vertical scrolling available while not zoomed
   * (used for tall PDF pages). Wheel scrolls, ctrl+wheel / pinch zooms.
   */
  scrollable?: boolean;
}

/**
 * Generic pinch / wheel / double-tap zoom + pan surface.
 * Zoom is anchored at the pointer (or pinch midpoint), not the center.
 */
export function ZoomPanSurface({ children, className = '', resetKey, scrollable = false }: ZoomPanSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const baseSizeRef = useRef({ w: 0, h: 0 });
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const gestureRef = useRef({
    mode: 'none' as 'none' | 'pan' | 'pinch',
    startDist: 0,
    startScale: 1,
    startTranslate: { x: 0, y: 0 },
    startPointer: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
    startDelta: { x: 0, y: 0 },

  });

  const clampTranslate = useCallback((scale: number, x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const bw = baseSizeRef.current.w;
    const bh = baseSizeRef.current.h;
    if (!bw || !bh) return { x, y };

    // Allow offset in both directions: when content is smaller than the
    // container it may still be moved inside it (needed for point zoom).
    const maxX = Math.abs(bw * scale - cw) / 2;
    const maxY = Math.abs(bh * scale - ch) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const commitTransform = useCallback(
    (scale: number, x: number, y: number) => {
      const next = { scale, ...clampTranslate(scale, x, y) };
      transformRef.current = next;
      setTransform(next);
    },
    [clampTranslate]
  );

  const measure = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    baseSizeRef.current = { w: content.offsetWidth, h: content.offsetHeight };
  }, []);

  useEffect(() => {
    measure();
    commitTransform(1, 0, 0);
  }, [resetKey, measure, commitTransform]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(content);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Local point relative to container center
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  }, []);

  /**
   * Offset of a screen point from the content's *current* visual center.
   * Scaling happens around that center (transform-origin: 50% 50%), so the
   * anchor math must be expressed relative to it — otherwise zoom drifts to
   * the middle whenever the content isn't centered (scrollable / tall pages).
   */
  const toContentDelta = useCallback((clientX: number, clientY: number) => {
    const content = contentRef.current;
    if (!content) return { x: 0, y: 0 };
    const r = content.getBoundingClientRect();
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      // While unzoomed in scrollable mode let the browser scroll normally
      if (scrollable && !e.ctrlKey && transformRef.current.scale <= 1.001) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const cur = transformRef.current;
      const next = clampZoom(cur.scale * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
      const k = next / cur.scale;
      const q = toContentDelta(e.clientX, e.clientY);
      commitTransform(next, cur.x + q.x * (1 - k), cur.y + q.y * (1 - k));
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [commitTransform, toContentDelta, scrollable]);


  const getMidpoint = () => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  };

  const isScrollMode = scrollable && transform.scale <= 1.001;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (scrollable && e.pointerType !== 'touch' && transformRef.current.scale <= 1.001) return;
    const p = toLocal(e.clientX, e.clientY);
    pointersRef.current.set(e.pointerId, p);

    if (pointersRef.current.size === 1 && lastTapRef.current) {
      const dt = Date.now() - lastTapRef.current.time;
      const dist = Math.hypot(p.x - lastTapRef.current.x, p.y - lastTapRef.current.y);
      if (dt < DOUBLE_TAP_MS && dist < DOUBLE_TAP_DISTANCE_PX) {
        const cur = transformRef.current;
        if (cur.scale > 1.2) {
          commitTransform(1, 0, 0);
        } else {
          const next = 2.5;
          const k = next / cur.scale;
          const q = toContentDelta(e.clientX, e.clientY);
          commitTransform(next, cur.x + q.x * (1 - k), cur.y + q.y * (1 - k));
        }

        lastTapRef.current = null;
        gestureRef.current.mode = 'none';
        return;
      }
    }
    lastTapRef.current = { time: Date.now(), x: p.x, y: p.y };

    if (pointersRef.current.size === 1) {
      setIsGesturing(true);
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pan',
        startPointer: p,
        startTranslate: { ...transformRef.current },
        center: p,
      };
    } else if (pointersRef.current.size === 2) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      setIsGesturing(true);
      gestureRef.current = {
        mode: 'pinch',
        startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1,
        startScale: transformRef.current.scale,
        startTranslate: { ...transformRef.current },
        startPointer: p,
        center: getMidpoint(),
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId) || !containerRef.current) return;
    const p = toLocal(e.clientX, e.clientY);
    pointersRef.current.set(e.pointerId, p);
    const g = gestureRef.current;

    if (g.mode === 'pan' && pointersRef.current.size === 1) {
      if (transformRef.current.scale <= 1.001) return;
      commitTransform(
        transformRef.current.scale,
        g.startTranslate.x + (p.x - g.startPointer.x),
        g.startTranslate.y + (p.y - g.startPointer.y)
      );
    } else if (g.mode === 'pinch' && pointersRef.current.size === 2) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const next = clampZoom(g.startScale * (dist / g.startDist));
      const mid = getMidpoint();
      const k = next / g.startScale;
      // anchor the initial midpoint, and follow the moving midpoint (two-finger pan)
      commitTransform(
        next,
        mid.x - (g.center.x - g.startTranslate.x) * k,
        mid.y - (g.center.y - g.startTranslate.y) * k
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      setIsGesturing(false);
      gestureRef.current.mode = 'none';
      const cur = transformRef.current;
      if (cur.scale < 1.01) commitTransform(1, 0, 0);
      else commitTransform(cur.scale, cur.x, cur.y);
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pan',
        startPointer: remaining,
        startTranslate: { ...transformRef.current },
        center: remaining,
      };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex justify-center select-none ${
        isScrollMode
          ? 'overflow-y-auto overflow-x-hidden items-start touch-pan-y'
          : 'overflow-hidden items-center touch-none'
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={contentRef}
        className={`max-w-full ${scrollable ? 'flex-shrink-0' : 'max-h-full'}`}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isGesturing ? 'none' : 'transform 0.2s ease-out',
          cursor: transform.scale > 1 ? (isGesturing ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {children}
      </div>
    </div>
  );
}
