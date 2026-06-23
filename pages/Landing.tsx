import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion, useScroll, useTransform, AnimatePresence,
  useMotionValue, useSpring, useInView, useMotionTemplate,
} from 'framer-motion';
import { Link } from 'react-router-dom';

/* ══════════════════════════════════════════════════════════
   SCROLL PROGRESS BAR
══════════════════════════════════════════════════════════ */
const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0%' }}
      className="fixed top-0 inset-x-0 h-[2px] bg-indigo-500 z-[999] pointer-events-none"
    />
  );
};

/* ══════════════════════════════════════════════════════════
   MAGNETIC CURSOR
══════════════════════════════════════════════════════════ */
const MagneticCursor: React.FC = () => {
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const sx = useSpring(mx, { stiffness: 160, damping: 22 });
  const sy = useSpring(my, { stiffness: 160, damping: 22 });
  const [clicked, setClicked] = useState(false);
  const [variant, setVariant] = useState<'default' | 'text' | 'button'>('default');

  useEffect(() => {
    const move = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); };
    const down = () => setClicked(true);
    const up = () => setClicked(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, [mx, my]);

  return (
    <>
      <motion.div
        style={{ left: sx, top: sy, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: clicked ? 0.3 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed z-[9999] pointer-events-none w-2.5 h-2.5 rounded-full bg-indigo-600"
      />
      <motion.div
        style={{ left: sx, top: sy, translateX: '-50%', translateY: '-50%' }}
        animate={{
          scale: clicked ? 2.5 : 1,
          borderColor: clicked ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.35)',
        }}
        transition={{ type: 'spring', stiffness: 80, damping: 16 }}
        className="fixed z-[9998] pointer-events-none w-8 h-8 rounded-full border"
      />
    </>
  );
};

/* ══════════════════════════════════════════════════════════
   SPLIT TEXT (char-by-char reveal)
══════════════════════════════════════════════════════════ */
interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  once?: boolean;
}
const SplitText: React.FC<SplitTextProps> = ({ text, className = '', delay = 0, once = true }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: '-80px' });
  return (
    <span ref={ref} className={`inline-block overflow-hidden ${className}`} aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }}
          animate={inView ? { y: '0%', opacity: 1 } : {}}
          transition={{
            duration: 0.55,
            delay: delay + i * 0.028,
            ease: [0.33, 1, 0.68, 1],
          }}
          className="inline-block"
          style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════
   TILT CARD (mouse-reactive 3D)
══════════════════════════════════════════════════════════ */
const TiltCard: React.FC<{ children: React.ReactNode; className?: string; intensity?: number }> = ({
  children, className = '', intensity = 12,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 28 });
  const sry = useSpring(ry, { stiffness: 200, damping: 28 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(cx * intensity);
    rx.set(-cy * intensity);
  }, [rx, ry, intensity]);

  const handleLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
  }, [rx, ry]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d', perspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════
   GLITCH TEXT
══════════════════════════════════════════════════════════ */
const GlitchText: React.FC<{ text: string; color?: string }> = ({ text, color = '#0F172A' }) => {
  const [g, setG] = useState(false);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPhase(p => (p + 1) % 3);
      setG(true);
      const t1 = setTimeout(() => { setG(false); }, 80);
      const t2 = setTimeout(() => { setG(true); }, 120);
      const t3 = setTimeout(() => { setG(false); }, 200);
      const t4 = setTimeout(() => { setG(true); }, 230);
      const t5 = setTimeout(() => { setG(false); }, 320);
      return () => { [t1,t2,t3,t4,t5].forEach(clearTimeout); };
    }, 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-block select-none" style={{ color }}>
      {g ? (
        <>
          <span style={{ opacity: 0 }}>{text}</span>
          <span className="absolute inset-0" style={{
            color: '#4F46E5', WebkitTextFillColor: '#4F46E5',
            clipPath: 'polygon(0 0%,100% 0%,100% 45%,0 45%)',
            transform: `translateX(${phase === 0 ? -7 : phase === 1 ? 4 : -3}px) skewX(${phase === 0 ? -3 : 2}deg)`,
          }}>{text}</span>
          <span className="absolute inset-0" style={{
            color: '#E11D48', WebkitTextFillColor: '#E11D48',
            clipPath: 'polygon(0 45%,100% 45%,100% 75%,0 75%)',
            transform: `translateX(${phase === 0 ? 8 : phase === 1 ? -5 : 6}px)`,
          }}>{text}</span>
          <span className="absolute inset-0" style={{
            color, WebkitTextFillColor: color,
            clipPath: 'polygon(0 75%,100% 75%,100% 100%,0 100%)',
            transform: `translateX(${phase === 1 ? -4 : 2}px)`,
          }}>{text}</span>
        </>
      ) : <span style={{ color, WebkitTextFillColor: color }}>{text}</span>}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════
   ANIMATED TICKER
══════════════════════════════════════════════════════════ */
const Ticker: React.FC<{ items: string[] }> = ({ items }) => {
  const all = [...items, ...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-slate-200 bg-white">
      <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, white, transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, white, transparent)' }} />
      <div className="py-4">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex whitespace-nowrap"
        >
          {all.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-8 flex-shrink-0">
              <span className="text-[9px] font-black uppercase tracking-[0.6em] text-slate-400">{item}</span>
              <span className="w-1 h-1 rounded-full bg-indigo-300 flex-shrink-0" />
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   COUNTER
══════════════════════════════════════════════════════════ */
const Counter: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = '' }) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let v = 0;
      const step = target / 80;
      const t = setInterval(() => {
        v += step;
        if (v >= target) { setVal(target); clearInterval(t); }
        else setVal(Math.floor(v));
      }, 14);
    }, { threshold: 0.6 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

/* ══════════════════════════════════════════════════════════
   MINI BAR CHART
══════════════════════════════════════════════════════════ */
const MiniChart: React.FC = () => {
  const h = [35, 58, 42, 75, 55, 90, 65, 82, 50, 70, 85, 100];
  return (
    <div className="flex items-end gap-1 h-14">
      {h.map((v, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 1.1 + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ originY: 1, height: `${v}%` }}
          className={`flex-1 rounded-t-sm ${i === h.length - 1 ? 'bg-indigo-500' : i >= 9 ? 'bg-indigo-200' : 'bg-slate-100'}`}
        />
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SPARKLE PARTICLES
══════════════════════════════════════════════════════════ */
const sparks = [
  { x: '12%', y: '22%', size: 6, delay: 0, dur: 3.2 },
  { x: '88%', y: '18%', size: 4, delay: 0.7, dur: 4.1 },
  { x: '75%', y: '65%', size: 7, delay: 1.4, dur: 2.8 },
  { x: '22%', y: '72%', size: 5, delay: 0.3, dur: 3.6 },
  { x: '55%', y: '12%', size: 4, delay: 1.9, dur: 4.5 },
  { x: '38%', y: '85%', size: 6, delay: 0.9, dur: 3.1 },
  { x: '92%', y: '48%', size: 5, delay: 2.1, dur: 3.9 },
  { x: '8%',  y: '50%', size: 4, delay: 1.2, dur: 4.2 },
  { x: '65%', y: '30%', size: 3, delay: 0.5, dur: 2.9 },
  { x: '48%', y: '58%', size: 5, delay: 1.7, dur: 3.4 },
];

const Sparkles: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {sparks.map((s, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ left: s.x, top: s.y }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0.4, 1, 0.4],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: s.dur,
          delay: s.delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* ✦ star shape */}
        <svg width={s.size * 4} height={s.size * 4} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
            fill="rgba(99,102,241,0.7)"
          />
        </svg>
      </motion.div>
    ))}
    {/* Extra tiny dot sparks */}
    {[15, 30, 50, 70, 85].map((x, i) => (
      <motion.div
        key={`dot-${i}`}
        className="absolute w-1 h-1 rounded-full bg-indigo-400"
        style={{ left: `${x}%`, top: `${[35, 60, 20, 75, 45][i]}%` }}
        animate={{ opacity: [0, 0.8, 0], y: [0, -20, -40] }}
        transition={{ duration: 2.5 + i * 0.4, delay: i * 0.6, repeat: Infinity, ease: 'easeOut' }}
      />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════
   FLOATING ORB BACKGROUND
══════════════════════════════════════════════════════════ */
const FloatingOrbs: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{ x: [0, 60, -30, 0], y: [0, -80, 40, 0], scale: [1, 1.15, 0.9, 1] }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-[-10%] right-[5%] w-[600px] h-[600px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
    />
    <motion.div
      animate={{ x: [0, -50, 80, 0], y: [0, 60, -40, 0], scale: [1, 0.88, 1.1, 1] }}
      transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      className="absolute bottom-[-5%] left-[10%] w-[500px] h-[500px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }}
    />
    <motion.div
      animate={{ x: [0, 40, -60, 0], y: [0, -50, 30, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
      className="absolute top-[40%] left-[-5%] w-[400px] h-[400px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)' }}
    />
  </div>
);

/* ══════════════════════════════════════════════════════════
   HERO CYCLER — rotating live stats strip
══════════════════════════════════════════════════════════ */
const cyclerItems = [
  { icon: '⚡', text: 'Setup in under 60 seconds' },
  { icon: '🇳🇬', text: 'Built for Nigerian operators' },
  { icon: '📊', text: '247+ businesses running on Morniy' },
  { icon: '🔒', text: '100% of your data stays yours' },
];
const HeroCycler: React.FC = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % cyclerItems.length), 3000);
    return () => clearInterval(id);
  }, []);
  const item = cyclerItems[idx];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.92, duration: 0.6 }}
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm w-fit"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="text-sm">{item.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{item.text}</span>
        </motion.span>
      </AnimatePresence>
      {/* progress dots */}
      <div className="flex gap-1 ml-1">
        {cyclerItems.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === idx ? 14 : 4, background: i === idx ? '#4F46E5' : '#E2E8F0' }}
            transition={{ duration: 0.3 }}
            className="h-1 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════
   LANDING
══════════════════════════════════════════════════════════ */
const Landing: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 700], [0, -140]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  /* Mouse parallax for hero card */
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const scardX = useSpring(cardX, { stiffness: 80, damping: 18 });
  const scardY = useSpring(cardY, { stiffness: 80, damping: 18 });
  const handleHeroMouseMove = useCallback((e: React.MouseEvent) => {
    const cx = (e.clientX / window.innerWidth - 0.5) * 24;
    const cy = (e.clientY / window.innerHeight - 0.5) * 16;
    cardX.set(cx);
    cardY.set(cy);
  }, [cardX, cardY]);

  const modules = [
    {
      label: 'Cashflow', title: 'Money Never Sleeps', size: 'large',
      desc: 'Real-time ledger across every currency. Every naira tracked — no spreadsheet graveyard.',
      stat: '₦4.8M', statLabel: 'revenue this month', delta: '+18.4%',
      accent: '#4F46E5', accentLight: '#EEF2FF', accentMid: '#6366F1',
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5V18h-2v-1.5c-1.77-.44-3-1.96-3-3.5h2c0 1.1.9 2 2 2s2-.9 2-2c0-1.1-.9-2-2-2-2.21 0-4-1.79-4-4 0-1.54 1.23-3.06 3-3.5V6h2v1.5c1.77.44 3 1.96 3 3.5h-2c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2c2.21 0 4 1.79 4 4 0 1.54-1.23 3.06-3 3.5z',
    },
    {
      label: 'Clients', title: 'Know Your People', size: 'small',
      desc: 'CRM built for operators. Context, history, and next steps — not just a contact list.',
      stat: '247', statLabel: 'active clients', delta: '+12 this week',
      accent: '#059669', accentLight: '#ECFDF5', accentMid: '#10B981',
      icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    },
    {
      label: 'Payroll', title: 'Pay. On Time.', size: 'small',
      desc: 'Automate salary runs for your team. One click. Zero drama. Full paper trail.',
      stat: '60s', statLabel: 'to run payroll', delta: 'down from 3hrs',
      accent: '#E11D48', accentLight: '#FFF1F2', accentMid: '#F43F5E',
      icon: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
    },
    {
      label: 'Reports', title: 'Data Has a Voice', size: 'large',
      desc: 'Revenue intelligence rendered as narrative. Numbers that tell a story and reveal what to do next.',
      stat: '15+', statLabel: 'report templates', delta: 'real-time data',
      accent: '#D97706', accentLight: '#FFFBEB', accentMid: '#F59E0B',
      icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
    },
  ];

  const stats = [
    { val: 60, suffix: 's', label: 'Setup Time' },
    { val: 247, suffix: '+', label: 'Operators' },
    { val: 100, suffix: '%', label: 'Data Yours' },
    { val: 4, suffix: 'x', label: 'Faster Ops' },
  ];

  const testimonials = [
    { quote: "I used to manage finances in three spreadsheets. Morniy collapsed it all into one view. I can see everything from my phone.", name: 'Tunde A.', role: 'Founder, Retail Chain', initials: 'TA', accent: '#4F46E5' },
    { quote: "Payroll used to take half a day every month. Now it's done in 60 seconds. The team gets paid on time, every time.", name: 'Amara K.', role: 'CEO, Logistics Co.', initials: 'AK', accent: '#059669' },
    { quote: "Invoice scanning alone paid for itself. We caught three double-billings in the first week. Money we would have lost forever.", name: 'Chidi O.', role: 'COO, Agency Group', initials: 'CO', accent: '#E11D48' },
  ];

  const tickerItems = ['Cashflow Intelligence', 'Client CRM', 'Invoice Scanning', 'Payroll Automation', 'Live Reports', 'Multi-currency', 'Role Access', 'Built for Africa'];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: '#FAFAFA', color: '#0F172A', overflowX: 'hidden' }}>
      <ScrollProgress />
      <MagneticCursor />

      {/* ══════════ NAVBAR ══════════ */}
      <nav className="fixed top-0 inset-x-0 z-[200]">
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-white/85 backdrop-blur-2xl border-b border-slate-200/50"
        />
        <div className="relative max-w-[1440px] mx-auto px-8 md:px-14 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/ner.png" alt="Morniy" className="h-24 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {[['Platform', '#features'], ['Process', '#how'], ['Results', '#metrics']].map(([label, href]) => (
              <a key={label} href={href} className="relative text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 hover:text-slate-800 transition-colors group">
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-indigo-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 hover:text-slate-800 transition-colors px-3 py-1.5">Login</Link>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="relative group overflow-hidden bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.35em] px-5 py-2.5 rounded-lg inline-flex items-center gap-2">
                <span className="relative z-10">Get Access</span>
                <svg className="w-3 h-3 relative z-10 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                <motion.span
                  className="absolute inset-0 bg-indigo-600"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
              </Link>
            </motion.div>
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <rect width="16" height="1.5" rx="0.75" fill="currentColor" />
                <rect y="5.25" width="10" height="1.5" rx="0.75" fill="currentColor" />
                <rect y="10.5" width="16" height="1.5" rx="0.75" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════ MOBILE MENU ══════════ */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mob"
            initial={{ clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
            animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            exit={{ clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[190] bg-white flex flex-col justify-center px-10 gap-2"
          >
            {[
              { label: 'Platform', href: '#features', ext: true },
              { label: 'Process', href: '#how', ext: true },
              { label: 'Results', href: '#metrics', ext: true },
              { label: 'Login', href: '/login', ext: false },
              { label: 'Get Started', href: '/register', ext: false },
            ].map(({ label, href, ext }, i) => (
              <motion.div
                key={label}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                {ext
                  ? <a href={href} onClick={() => setMenuOpen(false)} className="block text-[2.8rem] font-black uppercase tracking-tighter leading-none py-3 text-slate-200 hover:text-indigo-600 transition-colors border-b border-slate-100">{label}</a>
                  : <Link to={href} onClick={() => setMenuOpen(false)} className="block text-[2.8rem] font-black uppercase tracking-tighter leading-none py-3 text-slate-200 hover:text-indigo-600 transition-colors border-b border-slate-100">{label}</Link>
                }
              </motion.div>
            ))}
            <motion.button
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-6 right-8 w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ HERO ══════════ */}
      <section
        className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16"
        onMouseMove={handleHeroMouseMove}
      >
        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(99,102,241,0.18) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }} />
        <FloatingOrbs />
        <Sparkles />
        <div className="absolute bottom-0 inset-x-0 h-56 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #FAFAFA)' }} />

        <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 md:px-14 w-full">
          <div className="grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_560px] gap-12 xl:gap-20 items-center min-h-[calc(100vh-80px)]">

            {/* ── LEFT ── */}
            <motion.div style={{ opacity: heroOpacity }} className="space-y-6 lg:space-y-8 pt-8 pb-10 lg:py-0">

              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm"
              >
                <motion.span
                  animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"
                />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#64748B' }}>
                  Business Ops · Africa
                </span>
              </motion.div>

              {/* H1 — the catchphrase */}
              <div style={{ fontSize: 'clamp(2.2rem, 4.4vw, 4.2rem)', fontWeight: 900, lineHeight: 0.92, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>

                {/* STOP RUNNING */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="block text-slate-900"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Stop Running
                </motion.div>

                {/* BLIND. — glitch = chaos */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  <GlitchText text="Blind." color="#0F172A" />
                </motion.div>

                {/* spacer line */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ originX: 0 }}
                  className="block my-2 md:my-4 h-px bg-slate-200"
                />

                {/* START RUNNING */}
                <div className="overflow-hidden block" style={{ whiteSpace: 'nowrap' }}>
                  <SplitText text="Start Running" className="text-slate-900" delay={0.7} />
                </div>

                {/* SHARP. — outline = clarity */}
                <div
                  className="block overflow-hidden"
                  style={{ WebkitTextStroke: 'clamp(1.2px, 0.2vw, 2px) #0F172A', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}
                >
                  <SplitText text="Sharp." delay={0.88} />
                </div>
              </div>

              {/* Sub */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.05, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                style={{ maxWidth: 420, fontSize: 'clamp(14px, 4vw, 17px)', lineHeight: 1.72, color: '#64748B', fontWeight: 500 }}
              >
                Finances, clients, payroll, reports — one dashboard. Built for African operators who are done running their business blind.
              </motion.p>

              {/* Cycler */}
              <HeroCycler />

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15, duration: 0.6 }}
                className="flex flex-wrap items-center gap-4"
              >
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link to="/register" className="group relative overflow-hidden inline-flex items-center gap-3 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.35em] px-8 py-4 rounded-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow">
                    <span className="relative z-10 flex items-center gap-3">
                      Run Sharp — Free
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </span>
                    <motion.span className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-indigo-600" initial={{ x: '-100%' }} whileHover={{ x: 0 }} transition={{ duration: 0.3 }} />
                  </Link>
                </motion.div>
                <Link to="/login" className="group inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.35em] text-slate-400 hover:text-slate-700 transition-colors">
                  <span>Sign In</span>
                  <motion.svg animate={{ x: [0, 4, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></motion.svg>
                </Link>
              </motion.div>

              {/* Social proof */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {[['TA','#4F46E5'],['AK','#059669'],['CO','#E11D48'],['EB','#D97706'],['MF','#7C3AED']].map(([init,bg],i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4 + i * 0.08 }}
                      className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{ background: bg }}>{init}</motion.div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>247+ operators running sharp</p>
                  <div className="flex gap-0.5 mt-0.5">
                    {[...Array(5)].map((_,i) => <svg key={i} className="w-3 h-3" viewBox="0 0 24 24" fill="#FBBF24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', marginLeft: 4 }}>5.0 · Nigeria</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* ── RIGHT: Phone mockup ── */}
            <motion.div
              style={{ x: scardX, y: scardY }}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:flex items-center justify-center relative -mt-16"
            >
              {/* Glow behind phone */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(99,102,241,0.14), transparent)' }} />

              <TiltCard intensity={8} className="relative">
                {/* Phone frame */}
                <div className="relative w-[240px] xl:w-[270px] rounded-[40px] shadow-2xl shadow-indigo-200/60" style={{
                  background: '#1A1A2E',
                  padding: '12px',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(99,102,241,0.25), 0 8px 24px rgba(0,0,0,0.3)',
                }}>
                  {/* Dynamic island / notch */}
                  <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-20 flex items-center justify-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700" />
                  </div>

                  {/* Screen */}
                  <div className="rounded-[30px] overflow-hidden bg-white flex flex-col" style={{ aspectRatio: '9/19' }}>

                    {/* Status bar */}
                    <div className="flex items-center justify-between px-5 pt-7 pb-2" style={{ background: '#4F46E5' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>9:41</span>
                      <div className="flex gap-1 items-center">
                        <div className="w-3 h-1.5 bg-white/60 rounded-sm" />
                        <div className="w-3 h-1.5 bg-white/60 rounded-sm" />
                        <div className="w-3.5 h-1.5 bg-white/80 rounded-sm" />
                      </div>
                    </div>

                    {/* App header */}
                    <div className="px-4 pb-4 pt-1" style={{ background: '#4F46E5' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Good morning,</p>
                          <p style={{ fontSize: 13, color: 'white', fontWeight: 900 }}>Tunde ✦</p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                        </div>
                      </div>

                      {/* Revenue card in header */}
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
                        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em' }}>Monthly Revenue</p>
                        <p style={{ fontSize: 22, color: 'white', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>₦4,820,500</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 800, padding: '1px 6px', borderRadius: 20 }}>↑ 18.4%</span>
                          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>vs last month</span>
                        </div>
                      </div>
                    </div>

                    {/* App body — flex-1 fills remaining screen, content auto-scrolls */}
                    <div className="bg-slate-50 overflow-hidden flex-1">
                      <motion.div
                        animate={{ y: [0, -420] }}
                        transition={{ duration: 14, repeat: Infinity, repeatType: 'loop', ease: 'linear' }}
                        className="px-4 py-3 space-y-3"
                      >
                        {/* Mini chart */}
                        <div className="bg-white rounded-2xl p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p style={{ fontSize: 9, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.25em' }}>Cash Flow</p>
                            <span style={{ fontSize: 8, color: '#4F46E5', fontWeight: 800 }}>This month</span>
                          </div>
                          <div className="flex items-end gap-1 h-10">
                            {[35,58,42,75,55,90,65,82,50,100].map((h,i) => (
                              <div key={i} style={{ height: `${h}%` }}
                                className={`flex-1 rounded-t-[2px] ${i === 9 ? 'bg-indigo-500' : i >= 7 ? 'bg-indigo-200' : 'bg-slate-100'}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Stat grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { l: 'Clients', v: '247', c: '#4F46E5', bg: '#EEF2FF' },
                            { l: 'Invoices', v: '38', c: '#059669', bg: '#ECFDF5' },
                            { l: 'Payroll', v: '✓', c: '#E11D48', bg: '#FFF1F2' },
                            { l: 'Reports', v: '15', c: '#D97706', bg: '#FFFBEB' },
                          ].map(({ l, v, c, bg }) => (
                            <div key={l} className="rounded-xl p-2.5 text-center" style={{ background: bg }}>
                              <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: c + 'AA', marginBottom: 2 }}>{l}</p>
                              <p style={{ fontSize: 16, fontWeight: 900, color: c }}>{v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Live activity */}
                        <div className="bg-white rounded-2xl p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p style={{ fontSize: 9, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.25em' }}>Activity</p>
                            <div className="flex items-center gap-1">
                              <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1.4, repeat: Infinity }} className="w-1 h-1 rounded-full bg-emerald-500" />
                              <span style={{ fontSize: 7, color: '#059669', fontWeight: 800 }}>LIVE</span>
                            </div>
                          </div>
                          {[
                            { dot: '#059669', text: 'Payment · ₦240,000' },
                            { dot: '#4F46E5', text: 'Invoice · INV-2047' },
                            { dot: '#D97706', text: 'Client · Eko Ventures' },
                            { dot: '#E11D48', text: 'Expense · ₦32,000' },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />
                              <span style={{ fontSize: 9, fontWeight: 600, color: '#64748B' }}>{item.text}</span>
                            </div>
                          ))}
                        </div>

                        {/* Clients card */}
                        <div className="bg-white rounded-2xl p-3 shadow-sm">
                          <p style={{ fontSize: 9, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 8 }}>Top Clients</p>
                          {[
                            { name: 'Kemi Stores Ltd', val: '₦820k', pct: 82 },
                            { name: 'Eko Ventures', val: '₦540k', pct: 54 },
                            { name: 'Lagos Print Co.', val: '₦310k', pct: 31 },
                          ].map((c) => (
                            <div key={c.name} className="mb-2 last:mb-0">
                              <div className="flex justify-between mb-1">
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#334155' }}>{c.name}</span>
                                <span style={{ fontSize: 9, fontWeight: 900, color: '#4F46E5' }}>{c.val}</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${c.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Payroll card */}
                        <div className="bg-white rounded-2xl p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p style={{ fontSize: 9, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.25em' }}>Payroll</p>
                            <span style={{ fontSize: 8, background: '#ECFDF5', color: '#059669', fontWeight: 800, padding: '1px 6px', borderRadius: 20 }}>Paid ✓</span>
                          </div>
                          {[
                            { name: 'Ade Okafor', role: 'Manager', pay: '₦180k' },
                            { name: 'Sola Bello', role: 'Sales', pay: '₦120k' },
                            { name: 'Emeka Nwoke', role: 'Ops', pay: '₦95k' },
                          ].map((p) => (
                            <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                              <div>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#334155' }}>{p.name}</p>
                                <p style={{ fontSize: 7, color: '#94A3B8', fontWeight: 600 }}>{p.role}</p>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#0F172A' }}>{p.pay}</span>
                            </div>
                          ))}
                        </div>

                        {/* Duplicate top block for seamless loop */}
                        <div className="bg-white rounded-2xl p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p style={{ fontSize: 9, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.25em' }}>Cash Flow</p>
                            <span style={{ fontSize: 8, color: '#4F46E5', fontWeight: 800 }}>This month</span>
                          </div>
                          <div className="flex items-end gap-1 h-10">
                            {[55,72,48,85,60,95,70,88,55,100].map((h,i) => (
                              <div key={i} style={{ height: `${h}%` }}
                                className={`flex-1 rounded-t-[2px] ${i === 9 ? 'bg-indigo-500' : i >= 7 ? 'bg-indigo-200' : 'bg-slate-100'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Home bar */}
                    <div className="flex justify-center py-2 bg-slate-50">
                      <div className="w-20 h-1 bg-slate-300 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Floating badges around phone */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -left-20 top-[15%] bg-white rounded-2xl px-3.5 py-3 flex items-center gap-2.5 shadow-xl shadow-slate-300/30 border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-300/40">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#94A3B8' }}>Paid out</p>
                    <p style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>₦185,000</p>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 9, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                  className="absolute -right-16 top-[25%] bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-lg border border-slate-100"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94A3B8' }}>New Client</p>
                    <p style={{ fontSize: 11, fontWeight: 900, color: '#0F172A' }}>Kemi Stores</p>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                  className="absolute -right-18 bottom-[22%] bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-lg border border-slate-100"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94A3B8' }}>Report</p>
                    <p style={{ fontSize: 11, fontWeight: 900, color: '#0F172A' }}>Q2 Ready</p>
                  </div>
                </motion.div>

                {/* Reflection / bottom glow */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.3), transparent)', filter: 'blur(8px)' }} />
              </TiltCard>
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.55em', textTransform: 'uppercase', color: '#CBD5E1', display: 'block', textAlign: 'center', marginBottom: 6 }}>Explore</span>
            <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, #CBD5E1, transparent)', margin: '0 auto' }} />
          </motion.div>
        </motion.div>
      </section>

      <Ticker items={tickerItems} />

      {/* ══════════ FEATURES BENTO ══════════ */}
      <section id="features" className="py-28 md:py-44 bg-white">
        <div className="max-w-[1440px] mx-auto px-8 md:px-14">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-6"
              >
                <div className="w-8 h-px bg-indigo-500" />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#4F46E5' }}>The Platform</span>
              </motion.div>
              <h2 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4.2rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.88, margin: 0 }}>
                <SplitText text="Four Pillars." className="block text-slate-900" />
                <SplitText text="One Platform." className="block text-slate-200" delay={0.2} />
              </h2>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: '#64748B', maxWidth: 320, fontWeight: 500 }}>
              Everything an operator needs — unified, intelligent, and always live.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <TiltCard
                  intensity={6}
                  className={`group relative rounded-2xl overflow-hidden border border-slate-100 bg-white hover:shadow-2xl hover:shadow-slate-200/60 transition-shadow duration-500 cursor-default ${mod.size === 'large' ? 'p-8 md:p-10' : 'p-7 md:p-9'}`}
                >
                  {/* Hover bg */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.35 }}
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 60% 60% at 30% 40%, ${mod.accent}0A, transparent)` }}
                  />

                  {/* Accent bar top */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0, background: mod.accent }}
                    className="absolute top-0 left-0 right-0 h-0.5"
                  />

                  <div className={`relative flex flex-col ${mod.size === 'large' ? 'min-h-[260px]' : 'min-h-[200px]'}`}>

                    {/* Top row */}
                    <div className="flex items-start justify-between mb-auto">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: mod.accent + '15' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill={mod.accent}><path d={mod.icon} /></svg>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.45em', color: mod.accent + 'AA' }}>{mod.label}</span>
                        </div>
                        <h3 style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.035em', color: '#0F172A', lineHeight: 0.9, margin: 0 }}>
                          {mod.title}
                        </h3>
                      </div>

                      {/* Live stat */}
                      <div className="text-right flex-shrink-0 ml-4">
                        <div style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, color: mod.accent, letterSpacing: '-0.04em', lineHeight: 1 }}>{mod.stat}</div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3em' }}>{mod.statLabel}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold" style={{ color: mod.accent }}>{mod.delta}</span>
                      </div>
                    </div>

                    {/* Desc (slides up on hover) */}
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      whileHover={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ fontSize: 13, lineHeight: 1.65, color: '#64748B', fontWeight: 500, marginTop: 16 }}
                      className="hidden md:block"
                    >
                      {mod.desc}
                    </motion.p>
                    <p style={{ fontSize: 13, lineHeight: 1.65, color: '#64748B', fontWeight: 500, marginTop: 12 }} className="md:hidden">{mod.desc}</p>

                    {/* Arrow */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                      <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.45em', color: '#CBD5E1' }}>Module {String(i + 1).padStart(2, '0')}</span>
                      <motion.div
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="w-8 h-8 rounded-full flex items-center justify-center border"
                        style={{ borderColor: mod.accent + '40', color: mod.accent }}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                      </motion.div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section id="metrics" className="relative overflow-hidden bg-slate-950 py-24 md:py-36">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.06) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />

        <div className="relative max-w-[1440px] mx-auto px-8 md:px-14">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 mb-6"
            >
              <div className="w-7 h-px bg-indigo-500" />
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#6366F1' }}>The Numbers</span>
              <div className="w-7 h-px bg-indigo-500" />
            </motion.div>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.92, color: 'white' }}>
              <SplitText text="Proof in" className="block" delay={0} />
              <SplitText text="the Platform." delay={0.2} />
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/10">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-slate-950 py-12 px-8 text-center group hover:bg-slate-900 transition-colors duration-300"
              >
                <div style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', fontWeight: 900, color: '#6366F1', lineHeight: 1, letterSpacing: '-0.04em' }}>
                  <Counter target={s.val} suffix={s.suffix} />
                </div>
                <p style={{ marginTop: 8, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>

                {/* Animated bottom bar */}
                <div className="mt-4 h-px bg-white/10 relative overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0 }}
                    className="absolute inset-0 bg-indigo-500"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PROBLEM ══════════ */}
      <section className="py-28 md:py-44 bg-white">
        <div className="max-w-[1440px] mx-auto px-8 md:px-14">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-16 md:gap-24 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="w-7 h-px bg-rose-500" />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#E11D48' }}>The Problem</span>
              </motion.div>

              <h2 style={{ fontSize: 'clamp(2.4rem, 5vw, 4.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.88, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                <SplitText text="Sound" className="block text-slate-900" />
                <SplitText text="Familiar?" className="block text-slate-200" delay={0.2} />
              </h2>

              <p style={{ fontSize: 16, lineHeight: 1.72, color: '#64748B', fontWeight: 500, maxWidth: 380 }}>
                Every African operator knows the chaos. Morniy was built by people who lived it.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                'Finances scattered across five different spreadsheets',
                'Clients tracked in WhatsApp and a notebook',
                'Payroll that takes days every month',
                'Reports assembled the night before every board meeting',
                'No single source of truth for any of it',
              ].map((problem, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-rose-200/80 hover:bg-rose-50/30 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-2.5 h-2.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', lineHeight: 1.5 }}>{problem}</span>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.55 }}
                className="relative overflow-hidden flex items-start gap-4 p-5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20"
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.12), transparent)' }} />
                <div className="relative w-5 h-5 rounded-full bg-white/25 border border-white/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <span className="relative" style={{ fontSize: 14, fontWeight: 700, color: 'white', lineHeight: 1.5 }}>Morniy replaces all of it. One dashboard. Every number. Always live.</span>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how" className="py-28 md:py-44 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-[1440px] mx-auto px-8 md:px-14">
          <div className="text-center mb-16 md:mb-24">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 mb-6"
            >
              <div className="w-7 h-px bg-indigo-500" />
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#4F46E5' }}>How It Works</span>
              <div className="w-7 h-px bg-indigo-500" />
            </motion.div>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.92, margin: 0 }}>
              <SplitText text="Running in 60" className="block text-slate-900" />
              <SplitText text="Seconds Flat." className="block text-slate-200" delay={0.25} />
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: '01', title: 'Create Account', desc: 'Sign up in 60 seconds. No credit card. Dashboard ready instantly.', accent: '#4F46E5', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
              { n: '02', title: 'Connect Business', desc: 'Add clients, upload invoices, onboard your team. Morniy structures everything.', accent: '#059669', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
              { n: '03', title: 'See Everything', desc: 'Revenue, clients, payroll — one live view. Decide in seconds, not days.', accent: '#D97706', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-400 group"
              >
                {/* Step connector */}
                {i < 2 && (
                  <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 hidden md:flex w-5 h-5 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm z-10">
                    <svg className="w-2.5 h-2.5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                )}

                {/* Number badge */}
                <div className="absolute top-6 right-6 text-[11px] font-black" style={{ color: step.accent + '35', letterSpacing: '0.3em' }}>{step.n}</div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: step.accent + '12' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={step.accent}><path d={step.icon} /></svg>
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.025em', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: '#64748B', fontWeight: 500 }}>{step.desc}</p>

                {/* Bottom accent */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 + 0.4, duration: 0.5 }}
                  style={{ originX: 0, background: step.accent }}
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="py-28 md:py-44 bg-white">
        <div className="max-w-[1440px] mx-auto px-8 md:px-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14 md:mb-20">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 mb-5"
              >
                <div className="w-7 h-px bg-indigo-500" />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#4F46E5' }}>Operator Stories</span>
              </motion.div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.92, margin: 0 }}>
                <SplitText text="Real Operators." className="block text-slate-900" />
                <SplitText text="Real Results." className="block text-slate-200" delay={0.18} />
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => <svg key={i} className="w-4 h-4" viewBox="0 0 24 24" fill="#FBBF24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
              <span style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', marginLeft: 6 }}>5.0 avg rating</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50, rotate: i === 1 ? 0 : i === 0 ? -1 : 1 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="relative bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-shadow duration-400 flex flex-col gap-6 group cursor-default"
              >
                {/* Quote mark */}
                <div className="absolute top-6 right-7 text-5xl font-black leading-none pointer-events-none select-none" style={{ color: t.accent + '12' }}>"</div>

                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, si) => (
                    <motion.svg
                      key={si}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + si * 0.06, type: 'spring', stiffness: 400, damping: 15 }}
                      className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={t.accent}
                    ><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></motion.svg>
                  ))}
                </div>

                <p style={{ fontSize: 15, lineHeight: 1.72, color: '#374151', fontWeight: 500, flex: 1 }}>
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 shadow-lg" style={{ background: t.accent }}>{t.initials}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>{t.name}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{t.role}</p>
                  </div>
                </div>

                {/* Accent border on hover */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  style={{ originX: 0, background: t.accent }}
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ WHY ══════════ */}
      <section className="py-28 md:py-44 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-[1440px] mx-auto px-8 md:px-14">
          <div className="grid lg:grid-cols-2 gap-16 md:gap-28 items-start">

            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 lg:sticky lg:top-28"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-px bg-indigo-500" />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: '#4F46E5' }}>Why Morniy</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4.8rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.045em', lineHeight: 0.86, margin: 0 }}>
                <span className="block text-slate-900">Stop</span>
                <span className="block" style={{ color: 'rgba(15,23,42,0.12)', fontStyle: 'italic', fontWeight: 300, fontSize: '0.8em' }}>Guessing.</span>
                <span className="block text-slate-900">Start</span>
                <span className="block" style={{ color: 'rgba(15,23,42,0.12)', fontStyle: 'italic', fontWeight: 300, fontSize: '0.8em' }}>Knowing.</span>
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: '#64748B', fontWeight: 500, maxWidth: 360 }}>
                Most tools were built for accountants with time. Morniy is built for operators who don't have any — people who need clarity the moment they open their phone.
              </p>
              <motion.div whileHover={{ x: 6 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                <Link to="/register" className="inline-flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.4em] text-indigo-600 hover:text-indigo-700 transition-colors">
                  Start for Free
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {[
                ['Scan & digitize invoices in seconds', '#4F46E5'],
                ['Multi-currency transaction tracking', '#059669'],
                ['Automated payroll processing', '#E11D48'],
                ['Role-based access for your team', '#D97706'],
                ['Live revenue & expense reports', '#4F46E5'],
                ['Full client relationship management', '#059669'],
                ['Offline-ready for patchy connectivity', '#E11D48'],
                ['Nigeria-first: naira & local compliance', '#D97706'],
              ].map(([label, accent], i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.055, duration: 0.45 }}
                  whileHover={{ x: 6, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                  className="flex items-center gap-4 py-4 border-b border-slate-100 hover:border-slate-200 group cursor-default"
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: accent + '15', border: `1px solid ${accent}30` }}
                  >
                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>
                  </motion.div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', lineHeight: 1.4 }} className="group-hover:text-slate-900 transition-colors duration-150">{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="relative overflow-hidden">
        {/* Dark bg */}
        <div className="absolute inset-0 bg-slate-950" />
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.15) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />

        <div className="relative max-w-[1440px] mx-auto px-8 md:px-14 py-24 md:py-40 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 mb-10"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Join 247+ Operators</span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          </motion.div>

          <h2 style={{ fontSize: 'clamp(2.8rem, 7vw, 7rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', lineHeight: 0.84, color: 'white', margin: '0 0 1.5rem' }}>
            <SplitText text="Ready to See" className="block" />
            <SplitText text="Everything" className="block" delay={0.2} />
            <span className="block" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)', WebkitTextFillColor: 'transparent' }}>
              <SplitText text="Clearly?" delay={0.38} />
            </span>
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', fontWeight: 500, maxWidth: 400, margin: '0 auto 3rem' }}
          >
            60 seconds to set up. Zero spreadsheets. Your entire business in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="group relative overflow-hidden inline-flex items-center gap-3 bg-white text-slate-900 text-[11px] font-black uppercase tracking-[0.38em] px-10 py-4.5 rounded-xl shadow-2xl shadow-black/30">
                <span className="relative z-10 flex items-center gap-3">
                  Create Free Account
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </span>
                <motion.span
                  className="absolute inset-0 bg-indigo-50"
                  initial={{ y: '100%' }}
                  whileHover={{ y: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </motion.div>
            <Link to="/login" className="text-[11px] font-black uppercase tracking-[0.38em] text-white/40 hover:text-white/70 transition-colors px-6 py-4">Sign In</Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-slate-950 border-t border-white/5">
        <div className="max-w-[1440px] mx-auto px-8 md:px-14 pt-20 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 md:gap-12 mb-16">
            <div className="space-y-5">
              <Link to="/" className="flex items-center">
                <img src="/ner.png" alt="Morniy" className="h-24 w-auto object-contain brightness-0 invert" />
              </Link>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(255,255,255,0.35)', fontWeight: 500, maxWidth: 260 }}>
                The business operations platform built for African operators. See everything. Control everything.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>All systems operational</span>
              </div>
            </div>

            {[
              { title: 'Product', links: [['Dashboard', '/dashboard'], ['Clients', '/clients'], ['Invoices', '/invoices'], ['Payroll', '/payroll'], ['Reports', '/reports']] },
              { title: 'Account', links: [['Sign In', '/login'], ['Register Free', '/register']] },
              { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']] },
            ].map(({ title, links }) => (
              <div key={title} className="space-y-5">
                <h4 style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', color: '#4F46E5' }}>{title}</h4>
                <ul className="space-y-3">
                  {links.map(([label, path]) => (
                    <li key={label}><Link to={path} style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }} className="hover:text-white transition-colors duration-150">{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
            <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.2)' }}>
              © 2026 Morniy · Built for African Operators
            </p>
            <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.2)' }}>
              Lagos · Nairobi · Accra
            </p>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}} />
    </div>
  );
};

export default Landing;
