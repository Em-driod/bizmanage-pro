import React, { useState } from 'react';
import { apiRequest } from '../services/api';
import { ScannedInvoice } from '../types';

interface ScanInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanComplete: (data: ScannedInvoice) => void;
}

const ScanInvoiceModal: React.FC<ScanInvoiceModalProps> = ({ isOpen, onClose, onScanComplete }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
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
            const response = await apiRequest<ScannedInvoice>('/invoices/scan', {
                method: 'POST',
                body: formData,
                useFormData: true,
            });
            onScanComplete(response);
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
                    <h2 className="text-xl font-bold text-slate-800">Scan Invoice</h2>
                    <button onClick={handleClose} className="text-slate-500 hover:text-slate-800">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex justify-center items-center text-slate-500 relative overflow-hidden">
                        {preview ? (
                            <img src={preview} alt="Selected invoice" className="h-full w-full object-contain" />
                        ) : (
                            <span>Invoice Image Preview</span>
                        )}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
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
                        {isLoading ? 'Scanning...' : 'Scan Invoice'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanInvoiceModal;
