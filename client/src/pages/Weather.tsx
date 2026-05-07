import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface WeatherData {
  region: string;
  city?: string;
  country?: string;
  temperature: number;
  feels_like?: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  description?: string;
  forecast_date: string;
  lat?: number;
  lon?: number;
}

interface WeatherAlert {
  id: string;
  type: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  created_at: string;
}

interface SavedLocation {
  type: 'gps' | 'city';
  lat?: number;
  lon?: number;
  city?: string;
  displayName: string;
}

interface GeoResult {
  name: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  displayName: string;
}

const LS_KEY       = 'weather_location';
const CACHE_DIST   = 'weather_districts_cache';
const CACHE_LOC    = 'weather_loc_cache';

function saveCache(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {/**/}
}
function loadCache<T>(key: string): { data: T; ts: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function cacheAge(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
}

const KZN_DISTRICTS = [
  { name: 'eThekwini',      region: 'KwaZulu-Natal — eThekwini',      lat: -29.8587, lon: 31.0218 },
  { name: 'uMgungundlovu',  region: 'KwaZulu-Natal — uMgungundlovu',  lat: -29.6172, lon: 30.3929 },
  { name: 'iLembe',         region: 'KwaZulu-Natal — iLembe',         lat: -29.3342, lon: 31.2794 },
  { name: 'Zululand',       region: 'KwaZulu-Natal — Zululand',       lat: -28.3309, lon: 31.4162 },
  { name: 'uThukela',       region: 'KwaZulu-Natal — uThukela',       lat: -28.5539, lon: 29.7782 },
];

const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm',
};

async function fetchByCoords(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,apparent_temperature&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  const c = data.current;
  return {
    region: '',
    temperature: Math.round(c.temperature_2m),
    feels_like:  Math.round(c.apparent_temperature),
    humidity:    Math.round(c.relative_humidity_2m),
    rainfall:    c.precipitation ?? 0,
    wind_speed:  Math.round(c.wind_speed_10m),
    description: WMO[c.weather_code] || 'Unknown',
    forecast_date: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    lat, lon,
  };
}

async function geocode(query: string): Promise<GeoResult[]> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    name:        r.name,
    state:       r.admin1 || '',
    country:     r.country || '',
    lat:         r.latitude,
    lon:         r.longitude,
    displayName: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
  }));
}

function deriveAlerts(districts: WeatherData[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  districts.forEach(d => {
    const label = d.region.split('—')[1]?.trim() || d.region;
    if (d.temperature > 35)  alerts.push({ id: `heat-${d.region}`,  type: 'Heatwave',   message: `Extreme heat in ${label} — ${d.temperature}°C. Irrigate crops early morning.`, severity: 'critical', created_at: new Date().toISOString() });
    if (d.rainfall    > 20)  alerts.push({ id: `rain-${d.region}`,  type: 'Heavy Rain',  message: `Heavy rainfall in ${label} — ${d.rainfall}mm. Risk of fungal disease.`,          severity: 'warning',  created_at: new Date().toISOString() });
    if (d.wind_speed  > 40)  alerts.push({ id: `wind-${d.region}`,  type: 'High Winds',  message: `Strong winds in ${label} — ${d.wind_speed}km/h. Secure tunnel crops.`,            severity: 'warning',  created_at: new Date().toISOString() });
    if ((d.description || '').toLowerCase().includes('thunder'))
      alerts.push({ id: `storm-${d.region}`, type: 'Thunderstorm', message: `Thunderstorm in ${label}. Stay indoors, protect livestock.`, severity: 'critical', created_at: new Date().toISOString() });
  });
  return alerts;
}

const weatherEmoji = (desc = '') => {
  const d = desc.toLowerCase();
  if (d.includes('thunder'))                        return '⛈️';
  if (d.includes('rain') || d.includes('shower'))  return '🌧️';
  if (d.includes('drizzle'))                        return '🌦️';
  if (d.includes('cloud') || d.includes('overcast')) return '⛅';
  if (d.includes('clear') || d.includes('sunny'))   return '☀️';
  if (d.includes('fog') || d.includes('mist'))      return '🌫️';
  if (d.includes('snow'))                           return '❄️';
  return '⛅';
};

const alertBg = (sev: string, isDark: boolean) => {
  if (sev === 'critical') return isDark ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-300 text-red-900';
  if (sev === 'warning')  return isDark ? 'bg-amber-900/30 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900';
  return isDark ? 'bg-blue-900/30 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-900';
};

// ─── Location Setup ───────────────────────────────────────────────────────────
function LocationSetup({ onDone }: { onDone: (loc: SavedLocation) => void }) {
  const { isDark } = useTheme();
  const [gpsState,    setGpsState]    = useState<'idle' | 'detecting'>('idle');
  const [gpsError,    setGpsError]    = useState('');
  const [cityQuery,   setCityQuery]   = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [sugLoading,  setSugLoading]  = useState(false);
  const [cityError,   setCityError]   = useState('');
  const [showDrop,    setShowDrop]    = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCityInput = (val: string) => {
    setCityQuery(val);
    setCityError('');
    setShowDrop(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      const results = await geocode(val.trim()).catch(() => []);
      setSuggestions(results);
      setSugLoading(false);
    }, 350);
  };

  const pickSuggestion = (s: GeoResult) => {
    setShowDrop(false);
    setSuggestions([]);
    const loc: SavedLocation = { type: 'gps', lat: s.lat, lon: s.lon, city: s.name, displayName: s.displayName };
    localStorage.setItem(LS_KEY, JSON.stringify(loc));
    onDone(loc);
  };

  const submitCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    setCityError('');
    setSugLoading(true);
    let results: GeoResult[] = [];
    let networkFailed = false;
    try { results = await geocode(cityQuery.trim()); }
    catch { networkFailed = true; }
    setSugLoading(false);
    if (networkFailed) { setCityError('No internet connection. Connect and try again.'); return; }
    if (results.length === 0) { setCityError('City not found. Try a different spelling.'); return; }
    pickSuggestion(results[0]);
  };

  const useGPS = async () => {
    setGpsError('');
    setGpsState('detecting');
    if ('permissions' in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') { setGpsState('idle'); setGpsError('denied'); return; }
      } catch { /* fall through */ }
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Save location regardless of internet — weather fetch happens after
        const loc: SavedLocation = { type: 'gps', lat: pos.coords.latitude, lon: pos.coords.longitude, displayName: 'Current Location' };
        localStorage.setItem(LS_KEY, JSON.stringify(loc));
        setGpsState('idle');
        onDone(loc);
      },
      (err) => {
        setGpsState('idle');
        setGpsError(err.code === err.PERMISSION_DENIED ? 'denied' : 'Could not get location. Enter your city below.');
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-10 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 ${isDark ? 'bg-night-card' : 'bg-cream'}`}>🌤️</div>
          <h2 className={`font-serif text-2xl mb-1 ${isDark ? 'text-night-text' : 'text-dark'}`}>Weather for your area</h2>
          <p className={`text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>Auto-detect or search any city worldwide</p>
        </div>

        {navigator.geolocation && (
          <button onClick={useGPS} disabled={gpsState === 'detecting'}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-forest text-white font-semibold text-left hover:bg-forest-mid transition-all cursor-pointer border-0 disabled:opacity-70 mb-3">
            <span className={`text-2xl ${gpsState === 'detecting' ? 'animate-pulse' : ''}`}>📍</span>
            <div>
              <p className="text-sm font-bold">{gpsState === 'detecting' ? 'Detecting your location…' : 'Use my current location'}</p>
              <p className="text-xs opacity-70 mt-0.5">{gpsState === 'detecting' ? 'Allow location in the browser prompt' : 'Automatically detect via GPS'}</p>
            </div>
          </button>
        )}

        {gpsError && (
          <div className={`rounded-xl px-4 py-3 mb-3 text-xs border ${isDark ? 'bg-amber-900/20 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
            {gpsError === 'denied' ? (
              <><p className="font-semibold mb-1">⚠ Location permission is blocked</p><p className="opacity-80">Click the 🔒 lock icon in your browser → Site settings → Allow Location, then try again.</p><p className="opacity-60 mt-1">Or search a city below.</p></>
            ) : <><span>⚠ {gpsError}</span></>}
          </div>
        )}

        <div className="flex items-center gap-3 mb-3">
          <div className={`flex-1 h-px ${isDark ? 'bg-night-border' : 'bg-sand'}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-night-muted' : 'text-muted'}`}>or search</span>
          <div className={`flex-1 h-px ${isDark ? 'bg-night-border' : 'bg-sand'}`} />
        </div>

        <form onSubmit={submitCity}>
          <div className="relative">
            <div className={`flex items-center gap-2 border-2 rounded-2xl px-4 transition-all ${isDark ? 'bg-night-card border-night-border focus-within:border-night-primary' : 'bg-white border-sand focus-within:border-moss'}`}>
              <span className="text-lg flex-shrink-0 text-muted">🔍</span>
              <input ref={inputRef}
                className={`flex-1 py-3.5 text-sm bg-transparent border-0 outline-none placeholder:opacity-50 ${isDark ? 'text-night-text' : 'text-dark'}`}
                placeholder="Search city — e.g. Durban, Cape Town…"
                value={cityQuery}
                onChange={e => handleCityInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                autoComplete="off"
              />
              {sugLoading && <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0 ${isDark ? 'border-night-primary' : 'border-moss'}`} />}
            </div>

            {showDrop && suggestions.length > 0 && (
              <div ref={dropRef} className={`absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-xl z-50 overflow-hidden border animate-scale-in ${isDark ? 'bg-night-card border-night-border' : 'bg-white border-sand'}`}>
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onMouseDown={() => pickSuggestion(s)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors cursor-pointer border-0 ${isDark ? 'hover:bg-night-surface text-night-text' : 'hover:bg-cream text-dark'} ${i > 0 ? (isDark ? 'border-t border-night-border' : 'border-t border-sand') : ''}`}>
                    <span className="text-base flex-shrink-0">📍</span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.name}</p>
                      {(s.state || s.country) && <p className={`text-xs truncate ${isDark ? 'text-night-muted' : 'text-muted'}`}>{[s.state, s.country].filter(Boolean).join(', ')}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cityError && <p className={`text-xs mt-2 ml-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>⚠ {cityError}</p>}

          <button type="submit" disabled={sugLoading || !cityQuery.trim()} className="btn-primary w-full py-3.5 mt-3 disabled:opacity-50">
            {sugLoading ? 'Searching…' : 'Get Weather →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Weather Page ────────────────────────────────────────────────────────
export default function Weather() {
  const { t }      = useLanguage();
  const { isDark } = useTheme();

  const [savedLoc,   setSavedLoc]   = useState<SavedLocation | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  });
  const [locWeather,  setLocWeather]  = useState<WeatherData | null>(null);
  const [districts,   setDistricts]   = useState<WeatherData[]>([]);
  const [alerts,      setAlerts]      = useState<WeatherAlert[]>([]);
  const [selected,    setSelected]    = useState<WeatherData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [locError,    setLocError]    = useState('');

  const [cacheTs, setCacheTs] = useState<number | null>(null);

  const loadDistricts = useCallback(async () => {
    // Show cached data immediately
    const cached = loadCache<WeatherData[]>(CACHE_DIST);
    if (cached) {
      setDistricts(cached.data);
      setAlerts(deriveAlerts(cached.data));
      setCacheTs(cached.ts);
      setLoading(false);
    }
    // Try live fetch
    try {
      const settled = await Promise.allSettled(
        KZN_DISTRICTS.map(async (d) => {
          const w = await fetchByCoords(d.lat, d.lon);
          return { ...w, region: d.region };
        })
      );
      const results = settled
        .filter((r): r is PromiseFulfilledResult<WeatherData> => r.status === 'fulfilled')
        .map(r => r.value);
      if (results.length > 0) {
        setDistricts(results);
        setAlerts(deriveAlerts(results));
        saveCache(CACHE_DIST, results);
        setCacheTs(Date.now());
      }
    } catch {/**/}
    finally { setLoading(false); }
  }, []);

  const fetchLocWeather = useCallback(async (loc: SavedLocation) => {
    setLocError('');
    if (!loc.lat || !loc.lon) return;
    // Show cached loc weather immediately
    const cached = loadCache<WeatherData>(CACHE_LOC);
    if (cached) {
      setLocWeather(cached.data);
      setSelected(cached.data);
    }
    // Try live fetch
    try {
      const w = await fetchByCoords(loc.lat, loc.lon);
      const live = { ...w, city: loc.city, region: loc.displayName };
      setLocWeather(live);
      setSelected(live);
      saveCache(CACHE_LOC, live);
      setCacheTs(Date.now());
    } catch {
      if (!cached) setLocError('No internet — connect to load weather for your location.');
    }
  }, []);

  useEffect(() => {
    loadDistricts();
    if (savedLoc) fetchLocWeather(savedLoc);
    else setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-retry when network comes back
  useEffect(() => {
    const retry = () => { loadDistricts(); if (savedLoc) fetchLocWeather(savedLoc); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [savedLoc, loadDistricts, fetchLocWeather]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDistricts();
    if (savedLoc) await fetchLocWeather(savedLoc);
    setRefreshing(false);
  };

  const changeLocation = () => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(CACHE_LOC);
    setSavedLoc(null);
    setLocWeather(null);
    setSelected(null);
  };

  if (!savedLoc) {
    return <LocationSetup onDone={(loc) => { setSavedLoc(loc); fetchLocWeather(loc); loadDistricts(); }} />;
  }

  if (loading) return <div className={`p-7 text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loading}</div>;

  const displayWeather = selected ?? locWeather ?? (districts.length > 0 ? districts[0] : null);

  return (
    <div className="p-4 md:p-7 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-2xl font-serif">{t.weatherTitle}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>📍 {savedLoc.displayName}</span>
            <button onClick={changeLocation} className={`text-xs underline bg-transparent border-0 cursor-pointer ${isDark ? 'text-night-primary' : 'text-moss'}`}>Change</button>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-outline text-sm px-4">
          {refreshing ? t.weatherRefreshing : t.weatherRefresh}
        </button>
      </div>

      {cacheTs && (
        <p className={`text-xs mb-3 ${isDark ? 'text-night-muted' : 'text-muted'}`}>
          {navigator.onLine ? '🟢 Live' : '📴 Offline —'} last updated {cacheAge(cacheTs)}
        </p>
      )}

      {locError && (
        <div className={`rounded-2xl px-4 py-3 mb-4 text-sm border flex items-center justify-between gap-3 flex-wrap ${isDark ? 'bg-amber-900/20 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
          <span>📴 {locError}</span>
          <button onClick={() => savedLoc && fetchLocWeather(savedLoc)}
            className="underline cursor-pointer bg-transparent border-0 font-semibold flex-shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Main hero card */}
      {displayWeather && (
        <div className="bg-gradient-to-br from-forest to-forest-mid rounded-2xl p-5 md:p-7 text-white mb-5 mt-4">
          <div className="flex items-center gap-4 mb-5">
            <span className="text-6xl md:text-7xl">{weatherEmoji(displayWeather.description)}</span>
            <div className="min-w-0">
              <p className="text-5xl md:text-6xl font-serif leading-none">{displayWeather.temperature}°C</p>
              <p className="text-sm opacity-80 capitalize mt-1">{displayWeather.description || t.weatherCurrentConditions}</p>
              <p className="text-sm font-semibold opacity-90 mt-0.5 truncate">
                {displayWeather.city ? `${displayWeather.city}${displayWeather.country ? ', ' + displayWeather.country : ''}` : displayWeather.region}
              </p>
              <p className="text-xs opacity-50 mt-0.5">{t.weatherUpdated}: {displayWeather.forecast_date}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {[
              [t.weatherHumidity,  `${displayWeather.humidity}%`],
              [t.weatherWind,      `${displayWeather.wind_speed} km/h`],
              [t.weatherRainfall,  `${displayWeather.rainfall} mm`],
              [t.weatherFeelsLike, `${displayWeather.feels_like ?? displayWeather.temperature}°C`],
            ].map(([label, val]) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{val}</p>
                <p className="text-xs opacity-70 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KZN Districts */}
      {districts.length > 0 && (
        <>
          <h3 className={`font-serif text-lg mb-3 ${isDark ? 'text-night-text' : 'text-dark'}`}>KZN Districts</h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {locWeather && (
              <button onClick={() => setSelected(locWeather)}
                className={`text-sm px-4 py-2 rounded-full border transition-all flex items-center gap-1.5 ${
                  selected?.region === locWeather.region ? 'bg-forest text-white border-forest' : isDark ? 'bg-night-card border-night-border text-night-text hover:border-night-primary' : 'bg-white border-sand hover:border-moss'
                }`}>
                📍 {locWeather.city || 'My Location'}
              </button>
            )}
            {districts.map(w => (
              <button key={w.region} onClick={() => setSelected(w)}
                className={`text-sm px-4 py-2 rounded-full border transition-all ${
                  selected?.region === w.region ? 'bg-forest text-white border-forest' : isDark ? 'bg-night-card border-night-border text-night-text hover:border-night-primary' : 'bg-white border-sand hover:border-moss'
                }`}>
                {w.region.split('—')[1]?.trim() || w.region}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {districts.map(w => (
              <div key={w.region} onClick={() => setSelected(w)}
                className={`card mb-0 cursor-pointer hover:-translate-y-0.5 transition-transform ${isDark ? 'bg-night-card border-night-border' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-sm ${isDark ? 'text-night-text' : 'text-dark'}`}>{w.region.split('—')[1]?.trim()}</p>
                    <p className={`text-3xl font-serif mt-1 ${isDark ? 'text-night-primary' : 'text-forest'}`}>{w.temperature}°C</p>
                    <p className={`text-xs capitalize mt-0.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{w.description || '—'}</p>
                  </div>
                  <div className="text-5xl">{weatherEmoji(w.description)}</div>
                </div>
                <div className={`flex gap-3 mt-3 text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>
                  <span>💧 {w.humidity}%</span>
                  <span>💨 {w.wind_speed} km/h</span>
                  <span>🌧 {w.rainfall} mm</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Active Alerts */}
      <h3 className={`font-serif text-xl mb-4 ${isDark ? 'text-night-text' : 'text-dark'}`}>
        {t.weatherActiveAlerts}
        {alerts.length > 0 && <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-sans">{alerts.length}</span>}
      </h3>
      {alerts.length === 0 ? (
        <p className={`text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.weatherNoAlerts}</p>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.id} className={`flex items-start gap-3 border rounded-xl px-4 py-4 ${alertBg(a.severity, isDark)}`}>
              <span className="text-xl flex-shrink-0">
                {a.type.toLowerCase().includes('heat') ? '🌡️' : a.type.toLowerCase().includes('rain') ? '🌧️' : a.type.toLowerCase().includes('wind') ? '💨' : '⛈️'}
              </span>
              <div>
                <p className="text-sm font-semibold">{a.type} Alert</p>
                <p className="text-sm mt-0.5">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
