import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  ReactNode,
} from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 20;

function clampZoom(scale: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

export interface ZoomPanSurfaceRef {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
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
  /** Called whenever the scale changes */
  onZoomChange?: (scale: number) => void;
}

/**
 * Scrollable variant (tall PDF pages): the content is laid out inside a sizer
 * whose size grows with the zoom, so the browser keeps native scrolling.
 * Zoom is anchored by adjusting scrollLeft / scrollTop, which is exact even
 * when the content is much taller than the viewport.
 */
const ScrollZoomSurface = forwardRef<ZoomPanSurfaceRef, ZoomPanSurfaceProps>(
  ({ children, className = '', resetKey, onZoomChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sizerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);
    const [zoomed, setZoomed] = useState(false);
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchRef = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
    const panRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
    const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

    const applyScale = useCallback((raw: number, clientX: number, clientY: number) => {
      const container = containerRef.current;
      const sizer = sizerRef.current;
      const content = contentRef.current;
      if (!container || !sizer || !content) return;
      const next = clampZoom(raw);
      const cur = scaleRef.current;
      if (next === cur) return;

      const rect = container.getBoundingClientRect();
      // point in the (scaled) content coordinate space
      const px = clientX - rect.left + container.scrollLeft;
      const py = clientY - rect.top + container.scrollTop;
      const k = next / cur;

      scaleRef.current = next;
      const bw = content.offsetWidth;
      const bh = content.offsetHeight;
      sizer.style.width = `${bw * next}px`;
      sizer.style.height = `${bh * next}px`;
      content.style.transform = `scale(${next})`;

      container.scrollLeft = px * k - (clientX - rect.left);
      container.scrollTop = py * k - (clientY - rect.top);
      setZoomed(next > 1.001);
      onZoomChange?.(next);
    }, [onZoomChange]);

    const reset = useCallback(() => {
      const container = containerRef.current;
      const sizer = sizerRef.current;
      const content = contentRef.current;
      scaleRef.current = 1;
      if (sizer) {
        sizer.style.width = '';
        sizer.style.height = '';
      }
      if (content) content.style.transform = 'scale(1)';
      if (container) {
        container.scrollLeft = 0;
        container.scrollTop = 0;
      }
      setZoomed(false);
      onZoomChange?.(1);
    }, [onZoomChange]);

    useImperativeHandle(ref, () => ({ zoomIn: () => {}, zoomOut: () => {}, reset }), [reset]);

    useEffect(() => {
      reset();
    }, [resetKey, reset]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const onWheel = (e: WheelEvent) => {
        if (!e.ctrlKey) return; // plain wheel keeps native scrolling
        e.preventDefault();
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
        applyScale(scaleRef.current * Math.exp(-dy * 0.01), e.clientX, e.clientY);
      };
      container.addEventListener('wheel', onWheel, { passive: false });
      return () => container.removeEventListener('wheel', onWheel);
    }, [applyScale]);

    const midpoint = () => {
      const pts = Array.from(pointersRef.current.values());
      if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'touch' && scaleRef.current <= 1.001) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 1) {
        const now = Date.now();
        const last = lastTapRef.current;
        if (
          last &&
          now - last.time < DOUBLE_TAP_MS &&
          Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_DISTANCE_PX
        ) {
          lastTapRef.current = null;
          if (scaleRef.current > 1.2) reset();
          else applyScale(2.5, e.clientX, e.clientY);
          return;
        }
        lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
        const container = containerRef.current;
        if (container && scaleRef.current > 1.001) {
          panRef.current = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: container.scrollLeft,
            scrollTop: container.scrollTop,
          };
        }
      } else if (pointersRef.current.size === 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        pinchRef.current = { dist: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1, mid: midpoint() };
        panRef.current = null;
      }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const mid = midpoint();
        const prev = pinchRef.current;
        // pan with the moving midpoint
        const container = containerRef.current;
        if (container && scaleRef.current > 1.001) {
          container.scrollLeft -= mid.x - prev.mid.x;
          container.scrollTop -= mid.y - prev.mid.y;
        }
        applyScale(scaleRef.current * (dist / prev.dist), mid.x, mid.y);
        pinchRef.current = { dist, mid };
      } else if (panRef.current && scaleRef.current > 1.001) {
        const container = containerRef.current;
        if (!container) return;
        container.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.x);
        container.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.y);
      }
    };

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;
      if (pointersRef.current.size === 0) panRef.current = null;
    };

    return (
      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto select-none ${className}`}
        style={{ touchAction: zoomed ? 'none' : 'pan-y', overscrollBehavior: 'contain' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={sizerRef} className="mx-auto w-fit">
          <div
            ref={contentRef}
            className="w-fit"
            style={{ transform: 'scale(1)', transformOrigin: '0 0', cursor: zoomed ? 'grab' : 'default' }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
ScrollZoomSurface.displayName = 'ScrollZoomSurface';

/**
 * Generic pinch / wheel / double-tap zoom + pan surface.
 * Zoom is anchored at the pointer (or pinch midpoint), not the center.
 */
export const ZoomPanSurface = forwardRef<ZoomPanSurfaceRef, ZoomPanSurfaceProps>(
  (props, ref) => {
    if (props.scrollable) return <ScrollZoomSurface {...props} ref={ref} />;
    return <TransformZoomSurface {...props} ref={ref} />;
  }
);
ZoomPanSurface.displayName = 'ZoomPanSurface';

const TransformZoomSurface = forwardRef<ZoomPanSurfaceRef, ZoomPanSurfaceProps>(
  ({ children, className = '', resetKey, scrollable = false, onZoomChange }, ref) => {
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

    useEffect(() => {
      onZoomChange?.(transform.scale);
    }, [transform.scale, onZoomChange]);

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

    const reset = useCallback(() => {
      measure();
      commitTransform(1, 0, 0);
    }, [measure, commitTransform]);

    useImperativeHandle(
      ref,
      () => ({
        reset,
        zoomIn: () => {
          const container = containerRef.current;
          const content = contentRef.current;
          if (!container || !content) return;
          const cur = transformRef.current;
          const next = clampZoom(cur.scale * 1.25);
          if (next === cur.scale) return;
          const rect = container.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const r = content.getBoundingClientRect();
          const qx = cx - (r.left + r.width / 2);
          const qy = cy - (r.top + r.height / 2);
          const k = next / cur.scale;
          commitTransform(next, cur.x + qx * (1 - k), cur.y + qy * (1 - k));
        },
        zoomOut: () => {
          const container = containerRef.current;
          const content = contentRef.current;
          if (!container || !content) return;
          const cur = transformRef.current;
          const next = clampZoom(cur.scale / 1.25);
          if (next === cur.scale) return;
          const rect = container.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const r = content.getBoundingClientRect();
          const qx = cx - (r.left + r.width / 2);
          const qy = cy - (r.top + r.height / 2);
          const k = next / cur.scale;
          commitTransform(next, cur.x + qx * (1 - k), cur.y + qy * (1 - k));
        },
      }),
      [commitTransform, reset]
    );

    useEffect(() => {
      reset();
    }, [resetKey, reset]);

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
        const mid = getMidpoint();
        const rect = containerRef.current.getBoundingClientRect();
        gestureRef.current = {
          mode: 'pinch',
          startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1,
          startScale: transformRef.current.scale,
          startTranslate: { ...transformRef.current },
          startPointer: p,
          center: mid,
          startDelta: toContentDelta(
            mid.x + rect.left + rect.width / 2,
            mid.y + rect.top + rect.height / 2
          ),
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
        // keep the pinched content point under the fingers, and follow the
        // moving midpoint so two fingers can pan at the same time
        commitTransform(
          next,
          g.startTranslate.x + g.startDelta.x * (1 - k) + (mid.x - g.center.x),
          g.startTranslate.y + g.startDelta.y * (1 - k) + (mid.y - g.center.y)
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
);
TransformZoomSurface.displayName = 'TransformZoomSurface';
