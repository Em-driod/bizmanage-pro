import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, useScroll, useSpring, useMotionValue, useInView } from 'framer-motion';
import { API_BASE_URL } from '../constants';

interface ServiceItem { name: string; description?: string; price?: number; image?: string; inStock?: number; }

interface ProfileData {
  name: string;
  slug: string;
  currency: string;
  profile: {
    tagline?: string;
    description?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    instagram?: string;
    location?: string;
    services: ServiceItem[];
    coverImage?: string;
    logoImage?: string;
    accentColor?: string;
  };
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ─── Scroll progress bar ──────────────────────────────────────────────────── */
const ScrollProgress: React.FC<{ accent: string }> = ({ accent }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0%', background: accent }}
      className="fixed top-0 inset-x-0 h-[2px] z-[60] pointer-events-none"
    />
  );
};

/* ─── Magnetic custom cursor — a coherent dot+ring that reacts to clicks.
       This alone is enough to make a straight CSS/HTML clone feel wrong. ──── */
const MagneticCursor: React.FC<{ accent: string }> = ({ accent }) => {
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const sx = useSpring(mx, { stiffness: 160, damping: 22 });
  const sy = useSpring(my, { stiffness: 160, damping: 22 });
  const [clicked, setClicked] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); setVisible(true); };
    const down = () => setClicked(true);
    const up = () => setClicked(false);
    const leave = () => setVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, [mx, my]);

  return (
    <div className="hidden md:block" style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms' }}>
      <motion.div
        style={{ left: sx, top: sy, translateX: '-50%', translateY: '-50%', background: accent }}
        animate={{ scale: clicked ? 0.3 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed z-[9999] pointer-events-none w-2 h-2 rounded-full"
      />
      <motion.div
        style={{ left: sx, top: sy, translateX: '-50%', translateY: '-50%', borderColor: `${accent}55` }}
        animate={{ scale: clicked ? 2.4 : 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 16 }}
        className="fixed z-[9998] pointer-events-none w-7 h-7 rounded-full border"
      />
    </div>
  );
};

/* ─── 3D mouse-tilt wrapper — genuinely awkward to clone without the JS ──── */
const TiltCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties; [key: string]: any }> = ({ children, className = '', style, ...rest }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 26 });
  const sry = useSpring(ry, { stiffness: 220, damping: 26 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(cx * 10);
    rx.set(-cy * 10);
  }, [rx, ry]);

  const handleLeave = useCallback(() => { rx.set(0); ry.set(0); }, [rx, ry]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d', perspective: 700, ...style }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

/* ─── Character-by-character reveal ───────────────────────────────────────── */
const SplitText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <span ref={ref} className={`inline-block overflow-hidden ${className}`} aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }}
          animate={inView ? { y: '0%', opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
          style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </span>
  );
};

/* ─── Angular divider — a torn/cut edge instead of a generic gradient fade ── */
const AngularDivider: React.FC<{ accent: string }> = ({ accent }) => (
  <div className="relative h-16 sm:h-24 -mt-px" style={{ background: '#080808' }}>
    <svg
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      className="absolute -top-px left-0 w-full h-16 sm:h-24"
    >
      <polygon points="0,0 1200,0 1200,20 0,70" fill="#080808" />
      <polygon points="0,0 1200,0 1200,14 0,58" fill={accent} opacity="0.08" />
    </svg>
  </div>
);

/* ─── Geometric SVG pattern for no-cover hero ─────────────────────────────── */
const GeometricPattern: React.FC<{ accent: string }> = ({ accent }) => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <polygon points="40,4 76,62 4,62" fill="none" stroke={accent} strokeWidth="0.8" />
        <circle cx="40" cy="40" r="18" fill="none" stroke={accent} strokeWidth="0.5" />
        <line x1="0" y1="0" x2="80" y2="80" stroke={accent} strokeWidth="0.3" />
        <line x1="80" y1="0" x2="0" y2="80" stroke={accent} strokeWidth="0.3" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#geo)" />
  </svg>
);

/* ─── Skeleton loading ─────────────────────────────────────────────────────── */
const Skeleton: React.FC = () => (
  <div className="min-h-screen bg-[#080808] overflow-hidden">
    {/* Hero skeleton */}
    <div className="relative h-screen bg-[#0f0f0f] animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent" />
      <div className="absolute bottom-14 left-6 sm:left-12 space-y-5">
        <div className="w-24 h-24 rounded-[1.5rem] bg-white/[0.07] animate-pulse" />
        <div className="space-y-3">
          <div className="h-12 w-72 bg-white/[0.07] rounded-2xl" />
          <div className="h-6 w-48 bg-white/[0.05] rounded-xl" />
        </div>
        <div className="flex gap-3">
          <div className="h-4 w-28 bg-white/[0.04] rounded-full" />
          <div className="h-4 w-20 bg-white/[0.04] rounded-full" />
        </div>
      </div>
    </div>
    {/* Content skeleton */}
    <div className="max-w-4xl mx-auto px-5 sm:px-8 mt-6 space-y-5">
      <div className="h-16 bg-white/[0.04] rounded-2xl animate-pulse" />
      <div className="h-36 bg-white/[0.03] rounded-3xl animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-52 bg-white/[0.03] rounded-2xl animate-pulse" />
        <div className="h-52 bg-white/[0.03] rounded-2xl animate-pulse" />
      </div>
    </div>
  </div>
);

/* ─── Main component ───────────────────────────────────────────────────────── */
const PublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [nearBottom, setNearBottom] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/businesses/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      const distanceFromBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      setNearBottom(distanceFromBottom < 220);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [data]);

  const fmt = (n: number) => {
    if (!data) return String(n);
    return new Intl.NumberFormat('en', { style: 'currency', currency: data.currency || 'NGN', maximumFractionDigits: 0 }).format(n);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /* ── Loading state ── */
  if (loading) return <Skeleton />;

  /* ── Not found state ── */
  if (notFound || !data) return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-8 text-4xl">
        🔍
      </div>
      <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Not found</h1>
      <p className="text-white/40 text-lg max-w-sm">This profile doesn't exist or hasn't been made public yet.</p>
    </div>
  );

  const { profile } = data;
  const accent = profile.accentColor || '#6366f1';
  const waLink = profile.whatsapp
    ? `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${data.name}! I found your profile and I'm interested.`)}`
    : null;

  /* Derived booleans */
  const heroScrolled = scrollY > (heroRef.current?.offsetHeight ?? window.innerHeight) - 80;
  const hasServices = profile.services && profile.services.length > 0;
  const hasImages = hasServices && profile.services.some(s => s.image);

  /* Parallax offset for cover image */
  const parallaxY = scrollY * 0.32;

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-white/20 overflow-x-hidden">

      <ScrollProgress accent={accent} />
      <MagneticCursor accent={accent} />

      {/* Ambient dot grid — extends the premium texture beyond just the hero */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.4] z-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 0%, transparent 100%)',
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          FLOATING STICKY PILL HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 pointer-events-none"
        style={{
          opacity: heroScrolled ? 1 : 0,
          transform: heroScrolled ? 'translateY(0)' : 'translateY(-16px)',
          transition: 'opacity 350ms ease, transform 350ms ease',
        }}
      >
        <div
          className="pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-full border border-white/[0.1] backdrop-blur-2xl shadow-2xl"
          style={{ background: 'rgba(12,12,12,0.85)' }}
        >
          {/* Logo / initial */}
          {profile.logoImage ? (
            <img src={profile.logoImage} alt={data.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${accent},${accent}88)` }}
            >
              {data.name.charAt(0)}
            </div>
          )}
          <span className="font-black text-sm text-white/90 tracking-tight pr-1 max-w-[160px] truncate">{data.name}</span>
          {/* Divider */}
          {waLink && <div className="w-px h-4 bg-white/[0.12]" />}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white transition-all hover:opacity-85 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
            >
              <i className="fab fa-whatsapp text-[11px]" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — full viewport height
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '100svh' }}
      >
        {/* ── Background ── */}
        {profile.coverImage ? (
          <>
            <div
              className="absolute inset-0 scale-110"
              style={{ transform: `translateY(${parallaxY}px) scale(1.15)`, willChange: 'transform' }}
            >
              <img
                src={profile.coverImage}
                alt="cover"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-[#080808]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/50 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#080808]">
            {/* Geometric SVG tiling */}
            <GeometricPattern accent={accent} />
            {/* Glowing orbs */}
            <motion.div
              animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-[-15%] left-[-5%] w-[700px] h-[700px] rounded-full blur-[160px]"
              style={{ background: accent, opacity: 0.18 }}
            />
            <motion.div
              animate={{ x: [0, -30, 40, 0], y: [0, 25, -15, 0] }}
              transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px]"
              style={{ background: accent, opacity: 0.10 }}
            />
            <motion.div
              animate={{ opacity: [0.05, 0.12, 0.05] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-[40%] left-[60%] w-[280px] h-[280px] rounded-full blur-[100px]"
              style={{ background: accent }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-transparent" />
          </div>
        )}

        {/* Film grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
          }}
        />

        {/* ── Hero content ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="relative max-w-5xl mx-auto w-full px-6 sm:px-10 pb-16 pt-28"
        >
          {/* Logo */}
          <motion.div variants={fadeUp} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
            {profile.logoImage ? (
              <img
                src={profile.logoImage}
                alt={data.name}
                className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-[1.4rem] object-cover border-2 border-white/20 shadow-2xl"
                style={{ boxShadow: `0 32px 80px ${accent}33, 0 0 0 1px rgba(255,255,255,0.12)` }}
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-[1.4rem] flex items-center justify-center text-[2.2rem] font-black shadow-2xl border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${accent}dd, ${accent}55)`,
                  boxShadow: `0 24px 72px ${accent}44`,
                }}
              >
                {data.name.charAt(0)}
              </div>
            )}
          </motion.div>

          {/* Business name */}
          <motion.div variants={fadeUp} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            {profile.coverImage ? (
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.94] mb-5 text-white drop-shadow-2xl">
                <SplitText text={data.name} />
              </h1>
            ) : (
              /* Shimmer gradient text when no cover */
              <h1
                className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.94] mb-5"
                style={{
                  backgroundImage: `linear-gradient(120deg, #ffffff 0%, ${accent} 40%, #ffffff 70%, ${accent} 100%)`,
                  backgroundSize: '250% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 5s linear infinite',
                }}
              >
                {data.name}
              </h1>
            )}
          </motion.div>

          {/* Tagline */}
          {profile.tagline && (
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-xl sm:text-2xl font-semibold mb-6 max-w-xl leading-snug"
              style={{ color: `${accent}ee` }}
            >
              {profile.tagline}
            </motion.p>
          )}

          {/* Meta pills */}
          <motion.div variants={fadeUp} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-wrap items-center gap-3 text-sm text-white/45">
            {profile.location && (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm">
                <i className="fas fa-map-marker-alt text-[10px]" style={{ color: accent }} />
                {profile.location}
              </span>
            )}
            {hasServices && (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm">
                <i className="fas fa-layer-group text-[10px]" style={{ color: accent }} />
                {profile.services.length} offering{profile.services.length > 1 ? 's' : ''}
              </span>
            )}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center">
          <div
            className="flex flex-col items-center gap-1.5 opacity-30"
            style={{ animation: 'bounce 2s infinite' }}
          >
            <div className="w-px h-8 bg-white/40 rounded-full" />
            <i className="fas fa-chevron-down text-[9px] text-white/60" />
          </div>
        </div>
      </div>

      <AngularDivider accent={accent} />

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 pb-48 space-y-8 sm:space-y-10 -mt-6 sm:-mt-10">

        {/* ── Primary CTA ── */}
        {(waLink || profile.email) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {waLink && (
              <motion.a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden flex items-center justify-center gap-3 w-full py-5 rounded-2xl text-white font-black text-base"
                style={{
                  background: 'linear-gradient(135deg,#25d366,#128c7e)',
                  boxShadow: '0 12px 40px rgba(37,211,102,0.25)',
                }}
              >
                <i className="fab fa-whatsapp text-2xl" />
                Chat on WhatsApp
                <i className="fas fa-arrow-right text-xs opacity-60 group-hover:translate-x-1 transition-transform" />
                <motion.span
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  style={{ skewX: -12 }}
                />
              </motion.a>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="group flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-sm border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.18] transition-all duration-300 text-white/65 hover:text-white/90"
              >
                <i className="fas fa-envelope text-xs" style={{ color: accent }} />
                {profile.email}
              </a>
            )}
          </motion.div>
        )}

        {/* ── About ── */}
        {profile.description && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-7 sm:p-10"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {/* Accent left bar */}
            <div
              className="absolute top-0 left-0 w-[3px] h-full rounded-full"
              style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}33)` }}
            />
            {/* Background quote marks */}
            <div
              className="absolute top-[-0.5rem] right-4 text-[9rem] font-black leading-none select-none pointer-events-none"
              style={{ color: accent, opacity: 0.05 }}
            >
              "
            </div>
            <p
              className="text-[10px] font-black tracking-[3px] uppercase mb-4"
              style={{ color: accent }}
            >
              About
            </p>
            <p className="text-white/65 leading-[1.85] text-base sm:text-lg pl-3">
              {profile.description}
            </p>
          </motion.div>
        )}

        {/* ── Services / Products ── */}
        {hasServices && (
          <div>
            {/* Section label */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-5"
            >
              <p
                className="text-[10px] font-black tracking-[3px] uppercase"
                style={{ color: accent }}
              >
                What We Offer
              </p>
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] font-black tracking-[2px] uppercase text-white/15">
                {profile.services.length} item{profile.services.length > 1 ? 's' : ''}
              </span>
            </motion.div>

            {/* ── Image cards (masonry-ish 2-col) ── */}
            {hasImages ? (
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {profile.services.map((svc, i) => (
                  <TiltCard
                    key={i}
                    variants={fadeUp}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.03, borderColor: 'rgba(255,255,255,0.2)' }}
                    className="group relative rounded-2xl border border-white/[0.08] overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    {/* Image */}
                    {svc.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={svc.image}
                          alt={svc.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/20 to-transparent" />
                        {/* Stock badge */}
                        {svc.inStock !== undefined && (
                          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md border ${
                            svc.inStock > 0 ? 'text-white bg-black/40 border-white/10' : 'text-white bg-rose-600/80 border-rose-400/20'
                          }`}>
                            {svc.inStock > 0 ? `${svc.inStock} left` : 'Sold out'}
                          </div>
                        )}
                        {/* Price badge */}
                        {svc.price !== undefined && (
                          <div
                            className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-black text-white backdrop-blur-md border border-white/10"
                            style={{ background: `${accent}cc` }}
                          >
                            {fmt(svc.price)}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Text */}
                    <div className="p-5">
                      <p className="font-semibold text-white text-base leading-tight mb-1 tracking-tight">{svc.name}</p>
                      {svc.description && (
                        <p className="text-white/40 text-sm leading-relaxed">{svc.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        {!svc.image && svc.price !== undefined && (
                          <p className="text-base font-black" style={{ color: accent }}>{fmt(svc.price)}</p>
                        )}
                        {!svc.image && svc.inStock !== undefined && (
                          <p className={`text-xs font-bold ${svc.inStock > 0 ? 'text-white/40' : 'text-rose-400'}`}>
                            {svc.inStock > 0 ? `${svc.inStock} left` : 'Sold out'}
                          </p>
                        )}
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </motion.div>
            ) : (
              /* ── Numbered list (no images) ── */
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                variants={staggerContainer}
                className="rounded-2xl border border-white/[0.08] overflow-hidden divide-y divide-white/[0.05]"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                {profile.services.map((svc, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                    className="group relative flex items-center gap-5 px-6 py-5"
                  >
                    {/* Big numbered accent */}
                    <span
                      className="text-4xl sm:text-5xl font-black leading-none select-none w-12 text-center flex-shrink-0"
                      style={{ color: accent, opacity: 0.22 }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm sm:text-base tracking-tight">{svc.name}</p>
                      {svc.description && (
                        <p className="text-white/35 text-xs sm:text-sm mt-0.5 leading-relaxed">{svc.description}</p>
                      )}
                    </div>
                    {/* Price + stock */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {svc.price !== undefined && (
                        <span className="text-sm sm:text-base font-bold" style={{ color: accent }}>
                          {fmt(svc.price)}
                        </span>
                      )}
                      {svc.inStock !== undefined && (
                        <span className={`text-[10px] font-bold ${svc.inStock > 0 ? 'text-white/35' : 'text-rose-400'}`}>
                          {svc.inStock > 0 ? `${svc.inStock} left` : 'Sold out'}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* ── Contact card ── */}
        {(waLink || profile.email || profile.website || profile.instagram) && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl overflow-hidden p-[1px]"
            style={{
              background: `linear-gradient(135deg, ${accent}55, rgba(255,255,255,0.06), ${accent}22)`,
            }}
          >
            <div
              className="relative rounded-[calc(1.5rem-1px)] p-7 sm:p-9 space-y-5"
              style={{ background: '#0e0e0e' }}
            >
              <p
                className="text-[10px] font-black tracking-[3px] uppercase"
                style={{ color: accent }}
              >
                Get in Touch
              </p>

              {/* WhatsApp — large full-width */}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-white font-black text-base transition-all duration-300 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg,#25d366,#128c7e)',
                    boxShadow: '0 8px 32px rgba(37,211,102,0.20)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(37,211,102,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(37,211,102,0.20)'; }}
                >
                  <i className="fab fa-whatsapp text-xl" />
                  Message on WhatsApp
                </a>
              )}

              {/* Secondary links */}
              {(profile.email || profile.website || profile.instagram) && (
                <div className="space-y-2">
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-4 py-3 px-4 rounded-xl border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-300 group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                        style={{ background: `${accent}22`, color: accent }}
                      >
                        <i className="fas fa-envelope" />
                      </div>
                      <span className="text-white/55 text-sm font-medium group-hover:text-white/80 transition-colors">{profile.email}</span>
                      <i className="fas fa-arrow-up-right-from-square text-white/20 text-[10px] ml-auto group-hover:text-white/45 transition-colors" />
                    </a>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-4 py-3 px-4 rounded-xl border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-300 group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                        style={{ background: `${accent}22`, color: accent }}
                      >
                        <i className="fas fa-globe" />
                      </div>
                      <span className="text-white/55 text-sm font-medium group-hover:text-white/80 transition-colors truncate">
                        {profile.website.replace(/^https?:\/\//, '')}
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-white/20 text-[10px] ml-auto flex-shrink-0 group-hover:text-white/45 transition-colors" />
                    </a>
                  )}
                  {profile.instagram && (
                    <a
                      href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-4 py-3 px-4 rounded-xl border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-300 group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                        style={{ background: 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)' }}
                      >
                        <i className="fab fa-instagram text-white" />
                      </div>
                      <span className="text-white/55 text-sm font-medium group-hover:text-white/80 transition-colors">
                        @{profile.instagram.replace('@', '')}
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-white/20 text-[10px] ml-auto group-hover:text-white/45 transition-colors" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Footer ── */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="h-px w-16 bg-white/[0.07]" />
          <a
            href="https://www.morniy.online/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white/50 hover:text-white/80 text-[11px] font-bold px-4 py-2 rounded-xl transition-all"
          >
            <span className="w-3.5 h-3.5 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-white rotate-45 block"></span>
            </span>
            Made with Morniy — Get yours free
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FLOATING SHARE PILL — fixed bottom-center, fades near the footer so
          it never sits on top of it regardless of viewport height
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{
          opacity: nearBottom ? 0 : 1,
          transform: nearBottom ? 'translateY(12px) scale(0.96)' : 'translateY(0) scale(1)',
          transition: 'opacity 300ms ease, transform 300ms ease',
        }}
      >
        <button
          onClick={copyLink}
          disabled={nearBottom}
          className="pointer-events-auto flex items-center gap-2.5 px-6 py-3.5 rounded-full font-black text-sm shadow-2xl border transition-all duration-300 active:scale-95"
          style={{
            background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(15,15,15,0.92)',
            borderColor: copied ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.1)',
            color: copied ? '#34d399' : 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(20px)',
            boxShadow: copied
              ? '0 8px 40px rgba(16,185,129,0.25)'
              : '0 8px 40px rgba(0,0,0,0.5)',
            transform: copied ? 'scale(1.04)' : 'scale(1)',
            transition: 'all 300ms ease',
          }}
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-share-alt'} text-xs`} />
          {copied ? 'Copied!' : 'Share Profile'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GLOBAL STYLES
      ══════════════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 250% center; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0);   opacity: 0.3; }
          50%       { transform: translateY(6px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default PublicProfile;
