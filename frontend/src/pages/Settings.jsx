import React, { useState, useEffect } from 'react';
import { Bell, Scale, Database, Save, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import ErrorBanner from '../components/common/ErrorBanner.jsx';

export default function Settings() {
  // Read local preferences or defaults
  const [pushNotifications, setPushNotifications] = useState(() => {
    const saved = localStorage.getItem('cl_push_notifications');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [units, setUnits] = useState(() => {
    return localStorage.getItem('cl_units') || 'metric';
  });

  const [database, setDatabase] = useState(() => {
    return localStorage.getItem('cl_database') || 'defra_epa';
  });
  
  // UX states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setShowSavedMsg(false);

    try {
      // Persist preferences locally for instant, offline, login-free usage
      localStorage.setItem('cl_push_notifications', JSON.stringify(pushNotifications));
      localStorage.setItem('cl_units', units);
      localStorage.setItem('cl_database', database);

      // Also persist to backend guest preferences if server is reachable
      try {
        await api.put('/users/me', {
          preferences: {
            pushNotifications
          }
        });
      } catch (networkErr) {
        // Backend failure shouldn't block local preferences
      }
      
      setShowSavedMsg(true);
    } catch (err) {
      console.error('[Settings] Save error:', err);
      setSaveError('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  // Fade out saved success text after 3 seconds
  useEffect(() => {
    if (showSavedMsg) {
      const timer = setTimeout(() => setShowSavedMsg(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSavedMsg]);

  return (
    <div className="px-6 md:px-10 pt-8 pb-10 max-w-2xl min-h-screen bg-paper">
      <header className="mb-8">
        <h1 className="text-[32px] font-bold text-ink leading-tight mb-2 font-display">App Preferences</h1>
        <p className="text-gray-500 text-sm font-body">Customize your calculation standards, notifications, and carbon intelligence options.</p>
      </header>

      {saveError && <ErrorBanner message={saveError} />}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Preferences Toggle Card */}
        <div className="bg-white border border-mist rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="font-bold text-ink text-sm font-display">General Preferences</h2>
          
          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-forest/5 rounded-lg flex items-center justify-center">
                <Bell className="w-[18px] h-[18px] text-forest" />
              </div>
              <div>
                <p className="font-semibold text-sm text-ink font-body">Scan Notifications</p>
                <p className="text-xs text-gray-400 font-body">Show toast feedback when an OCR scan finishes calculation</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setPushNotifications(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-forest/20 cursor-pointer ${
                pushNotifications ? 'bg-forest' : 'bg-gray-200'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                pushNotifications ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          <div className="border-t border-mist/50" />

          {/* Unit Preference */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-forest/5 rounded-lg flex items-center justify-center">
                <Scale className="w-[18px] h-[18px] text-forest" />
              </div>
              <div>
                <p className="font-semibold text-sm text-ink font-body">Measurement Units</p>
                <p className="text-xs text-gray-400 font-body">Choose standard units for emission weight displays</p>
              </div>
            </div>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="border border-mist rounded-xl px-3 py-1.5 text-xs text-ink bg-gray-50 focus:outline-none focus:ring-2 focus:ring-forest/20 font-body cursor-pointer"
            >
              <option value="metric">Metric (kg CO₂e)</option>
              <option value="imperial">Imperial (lbs CO₂e)</option>
            </select>
          </div>

          <div className="border-t border-mist/50" />

          {/* Emission Factor Source */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-forest/5 rounded-lg flex items-center justify-center">
                <Database className="w-[18px] h-[18px] text-forest" />
              </div>
              <div>
                <p className="font-semibold text-sm text-ink font-body">Default Factor Source</p>
                <p className="text-xs text-gray-400 font-body">Primary dataset used for emission benchmarks</p>
              </div>
            </div>
            <select
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="border border-mist rounded-xl px-3 py-1.5 text-xs text-ink bg-gray-50 focus:outline-none focus:ring-2 focus:ring-forest/20 font-body cursor-pointer"
            >
              <option value="defra_epa">DEFRA (UK) + EPA (US)</option>
              <option value="fao">FAO Agriculture & Food</option>
              <option value="ghg">GHG Protocol Standard</option>
            </select>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-forest/20 cursor-pointer ${
              showSavedMsg
                ? 'bg-emerald-600 text-white'
                : 'bg-forest hover:bg-forest-dark text-white'
            } disabled:opacity-70`}
          >
            {isSaving ? (
              'Saving...'
            ) : showSavedMsg ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved</>
            ) : (
              <><Save className="w-4 h-4" /> Save Preferences</>
            )}
          </button>
          
          {showSavedMsg && (
            <span className="text-emerald-600 font-semibold text-xs animate-fade-in font-body">
              Preferences updated successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
