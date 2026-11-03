import React, { useId } from 'react';

interface Props {
  businessName: string;
  // Shown under PAID, e.g. "28 OCT 2026".
  date?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const MAX_NAME = 36;
// Length of the arc the name runs along, in the 100×100 drawing below.
const ARC_LENGTH = 171;
const INK = '#e11d48';

export const stampDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();

// The business's own "PAID" stamp: its name curved around the top, PAID across
// the middle and the date beneath. Drawn as SVG with inline styles, so it looks
// the same on screen, in the shared receipt image and on paper.
const PaidStamp: React.FC<Props> = ({ businessName, date, size = 96, className, style }) => {
  // useId can contain characters that aren't safe in an SVG href.
  const pathId = `stamp-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const raw = businessName.trim().toUpperCase();
  const name = raw.length > MAX_NAME ? `${raw.slice(0, MAX_NAME - 1).trimEnd()}…` : raw;
  // Short names sit at a comfortable size; long ones shrink to fit the arc.
  const fontSize = name ? Math.max(5, Math.min(9, ARC_LENGTH / (name.length * 0.74))) : 0;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Paid — stamped by ${businessName}`}
      className={className}
      style={{ transform: 'rotate(-14deg)', opacity: 0.82, display: 'block', ...style }}
    >
      <circle cx="50" cy="50" r="47.5" fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="50" cy="50" r="44" fill="none" stroke={INK} strokeWidth="0.7" />
      <circle cx="50" cy="50" r="28" fill="none" stroke={INK} strokeWidth="0.5" />
      {/* Runs clockwise from lower-left, over the top, to lower-right. */}
      <defs>
        <path id={pathId} d="M 27.5 76.8 A 35 35 0 1 1 72.5 76.8" />
      </defs>
      {name && (
        <text fill={INK} fontSize={fontSize} fontWeight={800} letterSpacing="0.4" fontFamily="inherit">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {name}
          </textPath>
        </text>
      )}
      <text x="50" y={date ? 53 : 57} textAnchor="middle" fill={INK} fontSize="16" fontWeight={900} letterSpacing="0.8" fontFamily="inherit">
        PAID
      </text>
      {date && (
        <text x="50" y="62" textAnchor="middle" fill={INK} fontSize="5" fontWeight={700} letterSpacing="0.2" fontFamily="inherit">
          {date}
        </text>
      )}
      <text x="50" y="90.5" textAnchor="middle" fill={INK} fontSize="6">
        ★
      </text>
    </svg>
  );
};

export default PaidStamp;
