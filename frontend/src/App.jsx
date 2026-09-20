import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Leaf, Search, Bell, BarChart2, CloudUpload, LayoutGrid,
  QrCode, X, Recycle, Menu, History
} from 'lucide-react';

import Home         from './pages/Home.jsx';
import UploadCenter from './pages/UploadCenter.jsx';
import RecycleFinder from './pages/RecycleFinder.jsx';
import Dashboard    from './pages/Dashboard.jsx';
import LandingPage  from './pages/LandingPage.jsx';
import ScanHistory  from './pages/ScanHistory.jsx';

import { ScanStatsProvider, useScanStats } from './context/ScanStatsContext.jsx';
import QuickScanModal from './components/QuickScanModal.jsx';

/* ─── NAVBAR ───────────────────────────────────────────────────────────── */
function Navbar({ onMenuClick, onQuickScanClick }) {
  const location  = useLocation();
  const [bellOpen, setBellOpen] = useState(false);
  const [search,   setSearch]   = useState('');
  const bellRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const navLinks = [
    { to: '/app/home',          label: 'Home'          },
    { to: '/app/upload-center', label: 'Upload Center' },
    { to: '/app/recycle',       label: 'Recycle Finder' },
    { to: '/app/dashboard',     label: 'Dashboard'     },
  ];

  const isActive = (to) => {
    if (to === '/app/home') return location.pathname === '/app/home';
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white flex items-center justify-between px-6 z-20 border-b border-mist">
      {/* Hamburger & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 -ml-1 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/app/home" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-forest rounded-md flex items-center justify-center flex-shrink-0">
            <Leaf className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-bold text-[17px] text-ink tracking-tight">Climate Lens</span>
        </Link>
      </div>

      {/* Center nav */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium absolute left-1/2 -translate-x-1/2">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`transition-colors pb-0.5 font-body ${
              isActive(to)
                ? 'text-ink font-semibold border-b-2 border-forest'
                : 'text-[#1a7a4a] hover:opacity-80'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden sm:block relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search data..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-1.5 bg-gray-50 border border-mist rounded-full text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest/20 w-44 placeholder:text-gray-400 transition-all font-body"
          />
          {search && (
            <div className="absolute top-full mt-1 right-0 w-56 bg-white border border-mist rounded-xl shadow-lg z-50 p-3">
              <p className="text-xs text-gray-400 text-center font-body">No results for "{search}"</p>
            </div>
          )}
        </div>

        {/* Bell Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(o => !o)}
            className="text-gray-700 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-forest rounded-full" />
          </button>
          {bellOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-mist rounded-xl shadow-lg z-50 p-4">
              <p className="font-bold text-sm text-gray-900 mb-2 font-display">Notifications</p>
              <p className="text-xs text-gray-400 text-center py-3 font-body">No new notifications</p>
            </div>
          )}
        </div>

        {/* Quick Scan CTA Button */}
        <button
          onClick={onQuickScanClick}
          className="hidden sm:flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all font-body focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Quick Scan</span>
        </button>
      </div>
    </nav>
  );
}

/* ─── SIDEBAR ──────────────────────────────────────────────────────────── */
function Sidebar({ isOpen, onClose, onQuickScanClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, isLoading } = useScanStats();

  const navItems = [
    { to: '/app/home',          label: 'Home',           Icon: BarChart2    },
    { to: '/app/upload-center', label: 'Upload Center',  Icon: CloudUpload  },
    { to: '/app/recycle',       label: 'Recycle Finder', Icon: Recycle      },
    { to: '/app/dashboard',     label: 'Dashboard',      Icon: LayoutGrid   },
    { to: '/app/history',       label: 'Scan History',   Icon: History      },
  ];

  const isActive = (to) => {
    if (to === '/app/home') return location.pathname === '/app/home';
    return location.pathname.startsWith(to);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
        />
      )}
      <aside className={`fixed left-0 top-0 md:top-14 bottom-0 w-[240px] md:w-[210px] bg-paper flex flex-col pt-4 pb-6 border-r border-mist transition-transform duration-300 z-50 md:z-10 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:flex`}>
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between px-5 pb-4 md:hidden border-b border-mist/50 mb-4">
          <span className="font-display font-bold text-base text-ink">Navigation</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sustainability block */}
        <div className="px-5 pt-3 pb-6 flex items-start gap-3">
          <div className="w-9 h-9 bg-forest rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-tight font-display">
              Sustainability<br />Level
            </p>
            <p className="text-sm font-bold text-ink mt-1 font-body">
              Monthly CO2e: <span className="font-mono tabular-nums">
                {isLoading && stats === null ? '—' : `${stats?.thisMonthCo2Kg ?? 0} kg`}
              </span>
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative font-body ${
                isActive(to)
                  ? 'bg-white text-forest font-semibold'
                  : 'text-[#1a7a4a] hover:bg-white/60'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
              {isActive(to) && (
                <span className="absolute right-0 top-2 bottom-2 w-1 bg-forest rounded-l-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Quick Scan */}
        <div className="px-3 mt-auto">
          <button
            onClick={() => {
              onClose?.();
              onQuickScanClick?.();
            }}
            className="w-full bg-forest hover:bg-forest-dark text-white rounded-xl py-3 flex items-center justify-center gap-2.5 font-bold text-sm transition-colors font-body"
          >
            <QrCode className="w-5 h-5" />
            Quick Scan
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── TOAST ────────────────────────────────────────────────────────────── */
export function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all font-body ${type === 'error' ? 'bg-red-500' : 'bg-forest'}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-75"><X className="w-4 h-4" /></button>
    </div>
  );
}

/* ─── LAYOUT WRAPPER ───────────────────────────────────────────────────── */
function AppLayout({ children }) {
  return (
    <ScanStatsProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </ScanStatsProvider>
  );
}

function AppLayoutContent({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="font-body antialiased text-ink">
      <Navbar
        onMenuClick={() => setDrawerOpen(true)}
        onQuickScanClick={() => setIsQuickScanOpen(true)}
      />
      <Sidebar 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onQuickScanClick={() => setIsQuickScanOpen(true)}
      />
      <main className="md:ml-[210px] mt-[56px] min-h-screen bg-paper pb-16 md:pb-0">
        {children}
      </main>
      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-mist flex justify-around py-2 md:hidden z-30">
        {[
          { to: '/app/home',          Icon: BarChart2,   label: 'Home'     },
          { to: '/app/upload-center', Icon: CloudUpload, label: 'Upload'   },
          { to: '/app/recycle',       Icon: Recycle,     label: 'Recycle'  },
          { to: '/app/dashboard',     Icon: LayoutGrid,  label: 'Dashboard'},
          { to: '/app/history',       Icon: History,     label: 'History'  },
        ].map(({ to, Icon, label }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-1 text-[10px] text-gray-400 font-body">
            <Icon className="w-5 h-5" /> {label}
          </Link>
        ))}
      </div>
      
      {/* Quick Scan Modal */}
      <QuickScanModal isOpen={isQuickScanOpen} onClose={() => setIsQuickScanOpen(false)} />
    </div>
  );
}

/* ─── APP ROUTES ────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Redirect removed login/signup routes directly to app */}
      <Route path="/login" element={<Navigate to="/app/home" replace />} />
      <Route path="/signup" element={<Navigate to="/app/home" replace />} />

      {/* Main Application Pages - Completely Open Access */}
      <Route path="/app/home" element={<AppLayout><Home /></AppLayout>} />
      <Route path="/app/upload-center" element={<AppLayout><UploadCenter /></AppLayout>} />
      <Route path="/app/recycle" element={<AppLayout><RecycleFinder /></AppLayout>} />
      <Route path="/app/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
      <Route path="/app/history" element={<AppLayout><ScanHistory /></AppLayout>} />

      {/* Convenient Direct Aliases */}
      <Route path="/upload" element={<Navigate to="/app/upload-center" replace />} />
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/recycle" element={<Navigate to="/app/recycle" replace />} />
      <Route path="/history" element={<Navigate to="/app/history" replace />} />
      <Route path="/leaderboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/app/leaderboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/settings" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/app/settings" element={<Navigate to="/app/dashboard" replace />} />

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
