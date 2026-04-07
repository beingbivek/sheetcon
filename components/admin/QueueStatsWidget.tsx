// components/admin/QueueStatsWidget.tsx

'use client';

import { useEffect, useState } from 'react';

interface QueueStats {
  queueLength: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  readRequestsInWindow: number;
  writeRequestsInWindow: number;
  userCounts: Record<string, number>;
}

export default function QueueStatsWidget() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/queue-stats');
      
      if (!res.ok) {
        throw new Error('Failed to fetch queue stats');
      }
      
      const data = await res.json();
      setStats(data.stats);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'text-green-400';
      case 'OPEN': return 'text-red-400';
      case 'HALF_OPEN': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getCircuitBreakerBg = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'bg-green-500/20';
      case 'OPEN': return 'bg-red-500/20';
      case 'HALF_OPEN': return 'bg-yellow-500/20';
      default: return 'bg-slate-500/20';
    }
  };

  const getUsageColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <h3 className="text-lg font-semibold text-white">Loading Queue Stats...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg border border-red-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">⚠️ API Queue Status</h3>
          <button 
            onClick={fetchStats}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
          >
            Retry
          </button>
        </div>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <h3 className="text-lg font-semibold text-white">Google Sheets API Queue</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs text-slate-400">Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Queue Length */}
        <div className="bg-slate-900 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Queue</p>
          <p className="text-3xl font-bold text-white">{stats.queueLength}</p>
          <p className="text-slate-500 text-xs mt-1">pending requests</p>
        </div>

        {/* Circuit Breaker */}
        <div className="bg-slate-900 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Circuit</p>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${getCircuitBreakerColor(stats.circuitBreakerState)}`}>
              {stats.circuitBreakerState}
            </span>
          </div>
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${getCircuitBreakerBg(stats.circuitBreakerState)} ${getCircuitBreakerColor(stats.circuitBreakerState)}`}>
            {stats.circuitBreakerState === 'CLOSED' ? '✓ Healthy' : 
             stats.circuitBreakerState === 'OPEN' ? '✗ Blocked' : '⚡ Testing'}
          </span>
        </div>

        {/* Reads */}
        <div className="bg-slate-900 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Reads/min</p>
          <p className="text-3xl font-bold text-blue-400">{stats.readRequestsInWindow}</p>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getUsageColor(stats.readRequestsInWindow, 280)}`}
              style={{ width: `${Math.min(100, (stats.readRequestsInWindow / 280) * 100)}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">of 280 limit</p>
        </div>

        {/* Writes */}
        <div className="bg-slate-900 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Writes/min</p>
          <p className="text-3xl font-bold text-purple-400">{stats.writeRequestsInWindow}</p>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getUsageColor(stats.writeRequestsInWindow, 55)}`}
              style={{ width: `${Math.min(100, (stats.writeRequestsInWindow / 55) * 100)}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">of 55 limit</p>
        </div>
      </div>

      {/* User Activity */}
      {Object.keys(stats.userCounts).length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Active Users in Queue</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.userCounts).map(([userId, count]) => (
              <span 
                key={userId} 
                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs"
              >
                <span className="text-slate-300">{userId.slice(0, 8)}...</span>
                <span className="text-blue-400 font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>&lt;70% usage</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span>70-90% usage</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>&gt;90% usage</span>
          </div>
        </div>
      </div>
    </div>
  );
}