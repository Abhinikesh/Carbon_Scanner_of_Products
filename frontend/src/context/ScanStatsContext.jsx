import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const ScanStatsContext = createContext(null);

export function ScanStatsProvider({ children }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/scans/stats');
      if (res.data) {
        setStats({
          totalScans: res.data.totalScans,
          totalCo2Kg: res.data.totalCo2Kg,
          thisMonthCo2Kg: res.data.thisMonthCo2Kg,
          sustainabilityScore: res.data.sustainabilityScore
        });
      }
    } catch (err) {
      console.error('[ScanStatsContext] Failed to fetch stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <ScanStatsContext.Provider value={{ stats, isLoading, refreshStats: fetchStats }}>
      {children}
    </ScanStatsContext.Provider>
  );
}

export function useScanStats() {
  const context = useContext(ScanStatsContext);
  if (!context) {
    throw new Error('useScanStats must be used within a ScanStatsProvider');
  }
  return context;
}
