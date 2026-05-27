import React, { useEffect, useState } from 'react';
import { getCropScans } from '../services/firestore';
import { useTheme } from '../context/ThemeContext';
import { useOffline } from '../hooks/useOffline';
import { timeAgo } from '../utils';
import { parseScanSections } from '../utils/scanParser';

type Scan = {
  id: string;
  disease_name: string;
  crop_type: string;
  has_disease: number;
  severity: string;
  diagnosis: string;
  created_at: string;
  region?: string;
  user_name?: string;
  image_url?: string | null;
  status?: string;
};

type Filter = 'all' | 'disease' | 'healthy' | 'failed';

function ScanCard({ scan, isDark }: { scan: Scan; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isFailed = scan.status === 'failed';

  const overlayBadge = isFailed
    ? 'bg-gray-800/90 text-white'
    : !scan.has_disease
      ? 'bg-emerald-500/90 text-white'
      : scan.severity === 'critical'
        ? 'bg-red-600/90 text-white'
        : 'bg-amber-500/90 text-white';

  const icon = isFailed ? '❌' : !scan.has_disease ? '✅' : scan.severity === 'critical' ? '🚨' : '⚠️';
  const badgeLabel = isFailed ? 'FAILED' : !scan.has_disease ? 'healthy' : scan.severity;

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${
      isDark
        ? isFailed ? 'border-gray-700 bg-night-card opacity-80' : 'border-night-border bg-night-card'
        : isFailed ? 'border-gray-200 bg-gray-50' : 'border-sand bg-white'
    }`}>
      {/* Image area */}
      {scan.image_url ? (
        <div className="relative h-44 overflow-hidden">
          <img
            src={scan.image_url}
            alt="Scanned crop"
            className={`w-full h-full object-cover ${isFailed ? 'grayscale opacity-60' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

          {/* Status badge bottom-left */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize backdrop-blur-sm ${overlayBadge}`}>
              {badgeLabel}
            </span>
          </div>

          {/* Time top-right */}
          <div className="absolute top-3 right-3">
            <span className={`text-xs px-2 py-1 rounded-full backdrop-blur-sm ${isDark ? 'bg-night-card/80 text-night-muted' : 'bg-white/80 text-muted'}`}>
              {timeAgo(scan.created_at)}
            </span>
          </div>

          {/* Failed overlay label */}
          {isFailed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 rounded-xl px-4 py-2 text-center backdrop-blur-sm">
                <p className="text-white text-xs font-bold">AI Unavailable</p>
                <p className="text-white/70 text-[10px]">Quota exceeded</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`h-24 flex items-center justify-center gap-2 ${
          isDark ? 'bg-night-surface' : isFailed ? 'bg-gray-100' : 'bg-sand/30'
        }`}>
          <span className="text-3xl opacity-30">📷</span>
          {isFailed && <span className="text-xs text-red-500 font-medium">Scan failed</span>}
        </div>
      )}

      {/* Info row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-sm truncate ${
              isDark ? (isFailed ? 'text-night-muted' : 'text-night-text') : (isFailed ? 'text-gray-500' : 'text-dark')
            }`}>
              {isFailed
                ? 'Scan Failed'
                : scan.has_disease
                  ? (scan.disease_name || 'Disease Detected')
                  : 'Healthy Plant'}
            </p>
            <div className={`flex flex-wrap gap-2 text-xs mt-1 ${isDark ? 'text-night-muted' : 'text-muted'}`}>
              {!isFailed && <span>🌱 {scan.crop_type}</span>}
              {scan.region && !isFailed && <span>📍 {scan.region}</span>}
              {!scan.image_url && <span>🕐 {timeAgo(scan.created_at)}</span>}
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors border-0 cursor-pointer ${
              isDark ? 'bg-night-surface text-night-muted hover:text-night-primary' : 'bg-sand text-muted hover:text-forest'
            }`}>
            {expanded ? 'Hide' : isFailed ? 'Details' : 'Diagnosis'}
          </button>
        </div>

        {expanded && (
          <div className={`mt-3 pt-3 border-t text-xs leading-relaxed whitespace-pre-wrap ${
            isDark ? 'border-night-border text-night-text/80' : 'border-sand text-dark/70'
          }`}>
            {isFailed
              ? '❌ The AI could not analyse this image. This is usually caused by:\n• API quota exhausted (free tier resets daily at midnight UTC)\n• No internet connection at time of scan\n\nTry scanning again after 2 AM South Africa time.'
              : scan.diagnosis}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanHistory() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const { isDark } = useTheme();
  const isOffline = useOffline();

  useEffect(() => {
    if (!isOffline) {
      getCropScans()
        .then(data => setScans(data as Scan[]))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isOffline]);

  const diseaseCount  = scans.filter(s => s.has_disease === 1 && s.status !== 'failed').length;
  const healthyCount  = scans.filter(s => s.has_disease === 0 && s.status !== 'failed').length;
  const failedCount   = scans.filter(s => s.status === 'failed').length;

  const filtered = scans.filter(s => {
    if (filter === 'disease')  return s.has_disease === 1 && s.status !== 'failed';
    if (filter === 'healthy')  return s.has_disease === 0 && s.status !== 'failed';
    if (filter === 'failed')   return s.status === 'failed';
    return true;
  });

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'all',     label: 'All',      count: scans.length },
    { key: 'disease', label: 'Diseases', count: diseaseCount },
    { key: 'healthy', label: 'Healthy',  count: healthyCount },
    { key: 'failed',  label: 'Failed',   count: failedCount },
  ];

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-serif ${isDark ? 'text-night-text' : 'text-dark'}`}>Scan History</h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>
            Every photo you attempted to scan — success or failed
          </p>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 mb-5">
          <span>📴</span>
          <span>You are offline — connect to load scan history.</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className={`flex gap-1 mb-6 p-1 rounded-xl w-fit flex-wrap ${isDark ? 'bg-night-card' : 'bg-sand/50'}`}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-0 whitespace-nowrap ${
              filter === tab.key
                ? isDark ? 'bg-night-surface text-night-primary shadow-sm' : 'bg-white text-forest shadow-sm'
                : isDark ? 'text-night-muted hover:text-night-text' : 'text-muted hover:text-dark'
            }`}>
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab.key === 'failed'
                  ? filter === tab.key ? 'bg-red-100 text-red-600' : 'bg-red-100/60 text-red-400'
                  : filter === tab.key ? (isDark ? 'bg-night-border text-night-primary' : 'bg-sand text-forest') : 'opacity-60'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-7 h-7 border-2 border-moss border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>Loading scan history…</p>
        </div>
      ) : isOffline && scans.length === 0 ? (
        <p className={`text-center py-12 text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>
          Connect to the internet to view your scans.
        </p>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">🔬</div>
          <p className={`font-semibold text-lg mb-1 ${isDark ? 'text-night-text' : 'text-dark'}`}>No scans here</p>
          <p className={`text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>
            {scans.length === 0
              ? 'Use AI Chat to photograph a crop — every scan attempt will appear here'
              : 'No scans match this filter'}
          </p>
        </div>
      ) : (
        <>
          {/* Photo cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(scan => (
              <ScanCard key={scan.id} scan={scan} isDark={isDark} />
            ))}
          </div>

          {/* Summary table */}
          {filtered.length > 0 && (
            <div className="mt-8">
              <h3 className={`text-lg font-serif mb-3 ${isDark ? 'text-night-text' : 'text-dark'}`}>
                Scan Summary
              </h3>
              <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-night-border' : 'border-sand'}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDark ? 'bg-night-card' : 'bg-sand/50'}>
                      {['Disease Name','Crop','Severity','Recommendation','Prevention','Date'].map(h => (
                        <th key={h} className={`px-4 py-3 text-left font-semibold whitespace-nowrap ${isDark ? 'text-night-text' : 'text-dark'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(scan => {
                      const s = parseScanSections(scan.diagnosis || '');
                      const isFailed = scan.status === 'failed';
                      const isHealthy = scan.has_disease === 0 && !isFailed;
                      return (
                        <tr key={scan.id} className={`border-t transition-colors ${
                          isDark ? 'border-night-border hover:bg-night-card/50' : 'border-sand hover:bg-sand/20'
                        }`}>
                          {/* Disease Name */}
                          <td className="px-4 py-3 font-medium">
                            {isFailed
                              ? <span className={isDark ? 'text-night-muted italic' : 'text-gray-400 italic'}>Failed</span>
                              : <span className={isHealthy ? 'text-emerald-600' : 'text-red-600 font-semibold'}>
                                  {s.disease || scan.disease_name || (isHealthy ? '✅ Healthy' : 'Disease Detected')}
                                </span>
                            }
                          </td>
                          {/* Crop */}
                          <td className={`px-4 py-3 ${isDark ? 'text-night-muted' : 'text-muted'}`}>
                            {scan.crop_type || '—'}
                          </td>
                          {/* Severity */}
                          <td className="px-4 py-3">
                            {isFailed ? <span className={isDark ? 'text-night-muted' : 'text-gray-400'}>—</span> : (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                scan.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                isHealthy ? 'bg-emerald-100 text-emerald-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {scan.severity === 'critical' ? '🚨 Critical' : isHealthy ? '✅ Healthy' : '⚠️ Warning'}
                              </span>
                            )}
                          </td>
                          {/* Recommendation */}
                          <td className={`px-4 py-3 max-w-[200px] ${isDark ? 'text-night-text' : 'text-dark'}`}>
                            <span className="line-clamp-2 text-xs leading-relaxed">
                              {s.treatment || '—'}
                            </span>
                          </td>
                          {/* Prevention */}
                          <td className={`px-4 py-3 max-w-[200px] ${isDark ? 'text-night-text' : 'text-dark'}`}>
                            <span className="line-clamp-2 text-xs leading-relaxed">
                              {s.prevention || '—'}
                            </span>
                          </td>
                          {/* Date */}
                          <td className={`px-4 py-3 whitespace-nowrap text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>
                            {timeAgo(scan.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
