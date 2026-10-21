// Small helpers for using a business's brand colour on documents.

const HEX = /^#([0-9a-f]{6})$/i;

export const isHex = (c?: string | null): c is string => !!c && HEX.test(c);

const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

// Mix toward black (amount 0–1).
export const darken = (hex: string, amount: number) => {
  const [r, g, b] = toRgb(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
};

// Mix toward white (amount 0–1).
export const lighten = (hex: string, amount: number) => {
  const [r, g, b] = toRgb(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
};

const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

// The brand colour, lightened just enough to read on a dark background
// (a navy or black brand colour would otherwise vanish on the dark receipt).
export const readableOnDark = (hex: string) => {
  let c = hex;
  for (let i = 0; i < 8 && luminance(c) < 0.25; i++) c = lighten(c, 0.25);
  return c;
};

// Hex + alpha (0–1) as an 8-digit hex colour.
export const alpha = (hex: string, a: number) => hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

export const DEFAULT_BRAND = '#6366f1';
export const brandOr = (c?: string | null, fallback = DEFAULT_BRAND) => (isHex(c) ? c : fallback);
