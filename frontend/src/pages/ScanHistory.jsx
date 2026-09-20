import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, TrendingDown, CheckCircle2, Clock, X,
  Leaf, Recycle, Loader2, ChevronDown, Filter, Search,
  SortAsc, SortDesc, CloudUpload, Trash2,
  ShoppingBag, Receipt, Plane, Barcode, AlertTriangle
} from 'lucide-react';
import api from '../lib/api';
import { useScanStats } from '../context/ScanStatsContext.jsx';
import Spinner from '../components/common/Spinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import ScoreBadge from '../components/common/ScoreBadge.jsx';
import { AlternativeDetails } from './UploadCenter.jsx';
import ReceiptBreakdown from '../components/ReceiptBreakdown.jsx';

const TYPE_LABELS = { product: 'Product', receipt: 'Receipt', flight: 'Flight', barcode: 'Barcode' };

function TypeIcon({ type, className = "w-4 h-4" }) {
  if (type === 'receipt') return <Receipt className={`${className} text-forest`} />;
  if (type === 'flight') return <Plane className={`${className} text-blue-600`} />;
  if (type === 'barcode') return <Barcode className={`${className} text-purple-600`} />;
  return <ShoppingBag className={`${className} text-emerald-600`} />;
}

const STATUS_OPTIONS = ['all', 'ocr_done', 'processing', 'failed'];
const TYPE_OPTIONS = ['all', 'product', 'receipt', 'flight', 'barcode'];
const PAGE_SIZE = 15;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }) {
  if (status === 'ocr_done') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-body">
      <CheckCircle2 className="w-2.5 h-2.5" /> Done
    </span>
  );
  if (status === 'processing') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-body">
      <Clock className="w-2.5 h-2.5 animate-spin" /> Processing
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full font-body">
      <X className="w-2.5 h-2.5" /> Failed
    </span>
  );
}

export default function ScanHistory() {
  const navigate = useNavigate();
  const { refreshStats } = useScanStats();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first

  // Alternative modal
  const [activeAltScan, setActiveAltScan] = useState(null);
  const [altData, setAltData] = useState(null);
  const [altLoading, setAltLoading] = useState(false);
  const [altError, setAltError] = useState(null);

  // Multi-item Receipt Breakdown modal
  const [activeBreakdownScan, setActiveBreakdownScan] = useState(null);

  async function fetchScans(reset = false) {
    const isReset = reset;
    if (isReset) {
      setLoading(true);
      setScans([]);
      setPage(1);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const currentPage = isReset ? 1 : page;
      // Fetch a larger batch and do client-side filtering/sorting for now
      const res = await api.get(`/scans?limit=50`);
      let data = res.data || [];

      if (isReset) {
        setTotalLoaded(data.length);
        setScans(data);
        setHasMore(data.length === 50); // may have more
        setPage(2);
      } else {
        // For now we have all data — pagination UI is there for UX
        setHasMore(false);
      }
    } catch (err) {
      console.error('[ScanHistory] fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load scan history.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchScans(true);
  }, []);

  // Client-side filter + search + sort
  const filtered = scans
    .filter(s => typeFilter === 'all' || s.type === typeFilter)
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
    .filter(s => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (s.originalFilename || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.barcodeValue || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt);
      const db = new Date(b.createdAt);
      return sortOrder === 'desc' ? db - da : da - db;
    });

  async function handleShowAlternative(scan) {
    setActiveAltScan(scan);
    setAltData(null);
    setAltError(null);
    setAltLoading(true);
    try {
      const res = await api.get(`/scans/${scan._id}/alternative`);
      if (res.data?.success) setAltData(res.data);
      else setAltError(res.data?.message || 'Failed to load suggestion.');
    } catch (err) {
      setAltError(err.response?.data?.message || err.message || 'Failed to load suggestion.');
    } finally {
      setAltLoading(false);
    }
  }

  async function handleDelete(scanId) {
    if (!window.confirm('Delete this scan? This cannot be undone.')) return;
    setDeletingId(scanId);
    try {
      await api.delete(`/scans/${scanId}`);
      setScans(prev => prev.filter(s => s._id !== scanId));
      refreshStats();
    } catch (err) {
      console.error('[ScanHistory] delete error:', err);
      alert(err.response?.data?.message || 'Failed to delete scan.');
    } finally {
      setDeletingId(null);
    }
  }

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || search.trim();

  return (
    <div className="px-6 md:px-10 pt-8 pb-16 bg-paper min-h-screen">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-ink leading-tight mb-1 font-display">Scan History</h1>
          <p className="text-gray-500 text-sm font-body">All your carbon scans in one place.</p>
        </div>
        <button
          onClick={() => navigate('/app/upload-center')}
          className="flex items-center gap-2 bg-forest hover:bg-forest-dark text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors font-body focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <CloudUpload className="w-4 h-4" /> New Scan
        </button>
      </header>

      {/* Toolbar */}
      <div className="bg-white border border-mist rounded-2xl p-4 mb-5 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-mist rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-forest/20 font-body placeholder:text-gray-400"
          />
        </div>

        {/* Type filter */}
        <div className="relative">
          <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="pl-7 pr-8 py-2 text-sm border border-mist rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-forest/20 font-body text-gray-700 appearance-none cursor-pointer"
          >
            {TYPE_OPTIONS.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All Types' : TYPE_LABELS[t]}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-mist rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-forest/20 font-body text-gray-700 appearance-none cursor-pointer"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s === 'ocr_done' ? 'Done' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-mist rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors font-body"
          title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        >
          {sortOrder === 'desc' ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setSearch(''); }}
            className="text-xs font-bold text-forest hover:text-forest-dark transition-colors font-body"
          >
            Clear filters
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-gray-400 font-body font-mono">
          {filtered.length} scan{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <Spinner size="large" />
      ) : filtered.length === 0 ? (
        hasActiveFilters ? (
          <div className="text-center py-16 text-gray-400 font-body">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">No scans match your filters</p>
            <button
              onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setSearch(''); }}
              className="mt-3 text-xs text-forest font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <EmptyState
            icon={BarChart2}
            title="No scans yet"
            description="Head to Upload Center to add your first product, receipt, flight ticket, or barcode scan."
            actionLabel="Go to Upload Center"
            onAction={() => navigate('/app/upload-center')}
          />
        )
      ) : (
        <>
          {/* Scan Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(scan => (
              <ScanCard
                key={scan._id}
                scan={scan}
                onAlternative={() => handleShowAlternative(scan)}
                onBreakdown={() => setActiveBreakdownScan(scan)}
                onRecycle={() => navigate(`/app/recycle?query=${encodeURIComponent(scan.category || '')}&scanId=${scan._id}`)}
                onDelete={() => handleDelete(scan._id)}
                isDeleting={deletingId === scan._id}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => fetchScans(false)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-mist hover:border-forest/30 text-ink font-bold text-xs rounded-xl shadow-sm transition-all font-body disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {/* Alternative Modal */}
      {activeAltScan && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-mist rounded-2xl max-w-md w-full shadow-2xl p-6 relative font-body">
            <button
              onClick={() => setActiveAltScan(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold text-lg text-ink mb-4">Greener Alternative</h3>
            {altLoading ? (
              <div className="flex items-center gap-2 text-gray-500 py-6 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" /> Fetching suggestion...
              </div>
            ) : altError ? (
              <div className="text-red-500 font-semibold py-4 text-center">{altError}</div>
            ) : (
              <AlternativeDetails data={altData} />
            )}
          </div>
        </div>
      )}

      {/* Multi-Item Receipt Breakdown Modal */}
      {activeBreakdownScan && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white border border-mist rounded-2xl max-w-lg w-full shadow-2xl p-6 relative font-body max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveBreakdownScan(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-forest" />
              <h3 className="font-display font-bold text-lg text-ink">Multi-Item Receipt Breakdown</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {activeBreakdownScan.parsedFields?.storeName || activeBreakdownScan.originalFilename || 'Grocery Receipt'}
              {activeBreakdownScan.parsedFields?.totalAmount != null && ` • Total: $${activeBreakdownScan.parsedFields.totalAmount.toFixed(2)}`}
            </p>
            <ReceiptBreakdown breakdown={activeBreakdownScan.calculationDetails?.receiptBreakdown} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScanCard({ scan, onAlternative, onBreakdown, onRecycle, onDelete, isDeleting }) {
  const isBarcode = scan.type === 'barcode';
  const displayName = isBarcode
    ? `Barcode: ${scan.barcodeValue || '—'}`
    : (scan.originalFilename || 'Untitled');

  return (
    <div className="bg-white border border-mist rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-forest/20 transition-all flex flex-col gap-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 bg-forest/5 rounded-xl flex items-center justify-center flex-shrink-0">
            <TypeIcon type={scan.type} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs text-ink font-display truncate leading-tight" title={displayName}>
              {displayName}
            </p>
            <p className="text-[10px] text-gray-400 font-body uppercase tracking-wider mt-0.5">
              {TYPE_LABELS[scan.type] || scan.type}
            </p>
          </div>
        </div>
        <StatusPill status={scan.status} />
      </div>

      {/* Emission data */}
      {scan.status === 'ocr_done' && (
        <div className="bg-gray-50 border border-mist/50 rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-body">Category</p>
            <p className="text-xs font-bold text-ink font-display mt-0.5 truncate max-w-[130px]">
              {scan.category || 'Unknown'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-body">CO₂</p>
            <p className="text-sm font-bold text-forest font-mono tabular-nums mt-0.5">
              {scan.co2Kg != null ? `${scan.co2Kg} kg` : '—'}
            </p>
          </div>
          <ScoreBadge score={scan.score} />
        </div>
      )}

      {/* Prominent #1 Carbon Offender snippet for receipts */}
      {scan.status === 'ocr_done' && scan.type === 'receipt' && scan.calculationDetails?.receiptBreakdown?.topOffender && (
        <div className="flex items-center gap-1.5 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
          <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0" />
          <span className="truncate">
            #1 Offender: <strong>{scan.calculationDetails.receiptBreakdown.topOffender.name}</strong> ({scan.calculationDetails.receiptBreakdown.topOffender.co2Kg} kg • {scan.calculationDetails.receiptBreakdown.topOffender.percentage}%)
          </span>
        </div>
      )}

      {/* Date */}
      <div className="flex items-center justify-between mt-auto">
        <p className="text-[10px] text-gray-400 font-mono">{formatDate(scan.createdAt)}</p>

        {/* Action links */}
        {scan.status === 'ocr_done' && (
          <div className="flex items-center gap-3">
            {scan.type === 'receipt' && scan.calculationDetails?.receiptBreakdown && (
              <button
                onClick={onBreakdown}
                className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Receipt className="w-2.5 h-2.5" /> Breakdown
              </button>
            )}
            {scan.type !== 'flight' && scan.category && (
              <button
                onClick={onRecycle}
                className="text-[10px] font-bold text-[#1a7a4a] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Recycle className="w-2.5 h-2.5" /> Recycle
              </button>
            )}
            <button
              onClick={onAlternative}
              className="text-[10px] font-bold text-[#1a7a4a] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Leaf className="w-2.5 h-2.5" /> Alternative
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
