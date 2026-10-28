import React from 'react';
import { DocKind, PAPERS, usePaper } from '../utils/paper';

interface Props {
  kind: DocKind;
  className?: string;
}

// Segmented switch for the paper a document prints on. Remembered per device.
const PaperPicker: React.FC<Props> = ({ kind, className = '' }) => {
  const [paper, choose] = usePaper(kind);
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
    </div>
  );
};

export default PaperPicker;
