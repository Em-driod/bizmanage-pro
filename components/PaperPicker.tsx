import React, { useState } from 'react';
import { DocKind, PAPERS, PRINT_WIDTHS, RollId, printWidthTest, setPrintWidth, usePaper } from '../utils/paper';

interface Props {
  kind: DocKind;
  className?: string;
}

// Segmented switch for the paper a document prints on. Remembered per device.
const PaperPicker: React.FC<Props> = ({ kind, className = '' }) => {
  const [paper, choose] = usePaper(kind);
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className={className}>
      <div role="radiogroup" aria-label="Paper size" className="inline-flex flex-wrap rounded-xl bg-slate-100 p-0.5 gap-0.5">
        {PAPERS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={paper.id === p.id}
            title={p.hint}
            onClick={() => choose(p.id)}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors ${
              paper.id === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">{paper.hint}</p>
      {paper.thermal && (
        <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label htmlFor={`print-width-${kind}`} className="text-xs font-bold text-slate-700">
              Printed width
            </label>
            <select
              id={`print-width-${kind}`}
              value={paper.printMm ?? ''}
              onChange={(e) => setPrintWidth(paper.id as RollId, Number(e.target.value))}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              {PRINT_WIDTHS[paper.id as RollId].map((mm) => (
                <option key={mm} value={mm}>
                  {mm}mm
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            The printer can’t print right to the edge of the roll, so this is narrower than the paper. Words cut off on the right? Choose a smaller number.
            Too much empty space? Choose a bigger one.
          </p>
          <button
            type="button"
            onClick={() => printWidthTest(paper.id as RollId)}
            className="mt-2 text-[11px] font-black text-indigo-600 hover:underline"
          >
            <i className="fas fa-ruler-horizontal mr-1" />
            Print a test strip to measure it
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        aria-expanded={showHelp}
        className="mt-2 text-[11px] font-bold text-slate-500 hover:text-slate-800"
      >
        <i className="far fa-circle-question mr-1" />
        Printing looks wrong?
        <i className={`fas fa-chevron-down text-[8px] ml-1 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
      </button>
      {showHelp && (
        <div className="mt-1.5 rounded-xl border border-slate-100 bg-white p-3 text-[11px] text-slate-600 leading-relaxed space-y-2">
          <p>
            <span className="font-bold text-slate-800">A full page comes out on a POS printer, or it’s badly cut off:</span> the printer’s paper size is probably set to A4.
            Choose your roll size above instead of Auto, or in the print window open <span className="font-semibold">More settings → Paper size</span> and pick the roll.
          </p>
          <p>
            <span className="font-bold text-slate-800">Words cut off on the right, or too much empty space:</span> tap your roll size above and change <span className="font-semibold">Printed width</span>: smaller if words are cut off, bigger if there’s too much space.
          </p>
          <p>
            <span className="font-bold text-slate-800">Not sure of the width?</span> Print a ruler and read it off:{' '}
            <button type="button" onClick={() => printWidthTest('thermal58')} className="font-black text-indigo-600 hover:underline">58mm roll</button>
            {' · '}
            <button type="button" onClick={() => printWidthTest('thermal80')} className="font-black text-indigo-600 hover:underline">80mm roll</button>
          </p>
        </div>
      )}
    </div>
  );
};

export default PaperPicker;
