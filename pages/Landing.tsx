import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ─── MAGNETIC CURSOR ────────────────────────────────────── */
const MagneticCursor: React.FC = () => {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 120, damping: 18 });
  const sy = useSpring(y, { stiffness: 120, damping: 18 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    const down = () => setActive(true);
    const up = () => setActive(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, [x, y]);

  return (
    <>
      <motion.div
        style={{ translateX: '-50%', translateY: '-50%', left: sx, top: sy }}
        animate={{ scale: active ? 0.4 : 1 }}
        className="fixed z-[999] pointer-events-none w-4 h-4 rounded-full bg-[#C8FF00] mix-blend-difference"
      />
      <motion.div
        animate={{ scale: active ? 1.8 : 1 }}
        transition={{ type: 'spring', stiffness: 50, damping: 14 }}
        className="fixed z-[998] pointer-events-none w-10 h-10 rounded-full border border-[#C8FF00]/40 mix-blend-difference"
        style={{ translateX: '-50%', translateY: '-50%', left: sx, top: sy }}
      />
    </>
  );
};

/* ─── GLITCH TEXT ─────────────────────────────────────────── */
const GlitchText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setGlitch(true);
      const tid = setTimeout(() => setGlitch(false), 160);
      return () => clearTimeout(tid);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`relative inline-block select-none ${className}`}>
      {glitch ? (
        <>
          <span className="opacity-0">{text}</span>
          <span className="absolute inset-0 text-[#C8FF00]" style={{ clipPath: 'polygon(0 20%, 100% 20%, 100% 55%, 0 55%)', transform: 'translateX(-5px)' }}>{text}</span>
          <span className="absolute inset-0 text-[#FF3366]" style={{ clipPath: 'polygon(0 55%, 100% 55%, 100% 90%, 0 90%)', transform: 'translateX(5px)' }}>{text}</span>
          <span className="absolute inset-0 text-white" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 20%, 0 20%)' }}>{text}</span>
        </>
      ) : (
        <span>{text}</span>
      )}
    </span>
  );
};

/* ─── SCROLLING TICKER ────────────────────────────────────── */
const Ticker: React.FC<{ items: string[] }> = ({ items }) => {
  const all = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden py-3.5 border-y border-white/[0.06] bg-[#0A0A0A]">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap"
      >
        {all.map((item, i) => (
          <span key={i} className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 px-8 flex-shrink-0">
            {item}<span className="ml-8 text-[#C8FF00]">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
};

/* ─── ANIMATED COUNTER ────────────────────────────────────── */
const Counter: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = '' }) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let v = 0;
      const step = target / 75;
      const t = setInterval(() => {
        v += step;
        if (v >= target) { setVal(target); clearInterval(t); }
        else setVal(Math.floor(v));
      }, 16);
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

/* ─── MINI BAR CHART ─────────────────────────────────────── */
const MiniChart: React.FC = () => {
  const heights = [40, 65, 45, 80, 60, 95, 70, 88, 55, 75, 90, 100];
  return (
    <div className="flex items-end gap-1.5 h-20">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.8 + i * 0.06, duration: 0.4 }}
          style={{ originY: 1, height: `${h}%` }}
          className={`flex-1 rounded-t-sm ${i === heights.length - 1 ? 'bg-[#C8FF00]' : 'bg-white/10'}`}
        />
      ))}
    </div>
  );
};

/* ─── LANDING PAGE ───────────────────────────────────────── */
const Landing: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 700], [0, -180]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.88]);

  const modules = [
    { num: '01', label: 'Cashflow', title: 'Money Never Sleeps', desc: 'Real-time ledger across currencies. Every cent tracked without a spreadsheet graveyard.', accent: '#C8FF00' },
    { num: '02', label: 'Clients', title: 'Know Your People', desc: 'CRM built for operators. Relationship data that surfaces context, not just contact info.', accent: '#FF3366' },
    { num: '03', label: 'Payroll', title: 'Pay. On Time.', desc: 'Automate salary runs for your whole team. One operation. Zero drama.', accent: '#00D4FF' },
    { num: '04', label: 'Reports', title: 'Data Has a Voice', desc: 'Revenue intelligence rendered as narrative. Numbers that actually tell a story.', accent: '#FF8C00' },
  ];

  const stats = [
    { val: 4200, suffix: '+', label: 'Active Businesses' },
    { val: 99, suffix: '.9%', label: 'System Uptime' },
    { val: 12, suffix: 'M+', label: 'Transactions Logged' },
  ];

  const tickerItems = ['Cashflow Intelligence', 'Client CRM', 'Invoice Scanning', 'Payroll Automation', 'Live Reports', 'Multi-currency', 'Role-based Access'];

  const checkFeatures: [string, string][] = [
    ['Scan & digitize invoices in seconds', '#C8FF00'],
    ['Multi-currency transaction tracking', '#FF3366'],
    ['Automated payroll processing', '#00D4FF'],
    ['Role-based access for your whole team', '#FF8C00'],
    ['Live revenue & expense reports', '#C8FF00'],
    ['Full client relationship management', '#FF3366'],
  ];

  return (
    <div style={{ cursor: 'none', fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: '#080808', color: '#F0F0F0', overflowX: 'hidden', position: 'relative' }}>
      <MagneticCursor />

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-[200]">
        <div className="absolute inset-0 bg-[#080808]/80 backdrop-blur-xl border-b border-white/[0.05]" />
        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#C8FF00] rounded-[3px] flex items-center justify-center">
              <span className="text-[10px] font-black text-black">OP</span>
            </div>
            <span className="text-sm font-black uppercase tracking-[0.25em] text-white">OpsFlow</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-10">
            {[['Features', '#features'], ['Metrics', '#metrics'], ['Why Us', '#why']].map(([label, href]) => (
              <a key={label} href={href} className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/35 hover:text-[#C8FF00] transition-colors">{label}</a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-[11px] font-black uppercase tracking-[0.3em] text-white/35 hover:text-white transition-colors px-3 py-2">
              Login
            </Link>
            <Link to="/register" className="group relative overflow-hidden bg-[#C8FF00] text-black text-[11px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-sm">
              <span className="relative z-10">Get Access</span>
              <span className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
              className="md:hidden w-9 h-9 flex items-center justify-center border border-white/10 rounded-sm text-white hover:border-white/30 transition-colors"
            >
              {menuOpen ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              ) : (
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                  <rect y="0" width="18" height="2" rx="1" fill="currentColor" />
                  <rect y="6" width="12" height="2" rx="1" fill="currentColor" />
                  <rect y="12" width="18" height="2" rx="1" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[190] bg-[#080808] flex flex-col pt-24 px-8"
          >
            {[
              { label: 'Features', href: '#features', isExternal: true },
              { label: 'Metrics', href: '#metrics', isExternal: true },
              { label: 'Why Us', href: '#why', isExternal: true },
              { label: 'Login', href: '/login', isExternal: false },
              { label: 'Register', href: '/register', isExternal: false },
            ].map(({ label, href, isExternal }, i) => (
              <motion.div
                key={label}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                className="block"
              >
                {isExternal ? (
                  <a
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-4xl font-black uppercase tracking-tight py-4 border-b border-white/5 text-white/60 hover:text-[#C8FF00] transition-colors"
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    to={href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-4xl font-black uppercase tracking-tight py-4 border-b border-white/5 text-white/60 hover:text-[#C8FF00] transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20">

        {/* Grid bg */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(200,255,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(200,255,0,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 65% 65% at 65% 45%, rgba(200,255,0,0.05) 0%, transparent 70%)',
        }} />

        {/* Giant bg text */}
        <motion.div
          style={{ y: heroParallax }}
          className="absolute right-[-2%] top-1/2 -translate-y-1/2 pointer-events-none select-none"
        >
          <span style={{ fontSize: 'clamp(12rem, 24vw, 26rem)', fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.018)', letterSpacing: '-0.05em', display: 'block' }}>
            OPS
          </span>
        </motion.div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-12 w-full">
          <div className="grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-12 xl:gap-20 items-center">

            {/* ── HERO LEFT ── */}
            <motion.div
              style={{ scale: heroScale }}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 md:space-y-10"
            >
              {/* Eyebrow */}
              <div className="flex items-center gap-3">
                <div style={{ width: 32, height: 2, background: '#C8FF00' }} />
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#C8FF00' }}>
                  Business Operations Platform
                </span>
              </div>

              {/* H1 */}
              <div>
                <h1 style={{ fontSize: 'clamp(3.8rem, 9.5vw, 9.5rem)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.045em', textTransform: 'uppercase', margin: 0 }}>
                  <span className="block text-white"><GlitchText text="Run Your" /></span>
                  <span className="block relative" style={{ display: 'inline-block' }}>
                    <span className="relative z-10 text-black" style={{ WebkitTextStroke: '2px white', WebkitTextFillColor: 'transparent' }}>Business</span>
                    <span className="absolute bottom-1 left-0 right-0 z-0" style={{ height: '35%', background: '#C8FF00', marginBottom: 2 }} />
                    <span className="absolute inset-0 z-20" style={{ WebkitTextStroke: '2px white', WebkitTextFillColor: 'transparent' }}>Business</span>
                  </span>
                  <br />
                  <span className="block" style={{ color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', fontWeight: 300 }}>
                    <GlitchText text="Like a Pro" />
                  </span>
                </h1>
              </div>

              {/* Subtext */}
              <p style={{ maxWidth: 480, fontSize: 17, lineHeight: 1.65, color: 'rgba(240,240,240,0.4)', fontWeight: 500 }}>
                One command center for finances, clients, invoices, and team. Stop juggling tools — start seeing clearly.
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/register" className="group relative overflow-hidden bg-[#C8FF00] text-black font-black text-xs uppercase tracking-[0.35em] px-8 py-4 rounded-sm inline-flex items-center gap-3">
                  <span className="relative z-10 flex items-center gap-3">
                    Start Free
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </span>
                  <span className="absolute inset-0 bg-white translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300" />
                </Link>
                <Link to="/login" className="border border-white/10 text-white/50 hover:text-white hover:border-white/30 px-8 py-4 rounded-sm font-black text-xs uppercase tracking-[0.35em] transition-all">
                  Sign In
                </Link>
              </div>
            </motion.div>

            {/* ── HERO RIGHT: Dashboard card ── */}
            <motion.div
              initial={{ opacity: 0, x: 80, rotate: 3 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block relative"
            >
              {/* Main card */}
              <div className="relative bg-[#111] border border-white/8 rounded-2xl p-6 space-y-5">
                {/* Status row */}
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Live Dashboard</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-pulse" />
                    <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(200,255,0,0.6)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>LIVE</span>
                  </div>
                </div>

                {/* Revenue metric */}
                <div className="space-y-1">
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)' }}>Monthly Revenue</p>
                  <p style={{ fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.1 }}>₦4,820,500</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#C8FF00' }}>↑ 18.4% vs last month</p>
                </div>

                {/* Bar chart */}
                <MiniChart />

                {/* Bottom stat */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)' }}>Active Clients</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>247</span>
                </div>

                {/* Glow */}
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#C8FF00]/8 blur-3xl rounded-full pointer-events-none" />
              </div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-5 -left-8 bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C8FF00] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)' }}>Invoice Scanned</p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: 'white' }}>₦185,000 captured</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)' }} />
        </motion.div>
      </section>

      {/* ── TICKER ── */}
      <Ticker items={tickerItems} />

      {/* ═══════════════════════════════════════════
          MODULES
      ═══════════════════════════════════════════ */}
      <section id="features" className="py-24 md:py-40">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">

          <div className="flex items-center justify-between mb-16 md:mb-24">
            <div className="flex items-center gap-4">
              <div style={{ width: 32, height: 2, background: '#C8FF00' }} />
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#C8FF00' }}>Core Modules</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.15)' }}>04 Pillars</span>
          </div>

          <div>
            {modules.map((mod, i) => (
              <motion.div
                key={i}
                onHoverStart={() => setHoveredModule(i)}
                onHoverEnd={() => setHoveredModule(null)}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.65, delay: i * 0.07 }}
                className="relative border-b border-white/[0.06] group overflow-hidden"
              >
                {/* Hover bg fill */}
                <motion.div
                  animate={{ scaleX: hoveredModule === i ? 1 : 0 }}
                  initial={{ scaleX: 0 }}
                  style={{ originX: 0, position: 'absolute', inset: 0, pointerEvents: 'none', background: mod.accent + '09' }}
                  transition={{ duration: 0.4 }}
                />

                <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-10 py-9 md:py-14">
                  {/* Number */}
                  <div className="w-14 flex-shrink-0">
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: mod.accent + '70' }}>{mod.num}</span>
                  </div>

                  {/* Label tag (desktop) */}
                  <div className="hidden md:flex flex-shrink-0 items-center">
                    <span style={{
                      fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.45em',
                      padding: '4px 12px', borderRadius: 100, color: mod.accent,
                      background: mod.accent + '14', border: `1px solid ${mod.accent}30`,
                    }}>
                      {mod.label}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'white', margin: 0 }}>
                      {mod.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <div className="md:w-72 xl:w-88">
                    <p style={{ fontSize: 14, color: 'rgba(240,240,240,0.4)', lineHeight: 1.65, fontWeight: 500 }}>{mod.desc}</p>
                  </div>

                  {/* Arrow */}
                  <motion.div
                    animate={{ x: hoveredModule === i ? 0 : -6, opacity: hoveredModule === i ? 1 : 0.2 }}
                    transition={{ duration: 0.25 }}
                    className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full items-center justify-center"
                    style={{ border: `1px solid ${mod.accent}50`, color: mod.accent }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          STATS
      ═══════════════════════════════════════════ */}
      <section id="metrics" className="border-y border-white/[0.05]" style={{ background: '#0A0A0A' }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="py-16 md:py-20 px-8 text-center md:text-left first:pl-0 last:pr-0"
              >
                <div style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  <Counter target={s.val} suffix={s.suffix} />
                </div>
                <p style={{ marginTop: 12, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.25)' }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          WHY OPSFLOW
      ═══════════════════════════════════════════ */}
      <section id="why" className="py-24 md:py-40">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 md:gap-28 items-start">

            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75 }}
              className="space-y-8 lg:sticky lg:top-32"
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 28, height: 2, background: '#C8FF00' }} />
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#C8FF00' }}>Why OpsFlow</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.9, margin: 0 }}>
                <span className="text-white block">Stop</span>
                <span className="block" style={{ color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', fontWeight: 300 }}>Guessing.</span>
                <span className="text-white block">Start</span>
                <span className="block" style={{ color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', fontWeight: 300 }}>Knowing.</span>
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(240,240,240,0.4)', fontWeight: 500, maxWidth: 380 }}>
                Most tools are built for accountants. OpsFlow is built for operators — people who need to move fast, see clearly, and decide confidently.
              </p>
              <Link
                to="/register"
                className="group inline-flex items-center gap-3 font-black text-sm uppercase tracking-[0.4em] text-white hover:text-[#C8FF00] transition-colors"
              >
                Start for Free
                <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </motion.div>

            {/* Right checklist */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: 0.1 }}
            >
              {checkFeatures.map(([label, accent], i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-5 py-5 border-b border-white/[0.05] group hover:border-white/10 transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: accent + '18', border: `1px solid ${accent}35` }}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <span className="text-sm font-bold group-hover:text-white transition-colors" style={{ color: 'rgba(240,240,240,0.5)' }}>{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA BAND
      ═══════════════════════════════════════════ */}
      <section style={{ background: '#C8FF00', position: 'relative', overflow: 'hidden' }}>
        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.9, color: 'black', margin: 0 }}>
              Ready to<br />Take Control?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
              <Link to="/register" className="group relative overflow-hidden bg-black text-white text-xs font-black uppercase tracking-[0.35em] px-8 py-4 rounded-sm inline-flex items-center gap-3">
                <span className="relative z-10 flex items-center gap-3">
                  Create Account
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </span>
                <span className="absolute inset-0 bg-[#111] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
              <Link to="/login" className="border-2 border-black/25 text-black/70 hover:text-black hover:border-black px-8 py-4 rounded-sm font-black text-xs uppercase tracking-[0.35em] transition-all text-center">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.05]" style={{ background: '#080808' }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-20 pb-10">
          <div className="grid md:grid-cols-[2fr_1fr_1fr] gap-16 mb-16">
            {/* Brand */}
            <div className="space-y-5">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[#C8FF00] rounded-[3px] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black text-black">OP</span>
                </div>
                <span className="text-sm font-black uppercase tracking-[0.25em] text-white">OpsFlow</span>
              </Link>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.28)', fontWeight: 500, maxWidth: 280 }}>
                The business operations platform built for modern operators. See everything. Control everything.
              </p>
            </div>

            {/* Product links */}
            <div className="space-y-5">
              <h4 style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', color: '#C8FF00' }}>Product</h4>
              <ul className="space-y-3">
                {['Dashboard', 'Clients', 'Invoices', 'Payroll', 'Reports'].map(l => (
                  <li key={l}>
                    <a href="#" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }} className="hover:text-white transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account links */}
            <div className="space-y-5">
              <h4 style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', color: '#C8FF00' }}>Account</h4>
              <ul className="space-y-3">
                <li><Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }} className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/register" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }} className="hover:text-white transition-colors">Register</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.05]">
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.2)' }}>
              © 2026 OpsFlow. All rights reserved.
            </p>
            <div className="flex gap-8">
              {['Privacy', 'Terms'].map(l => (
                <a key={l} href="#" style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.2)' }} className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        *, *::before, *::after { box-sizing: border-box; }
        :root { --lime: #C8FF00; }
        html { scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default Landing;
