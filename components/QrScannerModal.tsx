import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  title?: string;
}

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';

const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onResult, title = 'Scan QR / Barcode' }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, false);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (cancelled) return;
          onResult(decodedText);
        },
        () => {} // per-frame decode failure, ignore
      )
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not start camera. Check camera permissions.');
      });

    return () => {
      cancelled = true;
      scanner.stop().then(() => scanner.clear()).catch(() => {});
      scannerRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-in fade-in-25">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div id={SCANNER_ELEMENT_ID} className="w-full rounded-xl overflow-hidden bg-slate-900 min-h-[280px]" />

        {error && <p className="text-sm text-rose-500 bg-rose-50 p-3 rounded-lg">{error}</p>}
        <p className="text-xs text-slate-400 text-center">Point your camera at a QR code or barcode</p>

        <button
          onClick={onClose}
          className="w-full px-6 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default QrScannerModal;
