import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ShoppingCart, Receipt, Plane, Barcode, FileUp, Plus,
  Brain, FileText, CheckCircle2, ShieldCheck, CheckCheck,
  FileSearch, ScanLine, X, Loader2, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Recycle, Leaf, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Toast } from '../App.jsx';
import api from '../lib/api.js'; // Use the authenticated Axios client from Part 5
import { useScanStats } from '../context/ScanStatsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { decodeBarcodeFromFile } from '../lib/barcodeScanner';
import { submitScan } from '../lib/scanSubmission';
import ScoreBadge from '../components/common/ScoreBadge.jsx';
import ReceiptBreakdown from '../components/ReceiptBreakdown.jsx';

const TABS = [
  { id: 'product', label: 'Product', Icon: ShoppingCart },
  { id: 'receipt', label: 'Receipt', Icon: Receipt      },
  { id: 'flight',  label: 'Flight',  Icon: Plane        },
  { id: 'barcode', label: 'Barcode', Icon: Barcode      },
];

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_MB = 10; // Backend limits fileSize to max 10MB

// Curated Category Lists for Manual Correction (matching backend emissionFactors.json keys/labels)
const SPEND_CATEGORIES = [
  'Groceries',
  'Restaurant & Dining',
  'Clothing & Fashion',
  'Electronics Retail',
  'Fuel & Gas',
  'Pharmacy & Health',
  'Home Goods & Furniture',
  'General Retail'
];

const MATERIAL_AND_FOOD_CATEGORIES = [
  'Leather Goods',
  'Cotton Textile',
  'Synthetic Textile',
  'Plastic Item',
  'Bamboo / Wood',
  'Glass Item',
  'Metal Item',
  'Paper / Cardboard',
  'Small Electronics (cable, charger)',
  'Smartphone',
  'Laptop / Computer',
  'Beef',
  'Lamb',
  'Pork',
  'Poultry',
  'Fish',
  'Eggs',
  'Cheese',
  'Milk',
  'Rice',
  'Tofu',
  'Vegetables',
  'Fruit',
  'Legumes',
  'Grains',
  'General / Unidentified'
];

export default function UploadCenter() {
  const navigate = useNavigate();
  const { refreshStats } = useScanStats();
  const [activeTab, setActiveTab] = useState('product');
  
  // Track selected/staged files in component state, keyed to the currently active tab
  const [tabFiles, setTabFiles] = useState({
    product: [],
    receipt: [],
    flight: [],
    barcode: []
  });

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);
  
  // Barcode decoding states
  const [barcodeResult, setBarcodeResult] = useState({ value: '', error: null, decoding: false });
  
  // Live Activity states
  const [liveActivity, setLiveActivity] = useState([]);
  const [expandedScanId, setExpandedScanId] = useState(null);
  const [correctingScanId, setCorrectingScanId] = useState(null);
  const { refreshUser } = useAuth();
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [updatingCategory, setUpdatingCategory] = useState(false);

  const [activeAlternativeId, setActiveAlternativeId] = useState(null);
  const [alternativeData, setAlternativeData] = useState(null);
  const [altLoading, setAltLoading] = useState(false);
  const [altError, setAltError] = useState(null);

  async function handleFetchAlternative(scanId) {
    if (activeAlternativeId === scanId) {
      setActiveAlternativeId(null);
      setAlternativeData(null);
      return;
    }

    setActiveAlternativeId(scanId);
    setAlternativeData(null);
    setAltError(null);
    setAltLoading(true);

    try {
      const res = await api.get(`/scans/${scanId}/alternative`);
      if (res.data && res.data.success) {
        setAlternativeData(res.data);
      } else {
        setAltError(res.data?.message || 'Failed to load alternative suggestion.');
      }
    } catch (err) {
      console.error('[UploadCenter] Failed to fetch alternative:', err);
      setAltError(err.response?.data?.message || err.message || 'Failed to load alternative suggestion.');
    } finally {
      setAltLoading(false);
    }
  }

  const handleLoadSampleReceipt = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 460;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 460, 360);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('WHOLE FOODS MARKET', 25, 45);
      ctx.font = '13px monospace';
      ctx.fillText('09/20/2026   STORE #102', 25, 70);
      ctx.fillText('--------------------------------', 25, 90);
      ctx.fillText('HONEYCRISP APPLES 1.2KG    $3.49', 25, 120);
      ctx.fillText('CHICKEN BREAST 1LB        $10.99', 25, 150);
      ctx.fillText('TIDE LAUNDRY DETERGENT    $14.99', 25, 180);
      ctx.fillText('GROUND BEEF 80/20 1LB     $16.50', 25, 210);
      ctx.fillText('ORGANIC WHOLE MILK 1GAL    $4.29', 25, 240);
      ctx.fillText('--------------------------------', 25, 265);
      ctx.font = 'bold 14px monospace';
      ctx.fillText('TOTAL                     $50.26', 25, 290);
      ctx.font = '11px monospace';
      ctx.fillText('THANK YOU FOR SHOPPING WITH US', 25, 325);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], 'grocery_receipt_sample.png', { type: 'image/png' });
        const preview = URL.createObjectURL(blob);
        setTabFiles((prev) => ({
          ...prev,
          receipt: [{ file, preview }]
        }));
        showToast('Sample grocery receipt loaded! Click "Process with AI Lens" below.', 'success');
      }, 'image/png');
    } catch (err) {
      console.error('Failed to generate sample receipt image:', err);
    }
  };

  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);

  const files = tabFiles[activeTab] || [];

  function showToast(msg, type = 'error') {
    setToast({ msg, type });
  }

  // Fetch recent scans from the database
  const fetchRecentScans = useCallback(async () => {
    try {
      const res = await api.get('/scans?limit=5');
      setLiveActivity(res.data || []);
    } catch (err) {
      console.error('Error fetching scans:', err);
    }
  }, []);

  // Fetch recent scans from the database on mount
  useEffect(() => {
    fetchRecentScans();
    // Product identification is now handled by Gemini Vision on the backend — no client warmup needed.
  }, [fetchRecentScans]);

  // Handle barcode decoding for barcode uploads
  async function handleBarcodeDecode(file) {
    setBarcodeResult({ value: '', error: null, decoding: true });
    try {
      const decodedValue = await decodeBarcodeFromFile(file);
      setBarcodeResult({ value: decodedValue, error: null, decoding: false });
    } catch (err) {
      setBarcodeResult({ value: '', error: err.message, decoding: false });
    }
  }

  function validateAndAdd(newFiles) {
    const valid = [];
    for (const f of newFiles) {
      if (!ACCEPT.includes(f.type)) {
        showToast(`"${f.name}" is not a supported file type.`);
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        showToast(`"${f.name}" exceeds the ${MAX_MB}MB limit.`);
        continue;
      }
      valid.push({ file: f, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
    }

    setTabFiles(prev => {
      const updated = [...prev[activeTab], ...valid];
      
      // For barcode scans specifically, attempt client-side decoding immediately
      if (activeTab === 'barcode' && updated.length > 0) {
        handleBarcodeDecode(updated[0].file);
      }
      
      return {
        ...prev,
        [activeTab]: updated
      };
    });
  }

  function onFileInput(e) {
    validateAndAdd(Array.from(e.target.files));
    e.target.value = '';
  }

  function removeFile(idx) {
    setTabFiles(prev => {
      const copy = [...prev[activeTab]];
      if (copy[idx].preview) URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      
      if (activeTab === 'barcode' && copy.length === 0) {
        setBarcodeResult({ value: '', error: null, decoding: false });
      }

      return {
        ...prev,
        [activeTab]: copy
      };
    });
  }

  // Drag & Drop
  const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    validateAndAdd(Array.from(e.dataTransfer.files));
  }, [activeTab]);

  async function handleProcess() {
    if (files.length === 0) {
      showToast('Please upload at least one file.');
      return;
    }
    setLoading(true);
    setSuccess(false);

    // Create a local placeholder for the processing item in Live Activity
    const tempScanId = 'temp-' + Date.now();
    const tempScan = {
      _id: tempScanId,
      type: activeTab,
      originalFilename: activeTab === 'barcode' 
        ? `Barcode: ${barcodeResult.value || 'Manual Entry'}` 
        : files[0].file.name,
      status: 'processing',
      createdAt: new Date().toISOString()
    };
    setLiveActivity(prev => [tempScan, ...prev.slice(0, 4)]);

    try {
      const result = await submitScan({
        type: activeTab,
        file: files[0]?.file,
        barcodeValueOverride: activeTab === 'barcode' ? barcodeResult.value : null
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setSuccess(true);
      showToast('File processed successfully!', 'success');

      // Check for newly earned badges in the response
      const newBadgesList = result.newBadges;
      if (newBadgesList && newBadgesList.length > 0) {
        setUnlockedBadges(prev => [...prev, ...newBadgesList]);
        setTimeout(() => {
          setUnlockedBadges(prev => prev.filter(b => !newBadgesList.some(nb => nb.key === b.key)));
        }, 5000);
      }
      
      // Clear state for the current active tab
      setTabFiles(prev => ({
        ...prev,
        [activeTab]: []
      }));
      setBarcodeResult({ value: '', error: null, decoding: false });
      
      // Refresh database records
      await fetchRecentScans();
      refreshStats();
      await refreshUser();
      
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('[UploadCenter] Processing error:', err);
      
      const errorMsg = err.message || 'Processing failed';

      // Mark the placeholder item as failed and attach error description
      setLiveActivity(prev =>
        prev.map(s =>
          s._id === tempScanId
            ? { ...s, status: 'failed', errorMessage: errorMsg }
            : s
        )
      );
      refreshStats();

      const isOffline = err.message === 'Failed to fetch' || err.status === undefined;
      showToast(
        isOffline
          ? 'Cannot reach the server. Is the backend running on port 5000?'
          : errorMsg
      );
    } finally {
      setLoading(false);
    }
  }

  // Handle manual category correction override request
  async function handleCategoryCorrection(scanId, newCategory) {
    setUpdatingCategory(true);
    try {
      const res = await api.patch(`/scans/${scanId}/category`, { newCategory });
      showToast('Category updated successfully!', 'success');
      
      // Update item in local state list live with the corrected response values
      setLiveActivity(prev =>
        prev.map(s => (s._id === scanId ? res.data : s))
      );
      refreshStats();
      setCorrectingScanId(null);
    } catch (err) {
      console.error('[UploadCenter] Manual category correction failed:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update category';
      showToast(errorMsg);
    } finally {
      setUpdatingCategory(false);
    }
  }

  // Type helper for labels
  const getTabLabel = (id) => TABS.find(t => t.id === id)?.label || id;

  return (
    <div className="px-10 pt-8 pb-10 bg-paper">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[36px] font-bold text-ink leading-tight mb-2 font-display">Upload Center</h1>
        <p className="text-gray-500 text-sm max-w-2xl leading-relaxed font-body">
          Precision data entry for climate tracking. Archive your lifestyle impacts through receipts, flight logs, and product scans.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-7">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                // Clear success indicator on tab switch
                setSuccess(false);
              }}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all font-body ${
                activeTab === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── LEFT ── */}
        <div className="w-full lg:w-[60%]">
          <div className="bg-white border border-mist rounded-xl p-7 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display font-bold text-base text-ink">Import Documents</h2>
              <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest">Multi-File Supported</span>
            </div>

            {/* Multi-Item Receipt Breakdown callout when receipt tab is selected */}
            {activeTab === 'receipt' && (
              <div className="mb-4 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-forest flex-shrink-0" />
                  <p className="text-xs text-forest font-medium font-body">
                    <strong>Multi-Item Receipt Breakdown:</strong> Automatically detects line items and reveals the <strong className="text-rose-700">#1 Carbon Offender</strong> in your cart.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleReceipt}
                  className="text-xs font-bold text-forest bg-white border border-emerald-300 hover:bg-emerald-50 px-2.5 py-1 rounded-lg shadow-xs flex-shrink-0 transition-colors flex items-center gap-1 cursor-pointer font-body"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Try Sample Receipt
                </button>
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl bg-gray-50 cursor-pointer p-10 flex flex-col items-center justify-center mb-5 transition-colors select-none ${
                dragging ? 'border-forest bg-green-50' : 'border-mist hover:border-gray-300'
              }`}
            >
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <FileUp className="w-5 h-5 text-gray-600" />
              </div>
              <p className="font-display font-bold text-ink text-[15px] mb-1">Drop files here or browse</p>
              <p className="text-xs text-gray-400 font-body">
                Upload PDF, PNG, JPG, or WEBP (Max <span className="font-mono tabular-nums">{MAX_MB}</span>MB)
              </p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={onFileInput} />
            <input ref={addMoreInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={onFileInput} />

            {/* Staged Barcode Manual Input */}
            {activeTab === 'barcode' && (barcodeResult.error || barcodeResult.value) && (
              <div className="mb-6 p-4 rounded-xl border font-body">
                {barcodeResult.error && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-600 text-sm">
                    <p className="font-bold flex items-center gap-1.5 mb-2">
                      <AlertCircle className="w-4 h-4" /> Couldn't auto-detect barcode.
                    </p>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Enter Barcode Manually</label>
                    <input
                      type="text"
                      value={barcodeResult.value}
                      onChange={(e) => setBarcodeResult(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="e.g. 012345678905"
                      className="w-full h-10 px-3 border border-mist rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/20 text-sm font-mono"
                    />
                  </div>
                )}
                {barcodeResult.value && !barcodeResult.error && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-forest text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-forest" />
                    <span>Detected barcode value: <span className="font-mono text-gray-900">{barcodeResult.value}</span></span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'barcode' && barcodeResult.decoding && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 flex items-center gap-2 font-body">
                <Loader2 className="w-4 h-4 animate-spin text-forest" />
                <span className="text-sm">Decoding barcode image client-side...</span>
              </div>
            )}

            {/* Thumbnails */}
            <div className="flex flex-wrap gap-4 mb-7">
              {/* Uploaded file thumbs */}
              {files.map((f, i) => (
                <div key={i} className="relative w-[110px] h-[110px] bg-[#353d38] rounded-xl overflow-hidden flex-shrink-0 group">
                  {f.preview
                    ? <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                    : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white gap-2 font-body">
                        <span className="text-3xl">📄</span>
                        <span className="text-[9px] text-gray-300 text-center px-2 truncate w-full">{f.file.name}</span>
                      </div>
                    )
                  }
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}

              {/* Static placeholders (only shown if tab is empty) */}
              {files.length === 0 && (
                <>
                  <div className="w-[110px] h-[110px] bg-[#353d38] rounded-xl overflow-hidden flex items-center justify-center p-2 flex-shrink-0">
                    <div className="w-full h-full bg-[#4a524d] rounded-lg flex flex-col p-2">
                      <div className="text-[7px] text-gray-300 font-mono font-bold text-center border-b border-gray-500 pb-1 mb-1 uppercase">Receipt</div>
                      <div className="flex flex-col gap-1 mt-1">
                        {[...Array(5)].map((_, k) => (
                          <div key={k} className={`h-1 bg-gray-500 rounded ${k % 3 === 1 ? 'w-3/4' : k % 3 === 2 ? 'w-1/2' : 'w-full'}`} />
                        ))}
                      </div>
                      <div className="mt-auto pt-1 border-t border-gray-500">
                        <div className="h-1 bg-gray-400 rounded w-full" />
                      </div>
                    </div>
                  </div>
                  <div className="w-[130px] h-[110px] bg-[#353d38] rounded-xl overflow-hidden flex items-center justify-center p-2 flex-shrink-0">
                    <div className="w-full h-full bg-gray-100 rounded-lg flex flex-col p-2 text-gray-700">
                      <div className="flex justify-between items-start border-b border-gray-300 pb-1 mb-1 font-mono">
                        <span className="text-[7px] font-bold">FLIGHT TICKET</span>
                        <span className="text-[6px] text-gray-500">BARCODE</span>
                      </div>
                      <div className="flex gap-1 text-[6px] mb-1 font-body"><span className="font-bold">LHR</span><span className="text-gray-400">→</span><span className="font-bold">NYC</span></div>
                      <div className="flex flex-col gap-0.5">
                        <div className="h-0.5 bg-gray-300 rounded w-full" />
                        <div className="h-0.5 bg-gray-300 rounded w-2/3" />
                      </div>
                      <div className="mt-auto flex justify-between items-end">
                        <div><div className="h-0.5 bg-gray-400 rounded w-8 mb-0.5" /><div className="h-0.5 bg-gray-300 rounded w-5" /></div>
                        <div className="w-7 h-7 border border-gray-400 rounded-sm grid grid-cols-3 gap-px p-0.5">
                          {[...Array(9)].map((_, k) => <div key={k} className="bg-gray-500 rounded-[1px]" />)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Add more button */}
              <button
                onClick={() => addMoreInputRef.current?.click()}
                className="w-[110px] h-[110px] border-2 border-dashed border-mist rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-forest hover:text-forest transition-colors flex-shrink-0 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Plus className="w-4 h-4" /></div>
                <span className="text-xs font-semibold font-body">Add more</span>
              </button>
            </div>

            {/* Process button */}
            <button
              onClick={handleProcess}
              disabled={loading || success || (activeTab === 'barcode' && !barcodeResult.value && !barcodeResult.decoding)}
              className={`w-full h-[52px] rounded-xl flex items-center justify-center gap-3 font-bold text-sm transition-all font-body focus:outline-none focus:ring-2 focus:ring-forest/20 cursor-pointer ${
                success
                  ? 'bg-[#00c896] text-white'
                  : 'bg-forest hover:bg-forest-dark text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                : success
                  ? <><CheckCircle2 className="w-5 h-5" /> Success!</>
                  : <><ScanLine className="w-5 h-5" /> Process with AI Lens</>
              }
            </button>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="w-full lg:w-[38%] flex flex-col gap-5">
          {/* AI Processing Layer card */}
          <div className="bg-forest rounded-xl p-6 text-white shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Brain className="w-5 h-5 text-white" />
              <h3 className="font-display font-bold text-[15px]">AI Processing Layer</h3>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed font-body">
              Tesseract.js reads your upload directly on the server — no third-party AI service, no data leaves this app.
            </p>
          </div>

          {/* Celebratory badge unlock banner */}
          {unlockedBadges.length > 0 && (
            <div className="flex flex-col gap-2">
              {unlockedBadges.map((badge) => (
                <div
                  key={badge.key}
                  className="bg-forest border border-emerald-500 rounded-xl p-4 text-white shadow-lg animate-bounce flex items-center gap-3 animate-pulse"
                >
                  <span className="text-3xl">{badge.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs uppercase tracking-wider text-green-400 font-display">🏆 Badge Unlocked!</p>
                    <p className="font-bold text-sm font-display">{badge.label}</p>
                    <p className="text-[10px] text-gray-200 font-body">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live Activity card */}
          <div className="bg-white border border-mist rounded-xl p-5 flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-ink text-[15px]">Live Activity</h3>
              <span className="text-[9px] font-mono font-bold text-forest bg-green-50 px-2.5 py-1 rounded uppercase tracking-widest">Active DB</span>
            </div>
            <div className="flex flex-col gap-4">
              {liveActivity.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 font-body">No recent activities found.</p>
              ) : (
                liveActivity.map((scan) => {
                  const isTemp = scan._id.toString().startsWith('temp-');
                  const isExpanded = expandedScanId === scan._id;

                  // Render status badge configuration
                  let statusBadge = null;
                  if (scan.status === 'processing') {
                    statusBadge = (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-semibold text-amber-600 font-body">Processing</span>
                      </div>
                    );
                  } else if (scan.status === 'ocr_done') {
                    statusBadge = (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-green-600 font-body">Done</span>
                      </div>
                    );
                  } else if (scan.status === 'failed') {
                    statusBadge = (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-red-600 font-body">Failed</span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={scan._id} 
                      className={`border-b border-gray-50 last:border-b-0 pb-3 last:pb-0 ${
                        !isTemp && scan.status !== 'processing' ? 'cursor-pointer hover:bg-gray-50/50 rounded-lg p-1.5 transition-colors' : 'p-1.5'
                      }`}
                      onClick={() => {
                        if (!isTemp && scan.status !== 'processing') {
                          setExpandedScanId(isExpanded ? null : scan._id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-forest/10 text-forest rounded-lg flex items-center justify-center flex-shrink-0">
                            {scan.type === 'barcode' ? <Barcode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-ink leading-tight font-display truncate">
                              {scan.type === 'barcode' ? `Barcode: ${scan.barcodeValue || 'N/A'}` : scan.originalFilename}
                            </p>

                            {/* Category & CO2 emissions live tracking details */}
                            {scan.status === 'ocr_done' && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {/* Score Badge component matching dashboard score ranges */}
                                <ScoreBadge score={scan.score} />
                                
                                <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[120px]">
                                  {scan.category || 'Unidentified'}
                                </span>
                                
                                <span className="text-[11px] text-gray-400">•</span>
                                
                                <span className="text-[11px] font-mono font-bold text-forest tabular-nums">
                                  {scan.co2Kg != null ? `${scan.co2Kg} kg CO2e` : 'No CO2'}
                                </span>
                              </div>
                            )}

                            {/* Optional Estimated Label for Spend Amount estimation */}
                            {scan.status === 'ocr_done' && scan.parsedFields?.estimatedAmount && (
                              <span className="text-[9px] text-yellow-600 bg-yellow-50 px-1 py-0.5 rounded font-body inline-block mt-0.5">
                                (amount estimated)
                              </span>
                            )}

                            {/* Prominent #1 Carbon Offender preview badge for receipts */}
                            {scan.status === 'ocr_done' && scan.type === 'receipt' && scan.calculationDetails?.receiptBreakdown?.topOffender && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-body max-w-full">
                                <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0" />
                                <span className="truncate">
                                  #1 Offender: <strong>{scan.calculationDetails.receiptBreakdown.topOffender.name}</strong> ({scan.calculationDetails.receiptBreakdown.topOffender.co2Kg} kg • {scan.calculationDetails.receiptBreakdown.topOffender.percentage}%)
                                </span>
                              </div>
                            )}

                            {/* If CO2 calculation failed or route unverified, show the note message with grey dot */}
                            {scan.status === 'ocr_done' && scan.co2Kg == null && scan.parsedFields?.note && (
                              <p className="text-[10px] text-gray-500 mt-1 leading-normal italic font-body max-w-full truncate">
                                Note: {scan.parsedFields.note}
                              </p>
                            )}

                            <p className="text-[9px] text-gray-400 mt-1 font-body uppercase tracking-wider">
                              {getTabLabel(scan.type)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          {statusBadge}
                          {!isTemp && scan.status === 'ocr_done' && (
                            isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Display failure message if scan failed */}
                      {scan.status === 'failed' && scan.errorMessage && (
                        <p className="text-[10px] text-red-500 mt-1 pl-11 font-body">
                          Error: {scan.errorMessage}
                        </p>
                      )}

                      {/* Expandable Selector for Manual Category Correction Override */}
                      {!isTemp && scan.status === 'ocr_done' && scan.type !== 'flight' && (
                        <div className="mt-2 pl-11">
                          {correctingScanId === scan._id ? (
                            <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                              <select
                                defaultValue={scan.category || ''}
                                disabled={updatingCategory}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleCategoryCorrection(scan._id, e.target.value);
                                }}
                                className="text-xs border border-mist rounded px-1.5 py-1 bg-white text-gray-700 max-w-full font-body focus:outline-none focus:ring-1 focus:ring-forest cursor-pointer"
                              >
                                <option value="" disabled>Select category...</option>
                                {(scan.type === 'receipt' ? SPEND_CATEGORIES : MATERIAL_AND_FOOD_CATEGORIES).map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCorrectingScanId(null);
                                }}
                                disabled={updatingCategory}
                                className="text-[10px] text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCorrectingScanId(scan._id);
                              }}
                              className="text-[10px] font-bold text-forest hover:text-forest-dark hover:underline cursor-pointer"
                            >
                              Wrong category? Fix it
                            </button>
                          )}
                        </div>
                      )}

                      {/* Expanded scan fields / text details */}
                      {isExpanded && scan.status === 'ocr_done' && (
                        <div className="mt-3 pl-11 text-xs font-body text-gray-700" onClick={(e) => e.stopPropagation()}>
                          {scan.type === 'barcode' ? (
                            <div className="bg-gray-50 border border-mist p-2.5 rounded-lg">
                              <div className="font-mono text-[10px] flex flex-col gap-1.5">
                                <div className="flex justify-between">
                                  <span className="text-gray-400 uppercase font-bold">Barcode Value:</span>
                                  <span className="text-gray-900 font-bold select-text tabular-nums">{scan.barcodeValue}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 uppercase font-bold">Category Match:</span>
                                  <span className="text-gray-900 font-bold">{scan.category || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 uppercase font-bold">Carbon Score:</span>
                                  <span className="text-gray-900 font-bold tabular-nums">{scan.score != null ? `${scan.score}/100` : 'N/A'}</span>
                                </div>
                                {scan.manuallyCorrected && (
                                  <div className="text-[9px] text-forest font-bold bg-green-50 px-1.5 py-0.5 rounded text-center mt-1 uppercase">
                                    Manually Corrected
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2.5">
                              {/* Display parsed fields values */}
                              <div className="bg-gray-50 border border-mist p-2.5 rounded-lg">
                                <p className="font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1">Extracted Metadata</p>
                                <div className="font-mono text-[10px] mt-1.5 flex flex-col gap-1.5">
                                  {scan.type === 'receipt' && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Store:</span>
                                        <span className="text-gray-900 font-bold select-text">{scan.parsedFields?.storeName || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Total Amount:</span>
                                        <span className="text-gray-900 font-bold select-text tabular-nums">
                                          {scan.parsedFields?.totalAmount != null ? `$${scan.parsedFields.totalAmount.toFixed(2)}` : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Calculated Score:</span>
                                        <span className="text-gray-900 font-bold select-text tabular-nums">
                                          {scan.score != null ? `${scan.score}/100` : 'N/A'}
                                        </span>
                                      </div>
                                      {scan.manuallyCorrected && (
                                        <div className="text-[9px] text-forest font-bold bg-green-50 px-1.5 py-0.5 rounded text-center uppercase">
                                          Manually Corrected
                                        </div>
                                      )}

                                      {/* Multi-Item Receipt Breakdown */}
                                      {scan.calculationDetails?.receiptBreakdown ? (
                                        <div className="mt-3 pt-2 border-t border-gray-200">
                                          <ReceiptBreakdown breakdown={scan.calculationDetails.receiptBreakdown} />
                                        </div>
                                      ) : (
                                        scan.parsedFields?.itemLines && scan.parsedFields.itemLines.length > 0 && (
                                          <div className="mt-1">
                                            <span className="text-gray-400 uppercase font-bold block mb-1">Items Lines:</span>
                                            <div className="bg-white border border-gray-100 p-1.5 rounded max-h-24 overflow-y-auto leading-normal text-gray-600 flex flex-col gap-0.5 font-sans">
                                              {scan.parsedFields.itemLines.map((line, idx) => (
                                                <div key={idx} className="truncate select-text">{line}</div>
                                              ))}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </>
                                  )}
                                  {scan.type === 'flight' && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Flight Number:</span>
                                        <span className="text-gray-900 font-bold select-text">{scan.parsedFields?.flightNumber || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Airport Codes:</span>
                                        <span className="text-gray-900 font-bold select-text">
                                          {scan.parsedFields?.airportCodes?.length > 0 ? scan.parsedFields.airportCodes.join(' → ') : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Flight Distance:</span>
                                        <span className="text-gray-900 font-bold select-text tabular-nums">
                                          {scan.parsedFields?.distanceKm != null ? `${scan.parsedFields.distanceKm} km` : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Date Guess:</span>
                                        <span className="text-gray-900 font-bold select-text tabular-nums">{scan.parsedFields?.dateGuess || 'N/A'}</span>
                                      </div>
                                    </>
                                  )}
                                  {scan.type === 'product' && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Name Guess:</span>
                                        <span className="text-gray-900 font-bold select-text">{scan.parsedFields?.productNameGuess || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400 uppercase font-bold">Calculated Score:</span>
                                        <span className="text-gray-900 font-bold select-text tabular-nums">{scan.score != null ? `${scan.score}/100` : 'N/A'}</span>
                                      </div>
                                      {scan.manuallyCorrected && (
                                        <div className="text-[9px] text-forest font-bold bg-green-50 px-1.5 py-0.5 rounded text-center uppercase">
                                          Manually Corrected
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Display OCR Raw text */}
                              <div className="bg-gray-50 border border-mist p-2.5 rounded-lg">
                                <p className="font-bold text-gray-800 mb-1">Raw Extracted Text</p>
                                <pre className="bg-white border border-gray-100 p-2 rounded text-[10px] font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto select-text">
                                  {scan.rawText || '(No readable text extracted)'}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Disposal Guide & Greener Alternative Quick Links */}
                          {scan.status === 'ocr_done' && (
                            <div className="mt-3 pt-3 border-t border-dashed border-mist flex flex-col gap-3">
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase font-bold text-gray-400">Classification</span>
                                  <span className="text-gray-900 font-bold capitalize">{scan.category?.replace(/_/g, ' ') || 'General Scan'}</span>
                                </div>
                                <div className="flex gap-2">
                                  {scan.type !== 'flight' && scan.category && (
                                    <button
                                      onClick={() => navigate(`/app/recycle?query=${encodeURIComponent(scan.category)}&scanId=${scan._id}`)}
                                      className="bg-forest/10 hover:bg-forest/20 text-forest font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Recycle className="w-3.5 h-3.5" />
                                      Disposal Guide
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleFetchAlternative(scan._id)}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Leaf className="w-3.5 h-3.5" />
                                    See Alternative
                                  </button>
                                </div>
                              </div>

                              {/* Alternative Details Sub-panel */}
                              {activeAlternativeId === scan._id && (
                                <div className="bg-paper border border-mist rounded-lg p-3 text-xs mt-1 animate-fade-in">
                                  {altLoading ? (
                                    <div className="flex items-center gap-2 text-gray-500 font-body py-1">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching alternative...
                                    </div>
                                  ) : altError ? (
                                    <p className="text-red-500 font-semibold font-body py-1">{altError}</p>
                                  ) : alternativeData ? (
                                    <AlternativeDetails data={alternativeData} />
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-mist text-center">
              <button
                onClick={() => navigate('/app/dashboard')}
                className="text-[10px] font-mono font-bold text-forest hover:text-forest-dark uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-forest/20 rounded px-1 cursor-pointer"
              >
                View History
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
        {[
          { Icon: ShieldCheck, title: 'Secure Transmission', text: 'All uploads are processed directly in your server. Files reside only in memory storage and never hit local disk.' },
          { Icon: CheckCheck,  title: 'Local Processing', text: 'No third-party paid APIs. Barcode and text recognition are executed locally using free libraries.' },
          { Icon: FileSearch,  title: 'Structure Parsing',   text: 'Extracted raw OCR string gets mapped to structured receipts, flight ticket information, or product names.' },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="bg-white border border-mist rounded-xl p-6 shadow-sm">
            <Icon className="w-5 h-5 text-gray-500 mb-4" />
            <span className="font-display font-bold text-ink text-sm mb-2 block">{title}</span>
            <p className="font-body text-xs text-gray-500 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlternativeDetails({ data }) {
  if (!data) return null;
  const { hasAlternative, suggestion, message, currentCo2Kg, alternativeCo2Kg, savingsKg, savingsPercent, tip, note, currentCo2PerKg, alternativeCo2PerKg } = data;

  if (!hasAlternative) {
    return (
      <div className="text-gray-500 italic py-1 font-body text-left">
        {message || "No alternative suggestion available for this scan."}
      </div>
    );
  }

  // Check if it's the receipt-type tip (no numbers)
  if (tip) {
    return (
      <div className="flex flex-col gap-2 font-body text-left">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">
          <p className="font-bold text-xs uppercase tracking-wider mb-1">🌿 Smart Swaps Tip</p>
          <p className="text-xs leading-relaxed">{tip}</p>
        </div>
        {note && <p className="text-[10px] text-gray-400 italic mt-0.5">{note}</p>}
      </div>
    );
  }

  // It's a calculated numerical suggestion (product, flight, barcode)
  const isBarcodeSwap = currentCo2PerKg !== undefined;

  return (
    <div className="flex flex-col gap-3 font-body text-left">
      <div className="bg-green-50 border border-green-200 text-[#14231B] rounded-lg p-3">
        <p className="font-bold text-xs uppercase tracking-wider text-green-700 mb-1">🌿 Carbon Swap Recommendation</p>
        <p className="font-bold text-sm mb-1">{suggestion}</p>
        {message && <p className="text-xs text-gray-600 leading-relaxed mb-2">{message}</p>}
        
        <div className="flex items-center justify-between border-t border-green-200/60 pt-2.5 mt-2 flex-wrap gap-2">
          {/* Numbers */}
          <div className="flex items-center gap-2.5 text-xs text-gray-500 font-mono">
            {isBarcodeSwap ? (
              <>
                <span className="line-through">{currentCo2PerKg} kg CO₂/kg</span>
                <span>→</span>
                <span className="font-bold text-green-700">{alternativeCo2PerKg} kg CO₂/kg</span>
              </>
            ) : (
              <>
                <span className="line-through">{currentCo2Kg} kg</span>
                <span>→</span>
                <span className="font-bold text-green-700">{alternativeCo2Kg} kg</span>
              </>
            )}
          </div>
          {/* Highlighted Percent */}
          {savingsPercent !== undefined && (
            <span className="bg-green-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {savingsPercent}% less CO₂
            </span>
          )}
        </div>
      </div>
      {note && <p className="text-[10px] text-gray-400 italic mt-0.5">{note}</p>}
    </div>
  );
}
