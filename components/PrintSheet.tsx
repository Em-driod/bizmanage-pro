import React from 'react';
import { PaperProfile, printCss, SHEET_PADDING } from '../utils/paper';

interface Props {
  id: string;
  paper: PaperProfile;
  // Compact layout for thermal rolls.
  slip: React.ReactNode;
  // Full-page layout (A4 / A5).
  sheet: React.ReactNode;
}

// Holds both layouts of a document; the CSS picks which one prints.
const PrintSheet: React.FC<Props> = ({ id, paper, slip, sheet }) => (
  <div id={id} className="bg-white text-slate-900 font-sans" style={{ display: 'none' }}>
    <style dangerouslySetInnerHTML={{ __html: printCss(paper, id) }} />
    <div className="slip" style={{ display: 'none' }}>{slip}</div>
    <div className="sheet" style={{ padding: SHEET_PADDING, boxSizing: 'border-box' }}>{sheet}</div>
  </div>
);

export default PrintSheet;
