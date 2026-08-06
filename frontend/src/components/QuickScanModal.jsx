import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Receipt, Plane, Barcode, 
  ArrowLeft, Camera, Upload, X, ArrowRight, Award
} from 'lucide-react';
import { useScanStats } from '../context/ScanStatsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { submitScan } from '../lib/scanSubmission';
import ScoreBadge from './common/ScoreBadge.jsx';
import Spinner from './common/Spinner.jsx';
import ErrorBanner from './common/ErrorBanner.jsx';

export default function QuickScanModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { refreshStats } = useScanStats();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState('select-type'); 
  const [selectedType, setSelectedType] = useState(null); // 'product' | 'receipt' | 'flight' | 'barcode'
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null); // { scan: Object, newBadges: Array }
  const [errorMessage, setErrorMessage] = useState(null);
  const [unlockedBadges, setUnlockedBadges] = useState([]);

  const previousFocusRef = useRef(null);
  const modalPanelRef = useRef(null);

  // Hidden inputs refs
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement;
      // Reset state on open
      setStep('select-type');
      setSelectedType(null);
      setSelectedFile(null);
      setResult(null);
      setErrorMessage(null);
      setUnlockedBadges([]);

      const timer = setTimeout(() => {
        if (modalPanelRef.current) {
          modalPanelRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Restore focus on close
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen]);

  // Handle Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (step !== 'processing') {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  // Auto-dismiss new badges celebration banner
  useEffect(() => {
    if (unlockedBadges.length > 0) {
      const timer = setTimeout(() => {
        setUnlockedBadges([]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [unlockedBadges]);

  if (!isOpen) return null;

  // Option cards config
  const SCAN_TYPES = [
    { id: 'product', label: 'Product', icon: ShoppingCart, desc: 'Scan ingredients/factor' },
    { id: 'receipt', label: 'Receipt', icon: Receipt, desc: 'Analyze shopping items' },
    { id: 'flight', label: 'Flight', icon: Plane, desc: 'Calculate travel impact' },
    { id: 'barcode', label: 'Barcode', icon: Barcode, desc: 'Fast lookup by barcode' },
  ];

  // Initiate scan processing using the shared submitScan function
  const processFile = async (file) => {
    if (!file) return;
    setStep('processing');
    setErrorMessage(null);

    try {
      const response = await submitScan({
        type: selectedType,
        file: file
      });

      if (response.success) {
        setResult(response.scan);
        if (response.newBadges && response.newBadges.length > 0) {
          setUnlockedBadges(response.newBadges);
        }
        setStep('result');
        // Refresh contexts
        await refreshStats();
        await refreshUser();
      } else {
        setErrorMessage(response.error || 'Something went wrong processing this scan.');
        setStep('error');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong processing this scan.');
      setStep('error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      processFile(file);
    }
  };

  const selectType = (typeId) => {
    setSelectedType(typeId);
    setStep('select-file');
    
  };

  const handleBack = () => {
    setSelectedType(null);
    setStep('select-type');
  };

  const resetScanner = () => {
    setStep('select-type');
    setSelectedType(null);
    setSelectedFile(null);
    setResult(null);
    setErrorMessage(null);
    setUnlockedBadges([]);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && step !== 'processing') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal / Sheet Panel */}
      <div
        ref={modalPanelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="
          bg-white shadow-2xl overflow-hidden flex flex-col focus:outline-none
          w-full max-h-[85vh] sm:max-h-[90vh] sm:max-w-[480px]
          fixed bottom-0 rounded-t-3xl sm:relative sm:bottom-auto sm:rounded-2xl
          transition-transform duration-300 ease-out translate-y-0
        "
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist">
          <div className="flex items-center gap-2">
            {step === 'select-file' && (
              <button 
                onClick={handleBack}
                className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Back to select type"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-display font-bold text-ink text-lg leading-tight">
              {step === 'select-type' && 'Quick Scan'}
              {step === 'select-file' && `Scan ${selectedType?.charAt(0).toUpperCase() + selectedType?.slice(1)}`}
              {step === 'processing' && 'Processing'}
              {step === 'result' && 'Scan Completed'}
              {step === 'error' && 'Error Processing'}
            </h2>
          </div>
          {step !== 'processing' && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal content body */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[220px]">
          
          {/* Celebratory badge unlock banner (Absolute inside content) */}
          {unlockedBadges.length > 0 && (
            <div className="flex flex-col gap-2 mb-4 animate-bounce">
              {unlockedBadges.map((badge) => (
                <div
                  key={badge.key}
                  className="bg-forest border border-emerald-500 rounded-xl p-4 text-white shadow-lg flex items-center gap-3"
                >
                  <span className="text-3xl" role="img" aria-label="badge emoji">{badge.emoji || '🏆'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs uppercase tracking-wider text-green-400 font-display">🏆 Badge Unlocked!</p>
                    <p className="font-bold text-sm font-display">{badge.label}</p>
                    <p className="text-[10px] text-gray-200 font-body">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 1: Select Type */}
          {step === 'select-type' && (
            <div className="grid grid-cols-2 gap-4">
              {SCAN_TYPES.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => selectType(id)}
                  className="
                    flex flex-col items-start p-4 border border-mist rounded-xl bg-white text-left
                    hover:border-forest hover:bg-forest/5 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-forest/20
                  "
                >
                  <div className="w-10 h-10 rounded-lg bg-forest/10 text-forest flex items-center justify-center mb-3 group-hover:bg-forest group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-ink mb-1 group-hover:text-forest transition-colors">
                    {label}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-body leading-normal">
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: Select File / Capture */}
          {step === 'select-file' && (
            <div className="flex flex-col gap-4">
              {/* Stacked interactive button controls */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="
                  flex items-center justify-center gap-3 w-full bg-forest text-white rounded-xl py-3.5 px-4 font-bold text-sm
                  hover:bg-forest-dark transition-all shadow-sm active:scale-[0.99]
                "
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="
                  flex items-center justify-center gap-3 w-full bg-white border border-mist text-ink rounded-xl py-3.5 px-4 font-bold text-sm
                  hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-[0.99]
                "
              >
                <Upload className="w-5 h-5 text-gray-500" />
                Choose File
              </button>

              {/* Hidden HTML Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept={selectedType === 'barcode' ? 'image/*' : 'image/*,application/pdf'}
                className="hidden"
                onChange={handleFileChange}
              />
              
              <p className="text-center text-[10px] text-gray-400 mt-2 font-body leading-normal">
                {selectedType === 'barcode' 
                  ? 'Supports barcode image scanning only' 
                  : 'Supports images (JPEG, PNG, WEBP) and PDF files'}
              </p>
            </div>
          )}

          {/* STEP 3: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-6">
              <Spinner size="large" />
              <p className="text-sm font-medium text-gray-600 mt-4 font-body animate-pulse">
                Processing your scan...
              </p>
            </div>
          )}

          {/* STEP 4: Result */}
          {step === 'result' && result && (
            <div className="flex flex-col">
              <div className="bg-gray-50 border border-mist rounded-xl p-5 mb-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-body">Category</p>
                    <p className="font-bold text-base text-ink font-display mt-0.5">{result.category}</p>
                  </div>
                  <ScoreBadge score={result.score} />
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-body">Emission Impact</p>
                  {result.co2Kg != null ? (
                    <p className="font-mono font-bold text-2xl text-forest mt-0.5">
                      {result.co2Kg.toFixed(2)} <span className="text-sm font-sans text-gray-500 font-normal">kg CO2e</span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 italic mt-1 leading-normal font-body">
                      Note: {result.parsedFields?.note || 'No emission calculation available.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/app/dashboard');
                  }}
                  className="
                    flex items-center justify-center gap-2 w-full bg-forest text-white rounded-xl py-3 px-4 font-bold text-sm
                    hover:bg-forest-dark transition-all shadow-sm active:scale-[0.99]
                  "
                >
                  View in Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={resetScanner}
                  className="
                    flex items-center justify-center gap-2 w-full bg-white border border-mist text-ink rounded-xl py-3 px-4 font-bold text-sm
                    hover:bg-gray-50 transition-all active:scale-[0.99]
                  "
                >
                  Scan Another
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate(`/app/recycle?scanId=${result._id}`);
                  }}
                  className="
                    inline-flex items-center justify-center text-xs font-semibold text-forest hover:text-forest-dark hover:underline py-1 mt-1
                  "
                >
                  Find where to recycle this →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Error */}
          {step === 'error' && (
            <div className="flex flex-col">
              <ErrorBanner message={errorMessage} />
              
              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={() => setStep('select-file')}
                  className="
                    flex items-center justify-center w-full bg-forest text-white rounded-xl py-3 px-4 font-bold text-sm
                    hover:bg-forest-dark transition-all shadow-sm active:scale-[0.99]
                  "
                >
                  Try Again
                </button>

                <button
                  onClick={resetScanner}
                  className="
                    flex items-center justify-center w-full bg-white border border-mist text-ink rounded-xl py-3 px-4 font-bold text-sm
                    hover:bg-gray-50 transition-all active:scale-[0.99]
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
