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

/* ══════════════════════════════════════════════════════════
   Shared building blocks — ported straight from Landing.tsx so
   this page reads as the same product, not a different template.
══════════════════════════════════════════════════════════ */

const ScrollProgress: React.FC<{ accent: string }> = ({ accent }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0%', background: accent }}
      className="fixed top-0 inset-x-0 h-[2px] z-[999] pointer-events-none"
    />
  );
};

const MagneticCursor: React.FC<{ accent: string }> = ({ accent }) => {
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const sx = useSpring(mx, { stiffness: 160, damping: 22 });
  const sy = useSpring(my, { stiffness: 160, damping: 22 });
  const [clicked, setClicked] = useState(false);

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
    <div className="hidden lg:block">
      <motion.div
        style={{ left: sx, top: sy, translateX: '-50%', translateY: '-50%', background: accent }}
        animate={{ scale: clicked ? 0.3 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed z-[9999] pointer-events-none w-2.5 h-2.5 rounded-full"
      />
      <motion.div
        style={{ left: sx, top: sy, translateX: '-50%', translateY: '-50%', borderColor: `${accent}59` }}
        animate={{ scale: clicked ? 2.5 : 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 16 }}
        className="fixed z-[9998] pointer-events-none w-8 h-8 rounded-full border"
      />
    </div>
  );
};

const SplitText: React.FC<{ text: string; className?: string; delay?: number }> = ({ text, className = '', delay = 0 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <span ref={ref} className={`inline-block overflow-hidden ${className}`} aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }}
          animate={inView ? { y: '0%', opacity: 1 } : {}}
          transition={{ duration: 0.55, delay: delay + i * 0.026, ease: [0.33, 1, 0.68, 1] }}
          className="inline-block"
          style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </span>
  );
};

const TiltCard: React.FC<{ children: React.ReactNode; className?: string; intensity?: number; [key: string]: any }> = ({ children, className = '', intensity = 10, ...rest }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 28 });
  const sry = useSpring(ry, { stiffness: 200, damping: 28 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(cx * intensity);
    rx.set(-cy * intensity);
  }, [rx, ry, intensity]);

  const handleLeave = useCallback(() => { rx.set(0); ry.set(0); }, [rx, ry]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d', perspective: 800 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

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

const Counter: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = '' }) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let v = 0;
      const step = Math.max(target, 1) / 60;
      const t = setInterval(() => {
        v += step;
        if (v >= target) { setVal(target); clearInterval(t); }
        else setVal(Math.floor(v));
      }, 16);
    }, { threshold: 0.6 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

const EyebrowLabel: React.FC<{ text: string; accent: string; center?: boolean }> = ({ text, accent, center }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className={`flex items-center gap-3 mb-6 ${center ? 'justify-center' : ''}`}
  >
    <div className="w-7 h-px" style={{ background: accent }} />
    <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', color: accent }}>{text}</span>
    {center && <div className="w-7 h-px" style={{ background: accent }} />}
  </motion.div>
);

/* ══════════════════════════════════════════════════════════
   Skeleton
══════════════════════════════════════════════════════════ */
const Skeleton: React.FC = () => (
  <div className="min-h-screen bg-[#FAFAFA]">
    <div className="h-24 border-b border-slate-100" />
    <div className="max-w-[1000px] mx-auto px-6 py-24 space-y-6">
      <div className="h-6 w-40 bg-slate-100 rounded-full animate-pulse" />
      <div className="h-20 w-full max-w-lg bg-slate-100 rounded-2xl animate-pulse" />
      <div className="h-6 w-72 bg-slate-100 rounded-xl animate-pulse" />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   Main
══════════════════════════════════════════════════════════ */
const PublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/businesses/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const fmt = (n: number) => {
    if (!data) return String(n);
    return new Intl.NumberFormat('en', { style: 'currency', currency: data.currency || 'NGN', maximumFractionDigits: 0 }).format(n);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return <Skeleton />;

  if (notFound || !data) return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-8 text-4xl">🔍</div>
      <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight uppercase">Not Found</h1>
      <p className="text-slate-400 text-lg max-w-sm">This profile doesn't exist or hasn't been made public yet.</p>
    </div>
  );

  const { profile } = data;
  const accent = profile.accentColor || '#4F46E5';
  const waLink = profile.whatsapp
    ? `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${data.name}! I found your page and I'm interested.`)}`
    : null;

  const hasServices = profile.services && profile.services.length > 0;
  const totalStock = profile.services.reduce((s, x) => s + (x.inStock && x.inStock > 0 ? x.inStock : 0), 0);
  const trackedCount = profile.services.filter(s => s.inStock !== undefined).length;

  const tickerItems = hasServices
    ? profile.services.slice(0, 8).map(s => s.name)
    : [data.name, profile.tagline || 'Welcome', profile.location || 'Get in touch'];

  const contactLinks = [
    profile.email ? [`Email — ${profile.email}`, `mailto:${profile.email}`, true] : null,
    profile.website ? [`Website — ${profile.website.replace(/^https?:\/\//, '')}`, profile.website.startsWith('http') ? profile.website : `https://${profile.website}`, true] : null,
    profile.instagram ? [`Instagram — @${profile.instagram.replace('@', '')}`, `https://instagram.com/${profile.instagram.replace('@', '')}`, true] : null,
    profile.location ? [`Located in ${profile.location}`, null, false] : null,
  ].filter(Boolean) as [string, string | null, boolean][];

  return (
    <div className="bg-[#FAFAFA] text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <ScrollProgress accent={accent} />
      <MagneticCursor accent={accent} />

      {/* ══════════ NAVBAR ══════════ */}
      <nav className="fixed top-0 inset-x-0 z-[200]">
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-white/85 backdrop-blur-2xl border-b border-slate-200/50"
        />
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3 min-w-0">
            {profile.logoImage ? (
              <img src={profile.logoImage} alt={data.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: accent }}>
                {data.name.charAt(0)}
              </div>
            )}
            <span className="font-black text-sm text-slate-900 tracking-tight truncate">{data.name}</span>
          </a>

          <div className="flex items-center gap-3">
            {waLink && (
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="relative group overflow-hidden hidden sm:inline-flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-lg"
                style={{ background: '#128C7E' }}
              >
                <span className="relative z-10">Chat on WhatsApp</span>
                <motion.span className="absolute inset-0 bg-[#25D366]" initial={{ x: '-100%' }} whileHover={{ x: 0 }} transition={{ duration: 0.3 }} />
              </motion.a>
            )}
            <button onClick={copyLink} className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors" title="Copy link">
              <i className={`fas ${copied ? 'fa-check' : 'fa-share-alt'} text-xs`} />
            </button>
            <button onClick={() => setMenuOpen(v => !v)} className="sm:hidden w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500">
              <i className="fas fa-bars text-xs" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="sm:hidden relative bg-white border-b border-slate-100 px-6 py-4">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-white text-xs font-black uppercase tracking-[0.3em] px-5 py-3 rounded-lg" style={{ background: '#25D366' }}>
                Chat on WhatsApp
              </a>
            )}
          </div>
        )}
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section id="top" ref={heroRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(${accent}2e 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }} />
        <motion.div
          animate={{ x: [0, 50, -20, 0], y: [0, -60, 30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-10%] right-[5%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}1f 0%, transparent 70%)` }}
        />
        <motion.div
          animate={{ x: [0, -40, 60, 0], y: [0, 50, -30, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-[-5%] left-[10%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}14 0%, transparent 70%)` }}
        />
        <div className="absolute bottom-0 inset-x-0 h-56 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #FAFAFA)' }} />

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-10 w-full">
          <div className="grid lg:grid-cols-[1fr_420px] gap-12 xl:gap-20 items-center min-h-[calc(100vh-80px)]">

            {/* LEFT */}
            <div className="space-y-6 lg:space-y-7 pt-8 pb-10 lg:py-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm"
              >
                <motion.span animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#64748B' }}>
                  {profile.location || 'Official Page'}
                </span>
              </motion.div>

              <h1 style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.6rem)', fontWeight: 900, lineHeight: 0.94, letterSpacing: '-0.03em', textTransform: 'uppercase' }} className="text-slate-900">
                <SplitText text={data.name} delay={0.35} />
              </h1>

              {profile.tagline && (
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.6 }}
                  style={{ maxWidth: 440, fontSize: 'clamp(14px, 3vw, 17px)', lineHeight: 1.7, color: '#64748B', fontWeight: 500 }}
                >
                  {profile.tagline}
                </motion.p>
              )}

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.6 }} className="flex flex-wrap items-center gap-4">
                {waLink && (
                  <motion.a
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden inline-flex items-center gap-3 text-white text-[11px] font-black uppercase tracking-[0.3em] px-8 py-4 rounded-xl shadow-xl"
                    style={{ background: '#128C7E', boxShadow: '0 20px 50px -12px rgba(18,140,126,0.5)' }}
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      <i className="fab fa-whatsapp text-base" />
                      Chat Now
                    </span>
                    <motion.span className="absolute inset-0 bg-[#25D366]" initial={{ x: '-100%' }} whileHover={{ x: 0 }} transition={{ duration: 0.3 }} />
                  </motion.a>
                )}
                {hasServices && (
                  <a href="#offer" className="group inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-slate-800 transition-colors">
                    <span>See What's Available</span>
                    <motion.svg animate={{ x: [0, 4, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></motion.svg>
                  </a>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-shield-halved text-sm" style={{ color: accent }} />
                  <i className="fas fa-bolt text-sm" style={{ color: accent }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#0F172A' }}>Verified Business Page</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', marginTop: 2 }}>Powered by Morniy</p>
                </div>
              </motion.div>
            </div>

            {/* RIGHT — tilted photo card with floating badges */}
            {(profile.coverImage || profile.logoImage) && (
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:flex items-center justify-center relative"
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 80% at 50% 50%, ${accent}24, transparent)` }} />
                <TiltCard intensity={8} className="relative">
                  <div className="relative w-[300px] rounded-[2rem] overflow-hidden shadow-2xl border border-white" style={{ boxShadow: `0 32px 80px ${accent}33, 0 8px 24px rgba(0,0,0,0.15)` }}>
                    <img
                      src={profile.coverImage || profile.logoImage}
                      alt={data.name}
                      className="w-full object-cover"
                      style={{ aspectRatio: '4/5' }}
                    />
                  </div>

                  {hasServices && (
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute -left-16 top-[15%] bg-white rounded-2xl px-3.5 py-3 flex items-center gap-2.5 shadow-xl border border-slate-100"
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent }}>
                        <i className="fas fa-layer-group text-white text-xs" />
                      </div>
                      <div>
                        <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94A3B8' }}>Catalog</p>
                        <p style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>{profile.services.length} Item{profile.services.length !== 1 ? 's' : ''}</p>
                      </div>
                    </motion.div>
                  )}

                  {trackedCount > 0 && (
                    <motion.div
                      animate={{ y: [0, 9, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                      className="absolute -right-14 bottom-[18%] bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-lg border border-slate-100"
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94A3B8' }}>In Stock</p>
                        <p style={{ fontSize: 11, fontWeight: 900, color: '#0F172A' }}>{totalStock} units</p>
                      </div>
                    </motion.div>
                  )}
                </TiltCard>
              </motion.div>
            )}
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.55em', textTransform: 'uppercase', color: '#CBD5E1', display: 'block', textAlign: 'center', marginBottom: 6 }}>Explore</span>
            <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, #CBD5E1, transparent)', margin: '0 auto' }} />
          </motion.div>
        </motion.div>
      </section>

      <Ticker items={tickerItems} />

      {/* ══════════ OFFERINGS — BENTO GRID ══════════ */}
      {hasServices && (
        <section id="offer" className="py-24 md:py-36 bg-white">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14 md:mb-16">
              <div>
                <EyebrowLabel text="The Catalog" accent={accent} />
                <h2 style={{ fontSize: 'clamp(2rem, 4.2vw, 3.8rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.9, margin: 0 }}>
                  <SplitText text="What We" className="block text-slate-900" />
                  <SplitText text="Offer." className="block text-slate-200" delay={0.2} />
                </h2>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#64748B', maxWidth: 300, fontWeight: 500 }}>
                {profile.services.length} item{profile.services.length !== 1 ? 's' : ''} available — message us to order.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.services.map((svc, i) => {
                const soldOut = svc.inStock !== undefined && svc.inStock <= 0;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: (i % 4) * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <TiltCard intensity={6} className="group relative rounded-2xl overflow-hidden border border-slate-100 bg-white hover:shadow-2xl hover:shadow-slate-200/60 transition-shadow duration-500 cursor-default">
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse 60% 60% at 30% 40%, ${accent}0d, transparent)` }}
                      />
                      <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 + 0.2, duration: 0.6 }}
                        style={{ originX: 0, background: soldOut ? '#E11D48' : accent }}
                        className="absolute top-0 left-0 right-0 h-0.5"
                      />

                      {svc.image ? (
                        <div className="relative h-44 overflow-hidden">
                          <img src={svc.image} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        </div>
                      ) : null}

                      <div className={`relative flex flex-col p-7 md:p-8 ${svc.image ? '' : 'min-h-[200px]'}`}>
                        <div className="flex items-start justify-between mb-auto gap-4">
                          <div className="min-w-0">
                            {!svc.image && (
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: accent + '15' }}>
                                <i className="fas fa-box text-sm" style={{ color: accent }} />
                              </div>
                            )}
                            <h3 style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#0F172A', lineHeight: 1.05 }}>
                              {svc.name}
                            </h3>
                          </div>
                          {svc.price !== undefined && (
                            <div className="text-right flex-shrink-0">
                              <div style={{ fontSize: 'clamp(1.1rem, 2.4vw, 1.6rem)', fontWeight: 900, color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt(svc.price)}</div>
                              {svc.inStock !== undefined && (
                                <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wide" style={{ color: soldOut ? '#E11D48' : '#059669' }}>
                                  {soldOut ? 'Sold out' : `${svc.inStock} left`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {svc.description && (
                          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748B', fontWeight: 500, marginTop: 14 }}>
                            {svc.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: '#CBD5E1' }}>Item {String(i + 1).padStart(2, '0')}</span>
                          {waLink && (
                            <motion.a
                              href={`https://wa.me/${profile.whatsapp!.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${data.name}! I'm interested in "${svc.name}".`)}`}
                              target="_blank"
                              rel="noreferrer"
                              whileHover={{ x: 4 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className="w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0"
                              style={{ borderColor: accent + '40', color: accent }}
                            >
                              <i className="fab fa-whatsapp text-xs" />
                            </motion.a>
                          )}
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ STATS ══════════ */}
      <section className="relative overflow-hidden bg-slate-950 py-20 md:py-28">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(${accent}0f 1px,transparent 1px),linear-gradient(90deg,${accent}0f 1px,transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}33 0%, transparent 70%)` }} />

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-10">
          <EyebrowLabel text="At a Glance" accent={accent} center />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/10 mt-8">
            {[
              { val: profile.services.length, suffix: '', label: 'Offerings' },
              { val: 100, suffix: '%', label: 'Direct to Owner' },
              { val: totalStock || profile.services.length, suffix: '+', label: trackedCount > 0 ? 'Units Ready' : 'Ready Now' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-slate-950 py-10 px-6 text-center hover:bg-slate-900 transition-colors duration-300"
              >
                <div style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: '-0.04em' }}>
                  <Counter target={s.val} suffix={s.suffix} />
                </div>
                <p style={{ marginTop: 8, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ ABOUT + CONTACT ══════════ */}
      <section className="py-24 md:py-36 bg-slate-50/70 border-b border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-16 md:gap-20 items-start">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 lg:sticky lg:top-28"
            >
              <EyebrowLabel text="About" accent={accent} />
              <h2 style={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.6rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.9 }} className="text-slate-900">
                {profile.description ? 'The Story.' : 'Get In Touch.'}
              </h2>
              {profile.description && (
                <p style={{ fontSize: 15, lineHeight: 1.8, color: '#64748B', fontWeight: 500, maxWidth: 400 }}>
                  {profile.description}
                </p>
              )}
              {waLink && (
                <motion.a whileHover={{ x: 6 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.4em]" style={{ color: accent }}>
                  Message on WhatsApp
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </motion.a>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {contactLinks.map(([label, href], i) => {
                const content = (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.45 }}
                    whileHover={href ? { x: 6 } : undefined}
                    className="flex items-center gap-4 py-4 border-b border-slate-200 group cursor-default"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: accent + '15', border: `1px solid ${accent}30` }}>
                      <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', lineHeight: 1.4 }} className="group-hover:text-slate-900 transition-colors">{label}</span>
                  </motion.div>
                );
                return href ? <a key={label} href={href} target="_blank" rel="noreferrer">{content}</a> : content;
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: `linear-gradient(${accent}26 1px,transparent 1px),linear-gradient(90deg,${accent}26 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}4d 0%, transparent 65%)` }} />

        <div className="relative max-w-[1200px] mx-auto px-6 md:px-10 py-24 md:py-36 text-center">
          <EyebrowLabel text="Ready When You Are" accent={accent} center />
          <h2 style={{ fontSize: 'clamp(2.4rem, 6vw, 5.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.88, color: 'white', margin: '0 0 1.5rem' }}>
            <SplitText text="Let's Talk" className="block" />
            <span className="block" style={{ WebkitTextStroke: `2px ${accent}80`, WebkitTextFillColor: 'transparent' }}>
              <SplitText text="Business." delay={0.3} />
            </span>
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', fontWeight: 500, maxWidth: 400, margin: '0 auto 2.5rem' }}
          >
            {profile.tagline || `Reach out to ${data.name} directly — no middleman, no waiting.`}
          </motion.p>
          {waLink && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden inline-flex items-center gap-3 bg-white text-slate-900 text-[11px] font-black uppercase tracking-[0.35em] px-9 py-4 rounded-xl shadow-2xl"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <i className="fab fa-whatsapp" />
                  Chat on WhatsApp
                </span>
                <motion.span className="absolute inset-0" style={{ background: `${accent}22` }} initial={{ y: '100%' }} whileHover={{ y: 0 }} transition={{ duration: 0.3 }} />
              </motion.a>
            </motion.div>
          )}
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-slate-950 border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 pt-16 pb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 mb-8 border-b border-white/5">
            <div className="flex items-center gap-3">
              {profile.logoImage ? (
                <img src={profile.logoImage} alt={data.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ background: accent }}>
                  {data.name.charAt(0)}
                </div>
              )}
              <span className="font-black text-sm text-white">{data.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>Page is live and accepting messages</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.2)' }}>
              © {new Date().getFullYear()} {data.name}
            </p>
            <a
              href="https://www.morniy.online/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-white/70 transition-colors"
            >
              Made with Morniy — Get Yours Free
            </a>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}} />
    </div>
  );
};

export default PublicProfile;
