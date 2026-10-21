import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { getTour, WELCOME_TOUR_ID, type Tour, type TourStep, type TourTarget } from './tours';

// ─────────────────────────────────────────────────────────────────────────────
// First-visit guided tours.
//
// The first time someone opens a page, a short spotlight tour explains it:
// the screen dims except the thing being described, and a card walks through
// it with Back / Next / Skip. The very first time anyone uses the app, a
// welcome tour of the app's frame runs first. Seen tours are remembered per
// user (and per tour version, so a rewritten tour shows again). The "?" button
// in the header replays the current page's tour at any time.
// ─────────────────────────────────────────────────────────────────────────────

interface TourStore {
  seen: Record<string, number>;
  once: Record<string, true>;
  off?: boolean;
}

interface TourContextType {
  start: (opts?: { manual?: boolean }) => void;
  running: boolean;
  hasTour: boolean;
  resetAll: () => void;
}

const TourContext = createContext<TourContextType>({ start: () => {}, running: false, hasTour: false, resetAll: () => {} });
export const useTour = () => useContext(TourContext);

const storeKey = (userId?: string) => `morniy.tours.v1.${userId || 'anon'}`;
const readStore = (userId?: string): TourStore => {
  try {
    const v = JSON.parse(localStorage.getItem(storeKey(userId)) || '{}');
    return { seen: v.seen || {}, once: v.once || {}, off: !!v.off };
  } catch {
    return { seen: {}, once: {} };
  }
};
const writeStore = (userId: string | undefined, s: TourStore) => {
  try {
    localStorage.setItem(storeKey(userId), JSON.stringify(s));
  } catch {
    /* private mode — tours just show again next time */
  }
};

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Finding what a step points at ────────────────────────────────────────────

const visible = (el: Element) => {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = getComputedStyle(el);
  if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false;
  // Off-canvas (e.g. the closed mobile sidebar) counts as not visible.
  return r.right > 0 && r.left < window.innerWidth;
};

const ownText = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim();

export const findTarget = (t: TourTarget): HTMLElement | null => {
  const root =
    (t.in === 'sidebar' && document.querySelector('[data-tour="sidebar"]')) ||
    (t.in === 'header' && document.querySelector('[data-tour="header"]')) ||
    (t.in !== 'document' && document.querySelector('[data-tour="main"]')) ||
    document;
  if (t.heading) {
    const rx = t.heading;
    return (Array.from(root.querySelectorAll('h1, h2, h3')).find((el) => rx.test(ownText(el)) && visible(el)) as HTMLElement) || null;
  }
  if (t.sel) {
    const all = Array.from(root.querySelectorAll(t.sel));
    return (all.find(visible) as HTMLElement) || null;
  }
  if (t.text) {
    const rx = t.text;
    // Prefer controls; fall back to headings and labels. Shortest match wins
    // so "New Receipt" picks the button, not the card that contains it.
    for (const sel of ['button, a, [role="button"], [role="tab"], select', 'h1, h2, h3, h4, label, p, span']) {
      const matches = Array.from(root.querySelectorAll(sel)).filter((el) => rx.test(ownText(el)) && visible(el));
      if (matches.length) return matches.sort((a, b) => ownText(a).length - ownText(b).length)[0] as HTMLElement;
    }
  }
  return null;
};

// ── Card placement ───────────────────────────────────────────────────────────

type Box = { top: number; left: number; width: number; height: number };
type Placed = { top: number; left: number; side: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'dock-top' | 'dock-bottom'; arrow: number };

const GAP = 14;
const MARGIN = 12;

const place = (target: Box | null, card: { w: number; h: number }, preferred?: TourStep['placement']): Placed => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!isDesktop() && window.innerWidth < 640) {
    // Phones: a bottom sheet, moved to the top when the target is low on screen.
    const low = target && target.top + target.height / 2 > vh * 0.55;
    return low
      ? { top: MARGIN, left: MARGIN, side: 'dock-top', arrow: 0 }
      : { top: vh - card.h - MARGIN, left: MARGIN, side: 'dock-bottom', arrow: 0 };
  }
  if (!target) return { top: Math.max(MARGIN, (vh - card.h) / 2), left: Math.max(MARGIN, (vw - card.w) / 2), side: 'center', arrow: 0 };

  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  const clampX = (x: number) => Math.min(Math.max(x, MARGIN), vw - card.w - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(y, MARGIN), vh - card.h - MARGIN);
  const fits = {
    bottom: vh - (target.top + target.height) >= card.h + GAP + MARGIN,
    top: target.top >= card.h + GAP + MARGIN,
    right: vw - (target.left + target.width) >= card.w + GAP + MARGIN,
    left: target.left >= card.w + GAP + MARGIN,
  };
  const order = (preferred && preferred !== 'auto' ? [preferred, 'bottom', 'top', 'right', 'left'] : ['bottom', 'top', 'right', 'left']) as (keyof typeof fits)[];
  const side = order.find((s) => fits[s]);

  if (side === 'bottom' || side === 'top') {
    const left = clampX(cx - card.w / 2);
    return {
      top: side === 'bottom' ? target.top + target.height + GAP : target.top - card.h - GAP,
      left,
      side,
      arrow: Math.min(Math.max(cx - left, 20), card.w - 20),
    };
  }
  if (side === 'right' || side === 'left') {
    const top = clampY(cy - card.h / 2);
    return {
      top,
      left: side === 'right' ? target.left + target.width + GAP : target.left - card.w - GAP,
      side,
      arrow: Math.min(Math.max(cy - top, 20), card.h - 20),
    };
  }
  // Nothing fits beside a big target (e.g. a whole panel): float the card over its lower part.
  return { top: clampY(target.top + target.height - card.h - MARGIN), left: clampX(cx - card.w / 2), side: 'center', arrow: 0 };
};

// ── Provider ─────────────────────────────────────────────────────────────────

interface Running {
  tour: Tour;
  steps: TourStep[];
  index: number;
  // After the welcome tour, continue into this page's tour.
  then?: string | null;
}

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { branding } = useBranding();
  const location = useLocation();
  const [run, setRun] = useState<Running | null>(null);
  const storeRef = useRef<TourStore>(readStore(user?._id));

  useEffect(() => {
    storeRef.current = readStore(user?._id);
  }, [user?._id]);

  const ctx = useMemo(
    () => ({ firstName: (user?.name || '').split(' ')[0] || 'there', businessName: branding.name, isAdmin: user?.role === 'admin' }),
    [user?.name, user?.role, branding.name],
  );

  const save = (patch: (s: TourStore) => void) => {
    const s = { ...storeRef.current, seen: { ...storeRef.current.seen }, once: { ...storeRef.current.once } };
    patch(s);
    storeRef.current = s;
    writeStore(user?._id, s);
  };

  const prepare = useCallback(
    (tour: Tour): TourStep[] => {
      const desktop = isDesktop();
      return tour.steps.filter((s) => {
        if (s.desktopOnly && !desktop) return false;
        if (s.mobileOnly && desktop) return false;
        if (s.adminOnly && !ctx.isAdmin) return false;
        if (s.onceKey && storeRef.current.once[s.onceKey]) return false;
        return true;
      });
    },
    [ctx.isAdmin],
  );

  const launch = useCallback(
    (tourId: string, then?: string | null) => {
      const tour = getTour(tourId, ctx);
      if (!tour) return false;
      const steps = prepare(tour);
      if (!steps.length) return false;
      setRun({ tour, steps, index: 0, then: then ?? null });
      return true;
    },
    [ctx, prepare],
  );

  const pageTourId = location.pathname;

  // Auto-start on a page's first visit (and the welcome tour on the very first).
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setRun(null); // leaving a page abandons its tour; it shows again next visit
    const s = storeRef.current;
    if (s.off) return;
    const pageTour = getTour(pageTourId, ctx);
    // Only inside the app — never on public pages (shop, invoice links…).
    if (!pageTour) return;
    const welcomeDue = !s.seen[WELCOME_TOUR_ID];
    const pageDue = !!pageTour && s.seen[pageTour.id] !== pageTour.version;
    if (!welcomeDue && !pageDue) return;
    const t = setTimeout(() => {
      if (welcomeDue) launch(WELCOME_TOUR_ID, pageDue ? pageTourId : null);
      else launch(pageTourId);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTourId, isAuthenticated, user?._id]);

  const end = (completed: boolean) => {
    if (!run) return;
    const { tour, then } = run;
    save((s) => {
      s.seen[tour.id] = tour.version;
    });
    setRun(null);
    // Finishing the welcome tour rolls into this page's own tour; skipping doesn't.
    if (completed && then) setTimeout(() => launch(then), 350);
  };

  const markOnce = (step: TourStep) => {
    if (step.onceKey && !storeRef.current.once[step.onceKey]) save((s) => (s.once[step.onceKey!] = true));
  };

  const start = useCallback(
    (opts?: { manual?: boolean }) => {
      if (!launch(pageTourId)) launch(WELCOME_TOUR_ID);
      void opts;
    },
    [launch, pageTourId],
  );

  const resetAll = () => {
    save((s) => {
      s.seen = {};
      s.once = {};
      s.off = false;
    });
    launch(WELCOME_TOUR_ID, pageTourId);
  };

  const turnOff = () => {
    save((s) => {
      s.off = true;
    });
    if (run) save((s) => (s.seen[run.tour.id] = run.tour.version));
    setRun(null);
  };

  const value = useMemo(
    () => ({ start, running: !!run, hasTour: !!getTour(pageTourId, ctx), resetAll }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, run, pageTourId, ctx],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {run &&
        createPortal(
          <TourOverlay
            key={run.tour.id}
            run={run}
            accent={branding.accentColor}
            onIndex={(index) => setRun((r) => (r ? { ...r, index } : r))}
            onEnd={end}
            onTurnOff={turnOff}
            onShown={markOnce}
          />,
          document.body,
        )}
    </TourContext.Provider>
  );
};

// ── Overlay ──────────────────────────────────────────────────────────────────

const TourOverlay: React.FC<{
  run: Running;
  accent: string;
  onIndex: (i: number) => void;
  onEnd: (completed: boolean) => void;
  onTurnOff: () => void;
  onShown: (s: TourStep) => void;
}> = ({ run, accent, onIndex, onEnd, onTurnOff, onShown }) => {
  const { steps, index, tour } = run;
  const step = steps[index]!;
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Box | null>(null);
  const [searching, setSearching] = useState(true);
  const [pos, setPos] = useState<Placed | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const dirRef = useRef<1 | -1>(1);
  const reduced = prefersReducedMotion();
  const isLast = index === steps.length - 1;
  const total = steps.length;

  const go = useCallback(
    (i: number) => {
      dirRef.current = i >= index ? 1 : -1;
      if (i < 0) return;
      if (i >= steps.length) onEnd(true);
      else onIndex(i);
    },
    [index, steps.length, onEnd, onIndex],
  );

  // Find this step's element (pages may still be loading — keep looking briefly).
  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    setPos(null);
    if (!step.target) {
      setTarget(null);
      setRect(null);
      setSearching(false);
      onShown(step);
      return;
    }
    const started = Date.now();
    const look = () => {
      if (cancelled) return;
      const el = findTarget(step.target!);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        setTarget(el);
        setSearching(false);
        onShown(step);
        return;
      }
      if (Date.now() - started > 1600) {
        // Not on screen (empty page, feature hidden for this user…).
        if (step.optional !== false) {
          const next = index + dirRef.current;
          if (next < 0) onIndex(index + 1 < steps.length ? index + 1 : index);
          else if (next >= steps.length) onEnd(true);
          else onIndex(next);
        } else {
          setTarget(null);
          setRect(null);
          setSearching(false);
          onShown(step);
        }
        return;
      }
      setTimeout(look, 120);
    };
    look();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tour.id]);

  // Follow the element while the page scrolls, resizes or animates.
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    let last = '';
    const tick = () => {
      const r = target.getBoundingClientRect();
      const pad = step.padding ?? 8;
      const box = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
      const sig = `${Math.round(box.top)}:${Math.round(box.left)}:${Math.round(box.width)}:${Math.round(box.height)}`;
      if (sig !== last) {
        last = sig;
        setRect(box);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [target, step.padding]);

  // Position the card once it has a size.
  useLayoutEffect(() => {
    if (searching || !cardRef.current) return;
    const c = cardRef.current;
    setPos(place(rect, { w: c.offsetWidth, h: c.offsetHeight }, step.placement));
  }, [rect, searching, index, step.placement]);

  useEffect(() => {
    if (pos) primaryRef.current?.focus({ preventScroll: true });
  }, [pos, index]);

  // Keyboard: → / Enter next, ← back, Esc skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEnd(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, onEnd]);

  const docked = pos?.side === 'dock-bottom' || pos?.side === 'dock-top';
  const transition = reduced ? 'none' : 'top 320ms cubic-bezier(.2,.8,.2,1), left 320ms cubic-bezier(.2,.8,.2,1), width 320ms cubic-bezier(.2,.8,.2,1), height 320ms cubic-bezier(.2,.8,.2,1)';
  const shade = 'rgba(15, 23, 42, 0.62)';

  return (
    <div className="fixed inset-0 z-[2000]" aria-live="polite">
      {/* Dimmed backdrop with a cut-out around the target */}
      {rect ? (
        <>
          <div
            className="fixed pointer-events-none"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: step.radius ?? 14, boxShadow: `0 0 0 9999px ${shade}`, transition }}
          />
          <div
            className="fixed pointer-events-none tour-ring"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: step.radius ?? 14,
              boxShadow: `0 0 0 2px ${accent}, 0 0 0 6px ${accent}33`,
              transition,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0" style={{ background: shade, transition: reduced ? 'none' : 'opacity 200ms' }} />
      )}
      {/* Clicks outside the card do nothing — the tour stays put until Next/Skip. */}
      <div className="fixed inset-0" onClick={() => primaryRef.current?.focus()} />

      {!searching && (
        <div
          key={index}
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          className={`fixed bg-white shadow-2xl ${docked ? 'rounded-3xl' : 'rounded-2xl'} ${reduced ? '' : 'tour-card-in'}`}
          style={{
            top: pos?.side === 'dock-bottom' ? undefined : pos?.top ?? -9999,
            bottom: pos?.side === 'dock-bottom' ? MARGIN : undefined,
            left: pos?.left ?? -9999,
            width: docked ? `calc(100vw - ${MARGIN * 2}px)` : 'min(360px, calc(100vw - 24px))',
            visibility: pos ? 'visible' : 'hidden',
            transition: reduced ? 'none' : 'top 320ms cubic-bezier(.2,.8,.2,1), left 320ms cubic-bezier(.2,.8,.2,1)',
          }}
        >
          {/* Arrow */}
          {pos && ['top', 'bottom', 'left', 'right'].includes(pos.side) && (
            <span
              className="absolute w-3.5 h-3.5 bg-white rotate-45"
              style={
                pos.side === 'bottom'
                  ? { top: -7, left: pos.arrow - 7 }
                  : pos.side === 'top'
                    ? { bottom: -7, left: pos.arrow - 7 }
                    : pos.side === 'right'
                      ? { left: -7, top: pos.arrow - 7 }
                      : { right: -7, top: pos.arrow - 7 }
              }
            />
          )}

          <div className="relative p-5">
            <div className="flex items-start gap-3">
              {step.icon && (
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent + '18', color: accent }}>
                  <i className={`fas ${step.icon}`} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
                  {tour.label} · {index + 1} of {total}
                </p>
                <h3 id="tour-title" className="text-base font-black text-slate-900 leading-snug mt-1">
                  {step.title}
                </h3>
              </div>
              <button
                onClick={() => onEnd(false)}
                className="w-8 h-8 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 shrink-0"
                aria-label="Close tour"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>
            <p id="tour-body" className="text-sm text-slate-600 leading-relaxed mt-2.5">
              {step.body}
            </p>
            {step.tip && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 mt-3">
                <i className="fas fa-lightbulb text-amber-400 mr-1.5" />
                {step.tip}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 mt-4">
              {/* Progress */}
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    tabIndex={-1}
                    onClick={() => go(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: i === index ? 18 : 6, background: i <= index ? accent : '#e2e8f0' }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {index > 0 ? (
                  <button onClick={() => go(index - 1)} className="h-9 px-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">
                    Back
                  </button>
                ) : (
                  <button onClick={() => onEnd(false)} className="h-9 px-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-100">
                    Skip
                  </button>
                )}
                <button
                  ref={primaryRef}
                  onClick={() => go(index + 1)}
                  className="h-9 px-4 rounded-xl text-sm font-black text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-4"
                  style={{ background: accent, ['--tw-ring-color' as string]: accent + '40' }}
                >
                  {isLast ? step.doneLabel || 'Got it' : step.nextLabel || 'Next'}
                  {!isLast && <i className="fas fa-arrow-right text-[10px] ml-1.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
            <span className="hidden sm:inline">
              <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> to move · <kbd className="font-sans">Esc</kbd> to close
            </span>
            {index > 0 && (
              <button onClick={() => onEnd(false)} className="hover:text-slate-600 sm:hidden">
                Skip tour
              </button>
            )}
            <button onClick={onTurnOff} className="hover:text-slate-600 ml-auto">
              Turn off tips
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tour-card-in { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        .tour-card-in { animation: tour-card-in 260ms cubic-bezier(.2,.8,.2,1); }
        @keyframes tour-ring { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
        .tour-ring { animation: tour-ring 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .tour-card-in, .tour-ring { animation: none; } }
      `}</style>
    </div>
  );
};
