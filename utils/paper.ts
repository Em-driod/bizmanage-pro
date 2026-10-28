import { useCallback, useEffect, useState } from 'react';

// Paper the receipt/invoice is laid out for.
//   auto      – no fixed size: the layout follows whatever paper the printer
//               driver is set to. A narrow roll (≤ 100mm) gets the compact slip,
//               anything wider gets the full page. A browser can't ask a printer
//               what is loaded, but it can see the page width while printing.
//   thermal*  – force the compact slip at a given roll width.
//   a5 / a4   – force the full page.
export type PaperId = 'auto' | 'thermal58' | 'thermal80' | 'a5' | 'a4';
export type DocKind = 'receipt' | 'invoice';

export interface PaperProfile {
  id: PaperId;
  label: string;
  hint: string;
  // Roll width in mm for thermal profiles.
  widthMm: number | null;
  thermal: boolean;
}

export const PAPERS: PaperProfile[] = [
  { id: 'auto', label: 'Auto', hint: 'Follows the printer’s paper', widthMm: null, thermal: false },
  { id: 'thermal58', label: '58mm', hint: 'Small thermal roll', widthMm: 58, thermal: true },
  { id: 'thermal80', label: '80mm', hint: 'Standard thermal roll', widthMm: 80, thermal: true },
  { id: 'a5', label: 'A5', hint: 'Half sheet', widthMm: null, thermal: false },
  { id: 'a4', label: 'A4', hint: 'Full sheet', widthMm: null, thermal: false },
];

// Print width (in mm) at or below which "Auto" switches to the compact slip.
export const SLIP_MAX_WIDTH_MM = 100;

const KEY = (kind: DocKind) => `morniy:paper:${kind}`;
const EVENT = 'morniy:paper-changed';

const isPaperId = (v: unknown): v is PaperId => PAPERS.some((p) => p.id === v);

export const getPaperId = (kind: DocKind): PaperId => {
  try {
    const v = localStorage.getItem(KEY(kind));
    if (isPaperId(v)) return v;
  } catch {
    /* storage blocked */
  }
  return 'auto';
};

export const setPaperId = (kind: DocKind, id: PaperId) => {
  try {
    localStorage.setItem(KEY(kind), id);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { kind, id } }));
};

export const profileFor = (id: PaperId): PaperProfile => PAPERS.find((p) => p.id === id) ?? PAPERS[0]!;

// The chosen paper for a document type, remembered per device.
export const usePaper = (kind: DocKind): [PaperProfile, (id: PaperId) => void] => {
  const [id, setId] = useState<PaperId>(() => getPaperId(kind));

  useEffect(() => {
    const sync = () => setId(getPaperId(kind));
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [kind]);

  const choose = useCallback((next: PaperId) => setPaperId(kind, next), [kind]);
  return [profileFor(id), choose];
};

// Print CSS for one printable root. The root holds both layouts:
//   .slip  – compact receipt for rolls   .sheet – the full page layout
// Exactly one is shown, decided here (or by the page width when paper is "auto").
export const printCss = (paper: PaperProfile, rootId: string): string => {
  const root = `#${rootId}`;
  const base = `
    @media screen { ${root} { display: none !important; } }
    @media print {
      html, body { height: auto !important; }
      body * { visibility: hidden; }
      ${root}, ${root} * { visibility: visible; }
      ${root} {
        display: block !important;
        position: absolute; left: 0; top: 0; width: 100%;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      ${root} table { page-break-inside: auto; }
      ${root} tr { page-break-inside: avoid; }
    }`;

  if (paper.thermal) {
    const w = paper.widthMm!;
    return `${base}
    @media print {
      @page { margin: 0; }
      @page { size: ${w}mm auto; }
      ${root} .sheet { display: none !important; }
      ${root} .slip { display: block !important; width: ${w}mm; max-width: ${w}mm; }
    }`;
  }

  if (paper.id === 'auto') {
    return `${base}
    @media print {
      @page { margin: 0; }
      ${root} .slip { display: none !important; }
      ${root} .sheet { display: block !important; }
    }
    @media print and (max-width: ${SLIP_MAX_WIDTH_MM}mm) {
      ${root} .sheet { display: none !important; }
      ${root} .slip { display: block !important; width: 100%; }
    }`;
  }

  return `${base}
    @media print {
      @page { margin: 0; }
      @page { size: ${paper.id === 'a5' ? 'A5' : 'A4'}; }
      ${root} .slip { display: none !important; }
      ${root} .sheet { display: block !important; }
    }`;
};

// Padding for the full-page layout. Page margins are 0 so thermal rolls print
// edge to edge, which means the sheet layout supplies its own.
export const SHEET_PADDING = '12mm 14mm';
