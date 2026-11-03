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
  // How much of that roll actually prints. The print head is narrower than the
  // paper, so laying out at the full roll width cuts off the right-hand edge.
  printMm: number | null;
  thermal: boolean;
}

export const PAPERS: PaperProfile[] = [
  { id: 'auto', label: 'Auto', hint: 'Follows the printer’s paper', widthMm: null, printMm: null, thermal: false },
  { id: 'thermal58', label: 'Small roll (58mm)', hint: 'Small POS printer roll', widthMm: 58, printMm: 48, thermal: true },
  { id: 'thermal80', label: 'Large roll (80mm)', hint: 'Standard POS printer roll', widthMm: 80, printMm: 72, thermal: true },
  { id: 'a5', label: 'A5', hint: 'Half sheet', widthMm: null, printMm: null, thermal: false },
  { id: 'a4', label: 'A4', hint: 'Full sheet', widthMm: null, printMm: null, thermal: false },
];

// Printed widths to choose from. Printers differ, so the default (the common
// print-head width) can be widened for one that reaches further across the roll.
export type RollId = 'thermal58' | 'thermal80';
export const PRINT_WIDTHS: Record<RollId, number[]> = {
  thermal58: [48, 50, 52, 54, 56, 58],
  thermal80: [72, 74, 76, 78, 80],
};
const WIDTH_KEY = (id: RollId) => `morniy:paper:printWidth:${id}`;
const defaultPrintMm = (id: RollId) => PAPERS.find((p) => p.id === id)!.printMm!;

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

export const getPrintWidth = (id: RollId): number => {
  try {
    const v = Number(localStorage.getItem(WIDTH_KEY(id)));
    if (PRINT_WIDTHS[id].includes(v)) return v;
  } catch {
    /* storage blocked */
  }
  return defaultPrintMm(id);
};

export const setPrintWidth = (id: RollId, mm: number) => {
  try {
    localStorage.setItem(WIDTH_KEY(id), String(mm));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id, mm } }));
};

export const profileFor = (id: PaperId): PaperProfile => {
  const profile = PAPERS.find((p) => p.id === id) ?? PAPERS[0]!;
  return profile.thermal ? { ...profile, printMm: getPrintWidth(profile.id as RollId) } : profile;
};

// The chosen paper for a document type, remembered per device.
export const usePaper = (kind: DocKind): [PaperProfile, (id: PaperId) => void] => {
  const [id, setId] = useState<PaperId>(() => getPaperId(kind));
  // Bumped when a printed width changes, so the profile below is re-read.
  const [, setWidthVersion] = useState(0);

  useEffect(() => {
    const sync = () => {
      setId(getPaperId(kind));
      setWidthVersion((v) => v + 1);
    };
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
      ${root} .slip { display: block !important; width: ${paper.printMm}mm; max-width: ${paper.printMm}mm; margin: 0 auto; }
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
      ${root} .slip { display: block !important; width: ${getPrintWidth('thermal80')}mm; max-width: 100%; margin: 0 auto; }
    }
    @media print and (max-width: 65mm) {
      ${root} .slip { width: ${getPrintWidth('thermal58')}mm; }
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

// Prints a ruler across the roll, so the owner can read off how wide their
// printer really prints instead of guessing. Uses a hidden frame rather than a
// pop-up, which browsers often block.
export const printWidthTest = (id: RollId) => {
  const roll = PAPERS.find((p) => p.id === id)!.widthMm!;
  const ticks = Array.from({ length: Math.floor(roll / 2) + 1 }, (_, i) => {
    const mm = i * 2;
    const major = mm % 10 === 0;
    return `<div style="position:absolute;left:${mm}mm;top:0;width:0.3mm;height:${major ? 7 : 3}mm;background:#000"></div>${
      major && mm > 0 ? `<div style="position:absolute;left:${mm - 4}mm;width:8mm;top:7.5mm;text-align:center;font-size:10px;font-weight:bold">${mm}</div>` : ''
    }`;
  }).join('');

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><title>Width test</title><style>
    @page { size: ${roll}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: monospace; }
  </style></head><body>
    <div style="position:relative;width:${roll}mm;height:13mm;overflow:hidden">${ticks}</div>
    <div style="font-size:10px;line-height:1.3;width:44mm;margin:1mm auto 0;">
      Printed width =<br/>biggest number you can read, minus the smallest.<br/>Choose that in Morniy.
    </div>
    <div style="height:10mm"></div>
  </body></html>`);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  }, 150);
};
