import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import api from '../lib/api';
import { useScanStats } from '../context/ScanStatsContext.jsx';

/**
 * PrivacyDataControls Component
 *
 * Provides a clean privacy utility for visitors:
 * 1. Export Data to CSV (for spreadsheets)
 * 2. Export Data to JSON (full raw archive)
 * 3. One-Click Clear All Data (permanent wipe) with confirmation modal
 */
export default function PrivacyDataControls({ onClearSuccess, className = '', compact = false }) {
  const { refreshStats } = useScanStats();
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Trigger file download
  const handleExport = async (format) => {
    setExportingFormat(format);
    setStatusMessage(null);
    try {
      const response = await api.get(`/scans/export?format=${format}`, {
        responseType: 'blob'
      });

      const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
      const extension = format === 'csv' ? 'csv' : 'json';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `climate-lens-scans-${dateStr}.${extension}`;

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatusMessage({ type: 'success', text: `Downloaded ${filename}` });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('[Privacy Controls] Export failed:', err);
      setStatusMessage({ type: 'error', text: 'Export failed. Please try again.' });
    } finally {
      setExportingFormat(null);
    }
  };

  // Wipe all scans from database
  const handleClearAll = async () => {
    setClearing(true);
    try {
      await api.delete('/scans');
      setShowClearModal(false);
      refreshStats();
      if (onClearSuccess) onClearSuccess();
      setStatusMessage({ type: 'success', text: 'All scan history has been wiped.' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('[Privacy Controls] Clear all failed:', err);
      setStatusMessage({ type: 'error', text: 'Failed to clear data. Please try again.' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={`font-body ${className}`}>
      {/* Action Buttons Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Export CSV */}
        <button
          type="button"
          onClick={() => handleExport('csv')}
          disabled={exportingFormat !== null || clearing}
          title="Download scans as CSV for spreadsheet analysis"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-mist hover:border-forest/40 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {exportingFormat === 'csv' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-forest" />
          )}
          <span>Export CSV</span>
        </button>

        {/* Export JSON */}
        <button
          type="button"
          onClick={() => handleExport('json')}
          disabled={exportingFormat !== null || clearing}
          title="Download complete raw JSON archive"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-mist hover:border-forest/40 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {exportingFormat === 'json' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-forest" />
          )}
          <span>Export JSON</span>
        </button>

        {/* Clear All Data */}
        <button
          type="button"
          onClick={() => setShowClearModal(true)}
          disabled={exportingFormat !== null || clearing}
          title="Permanently wipe all stored scan data"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          <span>Clear All Data</span>
        </button>
      </div>

      {/* Temporary Feedback Notification */}
      {statusMessage && (
        <div
          className={`mt-2 text-[11px] font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${
            statusMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ── ONE-CLICK CLEAR CONFIRMATION MODAL ── */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white border border-mist rounded-2xl max-w-md w-full shadow-2xl p-6 relative font-body">
            <button
              onClick={() => setShowClearModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink">
                  Clear All Stored Scans?
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Climate Lens operates privacy-first without requiring accounts. Wiping your data will permanently delete all scan records, item breakdowns, and carbon scores from this browser session.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Tip:</strong> You can export your scans to CSV or JSON before clearing if you'd like a personal backup.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Wiping Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Yes, Clear All Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
