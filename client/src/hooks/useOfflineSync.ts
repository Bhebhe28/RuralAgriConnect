import { useState, useEffect, useCallback, useRef } from 'react';
import { pullSync } from '../api';
import type { Advisory, WeatherAlert } from '../types';

const STORAGE_KEYS = {
  advisories: 'offline_advisories',
  alerts: 'offline_alerts',
  lastSync: 'offline_last_sync',
};

export interface OfflineSyncState {
  advisories: Advisory[];
  alerts: WeatherAlert[];
  lastSync: string | null;
  isSyncing: boolean;
  syncError: string | null;
}

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage quota exceeded — skip silently
  }
}

/** Normalise advisory fields from server (snake_case DB columns → camelCase type) */
function normaliseAdvisory(a: any): Advisory {
  return {
    id:           a.advisory_id ?? a.id,
    title:        a.title,
    content:      a.content,
    crop:         a.crop_type ?? a.crop,
    region:       a.region,
    severity:     a.severity,
    author_id:    a.created_by ?? a.author_id ?? '',
    author_name:  a.author_name ?? '',
    published_at: a.created_at ?? a.published_at ?? '',
    updated_at:   a.updated_at ?? '',
    prevention_tips: a.prevention_tips ?? [],
  };
}

/** Normalise weather alert fields */
function normaliseAlert(a: any): WeatherAlert {
  return {
    id:         a.alert_id ?? a.id,
    type:       a.alert_type ?? a.type,
    message:    a.message,
    region:     a.region ?? '',
    severity:   a.severity ?? 'info',
    issued_at:  a.created_at ?? a.issued_at ?? '',
    expires_at: a.expires_at,
  };
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>(() => ({
    advisories: loadFromStorage<Advisory>(STORAGE_KEYS.advisories),
    alerts:     loadFromStorage<WeatherAlert>(STORAGE_KEYS.alerts),
    lastSync:   localStorage.getItem(STORAGE_KEYS.lastSync),
    isSyncing:  false,
    syncError:  null,
  }));

  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setState(s => ({ ...s, isSyncing: true, syncError: null }));

    try {
      const since = localStorage.getItem(STORAGE_KEYS.lastSync) ?? undefined;
      const data = await pullSync(since);

      const newAdvisories = (data.advisories ?? []).map(normaliseAdvisory);
      const newAlerts     = (data.weatherAlerts ?? []).map(normaliseAlert);
      const syncedAt      = data.syncedAt ?? new Date().toISOString();

      // Merge with existing cached data (newer entries win by id)
      const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
        const map = new Map(existing.map(e => [e.id, e]));
        incoming.forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      };

      const mergedAdvisories = mergeById(
        loadFromStorage<Advisory>(STORAGE_KEYS.advisories),
        newAdvisories
      );
      const mergedAlerts = mergeById(
        loadFromStorage<WeatherAlert>(STORAGE_KEYS.alerts),
        newAlerts
      );

      saveToStorage(STORAGE_KEYS.advisories, mergedAdvisories);
      saveToStorage(STORAGE_KEYS.alerts, mergedAlerts);
      localStorage.setItem(STORAGE_KEYS.lastSync, syncedAt);

      setState({
        advisories: mergedAdvisories,
        alerts:     mergedAlerts,
        lastSync:   syncedAt,
        isSyncing:  false,
        syncError:  null,
      });

      // Notify service worker to cache the sync data
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_SYNC_DATA',
          advisories: mergedAdvisories,
          alerts: mergedAlerts,
        });
      }
    } catch (err: any) {
      setState(s => ({
        ...s,
        isSyncing: false,
        syncError: 'Sync failed — using cached data',
      }));
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Sync on mount (if online) and whenever we come back online
  useEffect(() => {
    if (navigator.onLine) sync();

    const handleOnline = () => sync();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sync]);

  // Periodic background sync every 15 minutes while online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) sync();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sync]);

  return { ...state, sync };
}
