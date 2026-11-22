import React, { useState, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { ScanResponse } from '../types';

interface ScanTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (data: ScanResponse, imageUrl: string | null, fileName: string) => void;
}

const ScanTransactionModal: React.FC<ScanTransactionModalProps> = ({ isOpen, onClose, onScanComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone photos are routinely 5-12MB, over the server's 5MB limit, and OCR on
  // them is slow. Downscale to ~2000px JPEG; fall back to the original on failure.
  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.size < 1024 * 1024) return resolve(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file),
          'image/jpeg',
          0.88,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    setError(null);
    const file = await compressImage(picked);
    if (file.size > 5 * 1024 * 1024) {
      setError('This file is over 5MB. Please choose a smaller image or PDF.');
      return;
    }
    setSelectedFile(file);
    if (file.type === 'application/pdf') {
      setPreview(null);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await apiRequest<ScanResponse>('/transactions/scan', {
        method: 'POST',
        body: formData,
        useFormData: true, // Special flag to indicate not to set Content-Type header
      });
      onScanComplete(response, preview, selectedFile.name);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during the scan.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center animate-in fade-in-25">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 m-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Scan Document</h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-800">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="space-y-4">
          <div className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col justify-center items-center text-slate-500 relative overflow-hidden gap-2">
            {preview ? (
              <img src={preview} alt="Selected document" className="h-full w-full object-contain" />
            ) : selectedFile ? (
              <>
                <i className="fas fa-file-pdf text-3xl text-rose-400"></i>
                <span className="text-sm font-medium px-4 text-center truncate max-w-full">{selectedFile.name}</span>
              </>
            ) : (
              <span>Image or PDF Preview</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold hover:bg-indigo-100 transition-colors">
              <i className="fas fa-camera"></i> Take photo
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
            <label className="cursor-pointer flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors">
              <i className="fas fa-folder-open"></i> Choose file
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-slate-400">Works best with a flat, well-lit photo where the Total / Amount is clearly visible.</p>
        </div>

        {error && <p className="text-sm text-rose-500 bg-rose-50 p-3 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-4">
          <button onClick={handleClose} className="px-6 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isLoading || !selectedFile}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
            {isLoading ? 'Scanning...' : 'Scan & Extract'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanTransactionModal;
