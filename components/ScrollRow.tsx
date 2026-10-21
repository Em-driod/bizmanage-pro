import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  // Classes for the scrolling element itself (flex, gap, padding…).
  className?: string;
  // Classes for the outer wrapper (e.g. "inline-block max-w-full").
  wrapperClassName?: string;
  style?: React.CSSProperties;
  // Colour the content fades into at a clipped edge — match the background behind the row.
  fade?: string;
  // When this changes, the active item ([aria-current="page"] / [data-active="true"]) is scrolled into view.
  activeKey?: string | number | null;
  // Give the right arrow a little wiggle the first time it appears, to say "there's more".
  nudge?: boolean;
  label?: string;
}

// A horizontally scrolling row (tabs, chips, a wide table) that shows a fade and
// an arrow button on whichever side has hidden content, so people on phones can
// see — and reach — what's off-screen.
const ScrollRow: React.FC<Props> = ({ children, className = '', wrapperClassName = '', style, fade = '#ffffff', activeKey, nudge = true, label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [nudged, setNudged] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollWidth - el.clientWidth - el.scrollLeft > 4;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  useLayoutEffect(measure);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure]);

  // Bring the selected tab/chip into view (e.g. the 4th tab on a narrow phone).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="page"], [data-active="true"]');
    if (!active) return;
    const target = active.offsetLeft - el.clientWidth / 2 + active.offsetWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
    measure();
  }, [activeKey, measure]);

  // Only wiggle once per row, shortly after the arrow first appears.
  useEffect(() => {
    if (!nudge || nudged || !edges.right) return;
    const t = setTimeout(() => setNudged(true), 2400);
    return () => clearTimeout(t);
  }, [edges.right, nudge, nudged]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.7), behavior: reduced ? 'auto' : 'smooth' });
  };

  const arrow = (side: 'left' | 'right') => (
    <div
      className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-12 flex items-center ${side === 'left' ? 'justify-start' : 'justify-end'} pointer-events-none z-[1]`}
      style={{ background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${fade} 35%, ${fade}00)` }}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={() => scrollBy(side === 'left' ? -1 : 1)}
        aria-label={side === 'left' ? 'Scroll back' : 'See more'}
        className={`pointer-events-auto w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-slate-900 flex items-center justify-center ${
          side === 'right' && nudge && !nudged ? 'scrollrow-nudge' : ''
        }`}
      >
        <i className={`fas fa-chevron-${side} text-[10px]`} />
      </button>
    </div>
  );

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div
        ref={ref}
        role={label ? 'group' : undefined}
        aria-label={label}
        className={`scrollrow-scroll overflow-x-auto ${className}`}
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', ...style }}
      >
        {children}
      </div>
      {edges.left && arrow('left')}
      {edges.right && arrow('right')}
      <style>{`
        @keyframes scrollrow-nudge { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(4px); } 40% { transform: translateX(0); } 60% { transform: translateX(4px); } }
        .scrollrow-nudge { animation: scrollrow-nudge 1.2s ease-in-out 0.4s 2; }
        @media (prefers-reduced-motion: reduce) { .scrollrow-nudge { animation: none; } }
        .scrollrow-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ScrollRow;
