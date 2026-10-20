import React from 'react';

export const brandInitials = (name: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

interface Props {
  name: string;
  logo?: string | null;
  color?: string;
  // Pixel size of the square mark.
  size?: number;
  // Corner radius in px; defaults to a soft rounded square.
  radius?: number;
  className?: string;
}

// The business's logo, or its initials on its brand colour when there's no
// logo. Uses inline styles (not Tailwind) so it renders identically inside
// image exports (html-to-image), print views and the regular app.
const BrandMark: React.FC<Props> = ({ name, logo, color = '#6366f1', size = 40, radius, className }) => {
  const r = radius ?? Math.round(size * 0.28);
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: r,
    flexShrink: 0,
    display: 'block',
  };
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className={className}
        style={{ ...base, objectFit: 'contain', background: '#ffffff' }}
      />
    );
  }
  return (
    <span
      aria-label={name}
      className={className}
      style={{
        ...base,
        background: color,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: Math.round(size * 0.38),
        letterSpacing: '-0.5px',
        fontFamily: 'inherit',
      }}
    >
      {brandInitials(name)}
    </span>
  );
};

export default BrandMark;
