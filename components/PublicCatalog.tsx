import React, { useMemo, useState } from 'react';

export interface CatalogItem {
  productId?: string;
  name: string;
  description?: string;
  price?: number;
  image?: string;
  inStock?: number;
  category?: string;
  subcategory?: string;
}

interface Props {
  items: CatalogItem[];
  accent: string;
  fmt: (n: number) => string;
  orderingOn: boolean;
  cart: Record<string, number>;
  setQty: (productId: string, qty: number) => void;
  whatsapp?: string;
  businessName: string;
}

const OTHER = 'Other';
const key = (s?: string) => (s || '').trim().toLowerCase();

// A browsable shop: categories → sub-categories → items, with search and
// add-to-order on each item. Items without a category sit under "Other".
const PublicCatalog: React.FC<Props> = ({ items, accent, fmt, orderingOn, cart, setQty, whatsapp, businessName }) => {
  const [cat, setCat] = useState('');
  const [sub, setSub] = useState('');
  const [q, setQ] = useState('');

  // Category tree, merged case-insensitively, in first-seen order.
  const tree = useMemo(() => {
    const map = new Map<string, { name: string; subs: Map<string, string>; count: number }>();
    for (const it of items) {
      const c = it.category?.trim() || OTHER;
      const node = map.get(key(c)) ?? { name: c, subs: new Map(), count: 0 };
      node.count += 1;
      if (it.subcategory?.trim()) node.subs.set(key(it.subcategory), it.subcategory.trim());
      map.set(key(c), node);
    }
    // "Other" always last.
    return [...map.values()].sort((a, b) => (a.name === OTHER ? 1 : b.name === OTHER ? -1 : 0));
  }, [items]);

  const activeNode = tree.find((n) => key(n.name) === key(cat));
  const showChips = tree.length > 1 || (tree[0] && tree[0].subs.size > 0);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((it) => {
      const c = it.category?.trim() || OTHER;
      if (cat && key(c) !== key(cat)) return false;
      if (sub && key(it.subcategory) !== key(sub)) return false;
      if (term && !`${it.name} ${it.description ?? ''} ${it.category ?? ''} ${it.subcategory ?? ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [items, cat, sub, q]);

  // Group what's visible: category → sub-category → items.
  const groups = useMemo(() => {
    const out: { category: string; subs: { name: string; items: CatalogItem[] }[] }[] = [];
    for (const node of tree) {
      const inCat = visible.filter((it) => key(it.category?.trim() || OTHER) === key(node.name));
      if (!inCat.length) continue;
      const bySub = new Map<string, { name: string; items: CatalogItem[] }>();
      for (const it of inCat) {
        const s = it.subcategory?.trim() || '';
        const g = bySub.get(key(s)) ?? { name: s, items: [] };
        g.items.push(it);
        bySub.set(key(s), g);
      }
      // Items with no sub-category first, then sub-categories A–Z.
      const subs = [...bySub.values()].sort((a, b) => (a.name === '' ? -1 : b.name === '' ? 1 : a.name.localeCompare(b.name)));
      out.push({ category: node.name, subs });
    }
    return out;
  }, [tree, visible]);

  const chip = (active: boolean) =>
    `shrink-0 h-9 px-4 rounded-full text-xs font-bold transition-colors border ${active ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`;

  const ItemRow: React.FC<{ it: CatalogItem }> = ({ it }) => {
    const soldOut = it.inStock !== undefined && it.inStock <= 0;
    const qty = it.productId ? cart[it.productId] ?? 0 : 0;
    const canOrder = orderingOn && !!it.productId && it.price !== undefined;
    const waLink = whatsapp
      ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${businessName}! I'm interested in "${it.name}".`)}`
      : null;

    return (
      <div className={`flex gap-4 p-3 sm:p-4 rounded-2xl bg-white border transition-colors ${qty > 0 ? '' : 'border-slate-100 hover:border-slate-200'}`} style={qty > 0 ? { borderColor: accent + '66' } : undefined}>
        {it.image ? (
          <img src={it.image} alt={it.name} loading="lazy" className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 ${soldOut ? 'grayscale opacity-60' : ''}`} />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shrink-0 flex items-center justify-center" style={{ background: accent + '12' }}>
            <i className="fas fa-box text-lg" style={{ color: accent + 'aa' }} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          <p className="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug">{it.name}</p>
          {it.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{it.description}</p>}
          <div className="flex items-end justify-between gap-3 mt-auto pt-2">
            <div>
              {it.price !== undefined && <p className="text-[15px] font-black" style={{ color: accent }}>{fmt(it.price)}</p>}
              {it.inStock !== undefined && (
                <p className={`text-[10px] font-bold ${soldOut ? 'text-rose-500' : it.inStock <= 5 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {soldOut ? 'Sold out' : it.inStock <= 5 ? `Only ${it.inStock} left` : `${it.inStock} in stock`}
                </p>
              )}
            </div>
            {canOrder ? (
              soldOut ? null : qty > 0 ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setQty(it.productId!, qty - 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center"
                    style={{ borderColor: accent + '55', color: accent }}
                    aria-label={`One less ${it.name}`}
                  >
                    <i className={`fas ${qty === 1 ? 'fa-trash' : 'fa-minus'} text-[10px]`} />
                  </button>
                  <span className="w-6 text-center text-sm font-black text-slate-900">{qty}</span>
                  <button
                    onClick={() => setQty(it.productId!, qty + 1)}
                    disabled={it.inStock !== undefined && qty >= it.inStock}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30"
                    style={{ background: accent }}
                    aria-label={`One more ${it.name}`}
                  >
                    <i className="fas fa-plus text-[10px]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setQty(it.productId!, 1)}
                  className="shrink-0 h-9 px-4 rounded-full text-white text-xs font-black flex items-center gap-1.5 active:scale-95 transition-transform"
                  style={{ background: accent }}
                >
                  <i className="fas fa-plus text-[9px]" /> Add
                </button>
              )
            ) : (
              waLink && (
                <a href={waLink} target="_blank" rel="noreferrer" className="shrink-0 h-9 px-3.5 rounded-full border text-xs font-bold flex items-center gap-1.5" style={{ borderColor: accent + '40', color: accent }}>
                  <i className="fab fa-whatsapp" /> Ask
                </a>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Browse bar — sticks under the page's navbar while scrolling the catalog */}
      <div className="sticky top-20 z-[150] -mx-6 md:-mx-10 px-6 md:px-10 py-3 bg-white/90 backdrop-blur-xl border-b border-slate-100 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${items.length} item${items.length === 1 ? '' : 's'}…`}
              className="w-full h-10 pl-9 pr-9 rounded-full bg-slate-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white"
              style={{ ['--tw-ring-color' as string]: accent + '40' }}
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear search">
                <i className="fas fa-xmark text-xs" />
              </button>
            )}
          </div>
        </div>
        {showChips && (
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => { setCat(''); setSub(''); }} className={chip(!cat)} style={!cat ? { background: accent } : undefined}>
              All
            </button>
            {tree.map((n) => {
              const active = key(cat) === key(n.name);
              return (
                <button key={n.name} onClick={() => { setCat(n.name); setSub(''); }} className={chip(active)} style={active ? { background: accent } : undefined}>
                  {n.name} <span className={active ? 'text-white/60' : 'text-slate-300'}>{n.count}</span>
                </button>
              );
            })}
          </div>
        )}
        {activeNode && activeNode.subs.size > 0 && (
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {['', ...activeNode.subs.values()].map((s) => {
              const active = key(sub) === key(s);
              return (
                <button
                  key={s || 'all'}
                  onClick={() => setSub(s)}
                  className="shrink-0 h-8 px-3 rounded-lg text-[11px] font-bold transition-colors"
                  style={active ? { background: accent + '1f', color: accent } : { color: '#64748B' }}
                >
                  {s || `All ${activeNode.name}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="pt-8 space-y-12">
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-slate-600">Nothing matches “{q}”</p>
            <button onClick={() => { setQ(''); setCat(''); setSub(''); }} className="mt-2 text-xs font-bold" style={{ color: accent }}>
              Show everything
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.category}>
              {(!cat || tree.length > 1) && (
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-4 flex items-center gap-3">
                  {g.category}
                  <span className="h-px flex-1 bg-slate-100" />
                </h3>
              )}
              <div className="space-y-6">
                {g.subs.map((s) => (
                  <div key={s.name || '__none'}>
                    {s.name && <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: accent }}>{s.name}</p>}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {s.items.map((it, i) => <ItemRow key={it.productId || `${it.name}-${i}`} it={it} />)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default PublicCatalog;
