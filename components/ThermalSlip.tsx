import React from 'react';
import { useCurrency } from '../context/CurrencyContext';

export interface SlipItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SlipDoc {
  businessName: string;
  logo?: string | null;
  title: string; // e.g. "Receipt", "Invoice"
  number: string;
  date: string;
  // Who it's for: first line is the name.
  partyLabel: string;
  party: string[];
  status?: { label: string; paid: boolean };
  items: SlipItem[];
  // Rows between the items and the grand total.
  totals?: { label: string; value: number; negative?: boolean }[];
  totalLabel: string;
  total: number;
  // Extra emphasised row after the total, e.g. balance due.
  after?: { label: string; value: number };
  notes?: string;
  qr?: string;
}

const Rule: React.FC = () => <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />;

const Row: React.FC<{ left: React.ReactNode; right: React.ReactNode; bold?: boolean; size?: string }> = ({ left, right, bold, size }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2mm', fontWeight: bold ? 800 : 500, fontSize: size }}>
    <span>{left}</span>
    <span style={{ whiteSpace: 'nowrap' }}>{right}</span>
  </div>
);

// Compact black-on-white receipt for 58mm / 80mm thermal rolls. Thermal printers
// have no colour or greys, so everything is plain black with dashed rules.
const ThermalSlip: React.FC<{ doc: SlipDoc }> = ({ doc }) => {
  const { formatCurrency } = useCurrency();
  return (
    <div
      style={{
        boxSizing: 'border-box',
        padding: '3mm',
        color: '#000',
        background: '#fff',
        fontFamily: "'Courier New', ui-monospace, monospace",
        fontSize: '11px',
        lineHeight: 1.35,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {doc.logo && (
          <img
            src={doc.logo}
            alt=""
            style={{ maxWidth: '22mm', maxHeight: '16mm', objectFit: 'contain', margin: '0 auto 1.5mm', filter: 'grayscale(1) contrast(1.6)' }}
          />
        )}
        <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', wordBreak: 'break-word' }}>{doc.businessName}</div>
        <div style={{ fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginTop: '1mm' }}>{doc.title}</div>
      </div>

      <Rule />
      <Row left="No." right={doc.number} />
      <Row left="Date" right={doc.date} />
      <div style={{ marginTop: '1.5mm' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '9px', letterSpacing: '1px' }}>{doc.partyLabel}</div>
        {doc.party.map((line, i) => (
          <div key={i} style={{ fontWeight: i === 0 ? 800 : 500, wordBreak: 'break-word' }}>{line}</div>
        ))}
      </div>

      <Rule />
      {doc.items.map((item, i) => (
        <div key={i} style={{ marginBottom: '1.5mm', pageBreakInside: 'avoid' }}>
          <div style={{ fontWeight: 800, wordBreak: 'break-word' }}>{item.description}</div>
          <Row
            left={`${item.quantity} x ${formatCurrency(item.unitPrice)}`}
            right={formatCurrency(item.amount)}
          />
        </div>
      ))}

      <Rule />
      {doc.totals?.map((t) => (
        <Row key={t.label} left={t.label} right={`${t.negative ? '- ' : ''}${formatCurrency(t.value)}`} />
      ))}
      <div style={{ marginTop: '1mm' }}>
        <Row left={doc.totalLabel} right={formatCurrency(doc.total)} bold size="14px" />
      </div>
      {doc.after && (
        <div style={{ marginTop: '1mm' }}>
          <Row left={doc.after.label} right={formatCurrency(doc.after.value)} bold />
        </div>
      )}

      {doc.status && (
        <div
          style={{
            margin: '2.5mm 0 0',
            textAlign: 'center',
            fontWeight: 900,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            border: '1.5px solid #000',
            padding: '1mm 0',
          }}
        >
          {doc.status.label}
        </div>
      )}

      {doc.notes && (
        <>
          <Rule />
          <div style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>{doc.notes}</div>
        </>
      )}

      <Rule />
      {doc.qr && (
        <div style={{ textAlign: 'center', marginBottom: '1.5mm' }}>
          <img src={doc.qr} alt="" style={{ width: '28mm', height: '28mm', margin: '0 auto', imageRendering: 'pixelated' }} />
          <div style={{ fontSize: '9px' }}>Scan to view this receipt online</div>
        </div>
      )}
      <div style={{ textAlign: 'center', fontWeight: 800 }}>Thank you!</div>
      <div style={{ textAlign: 'center', fontSize: '9px', letterSpacing: '1px', marginTop: '0.5mm' }}>Generated via Morniy</div>
      {/* A little blank tail so the cutter doesn't slice the last line */}
      <div style={{ height: '8mm' }} />
    </div>
  );
};

export default ThermalSlip;
