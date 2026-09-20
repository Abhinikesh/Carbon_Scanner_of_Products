import React, { useState, useEffect } from 'react';
import {
  BarChart2, Leaf, Zap, Award, CloudUpload,
  CheckCircle2, Clock, TrendingDown, X, Recycle, Loader2,
  Car, Trees, Smartphone, Lightbulb, Globe, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, Area, AreaChart, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import { useScanStats } from '../context/ScanStatsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api';
import Spinner from '../components/common/Spinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ScoreBadge from '../components/common/ScoreBadge.jsx';
import { BADGE_CATALOG } from '../data/badgeCatalog.js';
import { AlternativeDetails } from './UploadCenter.jsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-mist rounded-xl px-4 py-2 shadow-sm font-body">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-bold text-forest text-sm">
          <span className="font-mono tabular-nums">{payload[0].value}</span> kg CO₂e
        </p>
      </div>
    );
  }
  return null;
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, isLoading, refreshStats } = useScanStats();
  const { user } = useAuth();
  
  const [selectedRange, setSelectedRange] = useState('6m'); // '3m', '6m', '1y'
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(true);

  useEffect(() => {
    refreshStats();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchChart = async () => {
      setChartLoading(true);
      try {
        const res = await api.get(`/scans/chart?range=${selectedRange}`);
        if (active && res.data && res.data.success) {
          setChartData(res.data.data);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch chart data:', err);
      } finally {
        if (active) setChartLoading(false);
      }
    };
    fetchChart();
    return () => {
      active = false;
    };
  }, [selectedRange]);

  useEffect(() => {
    let active = true;
    const fetchScans = async () => {
      setScansLoading(true);
      try {
        const res = await api.get('/scans?limit=5');
        if (active) {
          setScans(res.data || []);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch recent scans:', err);
      } finally {
        if (active) setScansLoading(false);
      }
    };
    fetchScans();
    return () => {
      active = false;
    };
  }, []);

  const [activeAlternativeScan, setActiveAlternativeScan] = useState(null);
  const [altData, setAltData] = useState(null);
  const [altLoading, setAltLoading] = useState(false);
  const [altError, setAltError] = useState(null);

  async function handleShowAlternative(scan) {
    setActiveAlternativeScan(scan);
    setAltData(null);
    setAltError(null);
    setAltLoading(true);

    try {
      const res = await api.get(`/scans/${scan._id}/alternative`);
      if (res.data && res.data.success) {
        setAltData(res.data);
      } else {
        setAltError(res.data?.message || 'Failed to load alternative suggestion.');
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch alternative:', err);
      setAltError(err.response?.data?.message || err.message || 'Failed to load alternative suggestion.');
    } finally {
      setAltLoading(false);
    }
  }

  const displayTotalScans = stats?.totalScans ?? 0;
  const displayTotalCo2 = stats?.totalCo2Kg ?? 0;
  const displayThisMonth = stats?.thisMonthCo2Kg ?? 0;
  const displayScore = stats?.sustainabilityScore !== null && stats?.sustainabilityScore !== undefined
    ? `${stats.sustainabilityScore}/100`
    : '—';

  const co2Num = typeof displayTotalCo2 === 'number' ? displayTotalCo2 : parseFloat(displayTotalCo2) || 0;
  const kmDriven = Math.round(co2Num / 0.25);
  const milesDriven = Math.round(kmDriven * 0.621371);
  const treesNeeded = co2Num > 0 ? (co2Num / 21.77).toFixed(1) : '0';
  const smartphoneCharges = Math.round(co2Num * 121.6);
  const ledYears = co2Num > 0 ? (co2Num / 116).toFixed(1) : '0';

  return (
    <div className="px-10 pt-8 pb-10 bg-paper">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[36px] font-bold text-ink leading-tight mb-1 font-display">Dashboard</h1>
          <p className="text-gray-500 text-sm font-body">Your personal carbon intelligence overview.</p>
        </div>
        <button
          onClick={() => navigate('/app/upload-center')}
          className="flex items-center gap-2 bg-forest hover:bg-forest-dark text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors font-body focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <CloudUpload className="w-4 h-4" /> New Scan
        </button>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Scans */}
        <div className="bg-white border border-mist rounded-xl p-5 shadow-sm">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-blue-50 text-blue-600">
            <BarChart2 className="w-[18px] h-[18px]" />
          </div>
          <p className="text-2xl font-bold text-ink font-mono tabular-nums">
            {isLoading && stats === null ? '—' : displayTotalScans}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-body">Total Scans</p>
        </div>

        {/* Total CO2 Tracked */}
        <div className="bg-white border border-mist rounded-xl p-5 shadow-sm">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-green-50 text-forest">
            <Leaf className="w-[18px] h-[18px]" />
          </div>
          <p className="text-2xl font-bold text-ink font-mono tabular-nums">
            {isLoading && stats === null ? '—' : displayTotalCo2}
            <span className="text-sm font-sans font-medium text-gray-500"> kg</span>
          </p>
          <p className="text-xs text-gray-500 mt-1 font-body">Total CO₂ Tracked</p>
        </div>

        {/* This Month */}
        <div className="bg-white border border-mist rounded-xl p-5 shadow-sm">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-yellow-50 text-yellow-600">
            <Zap className="w-[18px] h-[18px]" />
          </div>
          <p className="text-2xl font-bold text-ink font-mono tabular-nums">
            {isLoading && stats === null ? '—' : displayThisMonth}
            <span className="text-sm font-sans font-medium text-gray-500"> kg</span>
          </p>
          <p className="text-xs text-gray-500 mt-1 font-body">This Month</p>
        </div>

        {/* Sustainability Score */}
        <div className="bg-white border border-mist rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-purple-50 text-purple-600">
              <Award className="w-[18px] h-[18px]" />
            </div>
            <p className="text-2xl font-bold text-ink font-mono tabular-nums">
              {isLoading && stats === null ? '—' : displayScore}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-body">Sustainability Score</p>
          </div>
          {(!isLoading || stats !== null) && stats?.sustainabilityScore === null && (
            <p className="text-[10px] text-gray-400 mt-2 font-body leading-tight">
              Not enough data yet — scan something to get your first score.
            </p>
          )}
        </div>

        {/* Current Streak */}
        <div className="bg-white border border-mist rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-orange-50 text-orange-600">
              <Flame className="w-[18px] h-[18px] text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-ink font-mono tabular-nums">
              {user?.currentStreakDays ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-body">Current Streak</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-body leading-tight">
            {user?.currentStreakDays > 0 ? `${user.currentStreakDays} day streak!` : 'Start your streak today'}
          </p>
        </div>
      </div>

      {/* Real-World Carbon Equivalents */}
      <div className="bg-white border border-mist rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="font-display font-bold text-ink text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-forest" /> Real-World Carbon Equivalents
            </h2>
            <p className="text-xs text-gray-500 font-body mt-0.5">
              What your <span className="font-mono font-bold text-ink">{displayTotalCo2} kg</span> CO₂e footprint translates to in tangible physical benchmarks.
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold text-forest bg-forest/5 border border-forest/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
            EPA & DEFRA Benchmarks
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Driving */}
          <div className="bg-paper border border-mist rounded-xl p-4 flex flex-col justify-between hover:border-blue-200 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-600 font-display">Miles Driven</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                  <Car className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-ink font-mono tabular-nums">
                ~{kmDriven.toLocaleString()} <span className="text-xs font-sans font-medium text-gray-500">km</span>
              </p>
            </div>
            <p className="text-[11px] text-gray-500 font-body mt-2 leading-tight">
              Equivalent to driving ~{milesDriven.toLocaleString()} miles in an average petrol car.
            </p>
          </div>

          {/* Card 2: Trees */}
          <div className="bg-paper border border-mist rounded-xl p-4 flex flex-col justify-between hover:border-emerald-200 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-600 font-display">Trees Needed</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-forest">
                  <Trees className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-ink font-mono tabular-nums">
                ~{treesNeeded} <span className="text-xs font-sans font-medium text-gray-500">trees</span>
              </p>
            </div>
            <p className="text-[11px] text-gray-500 font-body mt-2 leading-tight">
              Requires ~{treesNeeded} mature trees for an entire year to offset.
            </p>
          </div>

          {/* Card 3: Smartphone charges */}
          <div className="bg-paper border border-mist rounded-xl p-4 flex flex-col justify-between hover:border-amber-200 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-600 font-display">Smartphone Charges</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-ink font-mono tabular-nums">
                ~{smartphoneCharges.toLocaleString()}
              </p>
            </div>
            <p className="text-[11px] text-gray-500 font-body mt-2 leading-tight">
              Equivalent to ~{smartphoneCharges.toLocaleString()} full smartphone charges.
            </p>
          </div>

          {/* Card 4: LED bulbs */}
          <div className="bg-paper border border-mist rounded-xl p-4 flex flex-col justify-between hover:border-indigo-200 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-600 font-display">LED Bulb Runtime</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                  <Lightbulb className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-ink font-mono tabular-nums">
                ~{ledYears} <span className="text-xs font-sans font-medium text-gray-500">years</span>
              </p>
            </div>
            <p className="text-[11px] text-gray-500 font-body mt-2 leading-tight">
              Powers a standard 10W LED bulb continuously 24/7.
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-mist rounded-xl p-6 mb-6 shadow-sm relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-ink">Carbon Over Time</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-body">Monthly CO₂e emissions (kg)</p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: '3m', label: '3M' },
              { id: '6m', label: '6M' },
              { id: '1y', label: '1Y' }
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setSelectedRange(id)}
                className={`text-xs font-semibold px-3 py-1 rounded-md transition-all font-body ${selectedRange === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                 {label}
              </button>
            ))}
          </div>
        </div>
        
        <div className={`transition-opacity duration-200 ${chartLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1a3d2b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1a3d2b" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="co2Kg" stroke="#1a3d2b" strokeWidth={2.5}
                fill="url(#co2Grad)" dot={{ r: 4, fill: '#1a3d2b', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#00c896', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {chartLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px] pointer-events-none">
            <div className="w-6 h-6 border-2 border-forest border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Recent Scans */}
      <div className="bg-white border border-mist rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-ink">Recent Scans</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/app/history')} className="text-xs text-[#1a7a4a] font-semibold hover:text-forest transition-colors font-body focus:outline-none focus:ring-2 focus:ring-forest/20 rounded">View All →</button>
            <button onClick={() => navigate('/app/upload-center')} className="text-xs text-[#1a7a4a] font-semibold hover:text-forest transition-colors font-body focus:outline-none focus:ring-2 focus:ring-forest/20 rounded">+ New Scan</button>
          </div>
        </div>

        {scansLoading ? (
          <Spinner size="medium" />
        ) : scans.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="No scans yet"
            description="Head to Upload Center to add your first product, receipt, flight ticket, or barcode scan."
            actionLabel="Go to Upload Center"
            onAction={() => navigate('/app/upload-center')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="text-left text-xs text-gray-400 font-semibold border-b border-mist/50">
                  <th className="pb-3 pr-4 font-display">File</th>
                  <th className="pb-3 pr-4 font-display">Category</th>
                  <th className="pb-3 pr-4 font-display">CO₂</th>
                  <th className="pb-3 pr-4 font-display">Score</th>
                  <th className="pb-3 pr-4 font-display">Status</th>
                  <th className="pb-3 font-display">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist/30">
                {scans.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-forest rounded-lg flex items-center justify-center flex-shrink-0">
                          <TrendingDown className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900 truncate max-w-[140px]" title={s.type === 'barcode' ? `Barcode: ${s.barcodeValue || '—'}` : s.originalFilename}>
                          {s.type === 'barcode' ? `Barcode: ${s.barcodeValue || '—'}` : s.originalFilename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      <div className="text-gray-900 font-semibold truncate max-w-[120px]">{s.category || 'Pending'}</div>
                      {s.status === 'ocr_done' && (
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {s.type !== 'flight' && s.category && (
                            <button
                              onClick={() => navigate(`/app/recycle?query=${encodeURIComponent(s.category)}&scanId=${s._id}`)}
                              className="text-[10px] text-[#1a7a4a] hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                            >
                              <Recycle className="w-2.5 h-2.5" /> Disposal
                            </button>
                          )}
                          <button
                            onClick={() => handleShowAlternative(s)}
                            className="text-[10px] text-[#1a7a4a] hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                          >
                            <Leaf className="w-2.5 h-2.5" /> Alternative
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-900">
                      <span className="font-mono font-bold tabular-nums">
                        {s.co2Kg != null ? s.co2Kg : '—'}
                      </span>
                      {s.co2Kg != null && <span className="font-mono text-xs text-gray-500 ml-0.5"> kg</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <ScoreBadge score={s.score} />
                    </td>
                    <td className="py-3 pr-4">
                      {s.status === 'ocr_done' ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : s.status === 'processing' ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium">
                          <Clock className="w-3.5 h-3.5 animate-spin" /> Processing
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                          <X className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-gray-400 font-mono tabular-nums">
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Achievements Section */}
      <div className="bg-white border border-mist rounded-xl p-6 shadow-sm mt-6">
        <h2 className="font-display font-bold text-ink mb-5 text-sm uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-forest" /> Sustainability Achievements
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {BADGE_CATALOG.map((badge) => {
            const isEarned = user?.badges?.includes(badge.key);
            return (
              <div
                key={badge.key}
                className={`relative group flex flex-col items-center justify-center p-4 border rounded-2xl transition-all text-center cursor-help ${
                  isEarned
                    ? 'border-forest/20 bg-forest/5 text-ink opacity-100 shadow-sm'
                    : 'border-mist bg-gray-50/50 text-gray-400 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2 select-none filter transition-all duration-300 group-hover:scale-110">
                  {badge.emoji}
                </div>
                <span className="font-display font-bold text-[11px] leading-tight block">
                  {badge.label}
                </span>
                
                {/* Tooltip on Hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 text-white text-[10px] p-2.5 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none text-center">
                  <p className="font-bold mb-0.5">{badge.description}</p>
                  <p className="text-gray-400 text-[9px]">{badge.condition}</p>
                  {!isEarned && (
                    <span className="text-amber-500 font-bold block mt-1 uppercase tracking-wider text-[8px]">
                      Locked
                    </span>
                  )}
                  {isEarned && (
                    <span className="text-green-400 font-bold block mt-1 uppercase tracking-wider text-[8px]">
                      Unlocked!
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Greener Alternative Modal Overlay */}
      {activeAlternativeScan && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-mist rounded-2xl max-w-md w-full shadow-2xl p-6 relative font-body">
            <button
              onClick={() => setActiveAlternativeScan(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none"
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
    </div>
  );
}
