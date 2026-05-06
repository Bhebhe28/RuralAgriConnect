import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/client';
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
  icon?: string;
  forecast_date: string;
  alert_count?: number;
}

interface Alert {
  alert_id: string;
  alert_type: string;
  message: string;
  created_at: string;
}

// ── Saved location shape stored in localStorage ────────────────────────────
interface SavedLocation {
  type: 'gps' | 'city';
  lat?: number;
  lon?: number;
  city?: string;
  displayName: string;
}

const LS_KEY = 'weather_location';

const weatherEmoji = (desc = '') => {
  const d = desc.toLowerCase();
  if (d.includes('thunder'))                       return '⛈️';
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('cloud'))                         return '⛅';
  if (d.includes('clear') || d.includes('sunny'))  return '☀️';
  if (d.includes('mist') || d.includes('fog'))     return '🌫️';
  if (d.includes('snow'))                          return '❄️';
  if (d.includes('hot') || d.includes('dry'))      return '🌡️';
  return '⛅';
};

const alertStyle = (msg: string, isDark: boolean) => {
  const m = msg.toLowerCase();
  if (m.includes('heatwave') || m.includes('heavy'))
    return isDark ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-300 text-red-900';
  if (m.includes('wind') || m.includes('rain'))
    return isDark ? 'bg-amber-900/30 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900';
  return isDark ? 'bg-blue-900/30 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-900';
};

interface Suggestion {
  displayName: string;
  name: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location Setup Screen — both options always visible
// ─────────────────────────────────────────────────────────────────────────────
function LocationSetup({ onDone }: { onDone: (loc: SavedLocation) => void }) {
  const { isDark } = useTheme();
  const [gpsState,    setGpsState]    = useState<'idle' | 'detecting'>('idle');
  const [gpsError,    setGpsError]    = useState('');
  const [cityQuery,   setCityQuery]   = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sugLoading,  setSugLoading]  = useState(false);
  const [cityError,   setCityError]   = useState('');
  const [showDrop,    setShowDrop]    = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
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

  // Debounced autocomplete
  const handleCityInput = (val: string) => {
    setCityQuery(val);
    setCityError('');
    setShowDrop(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const res = await api.get(`/weather/suggest?q=${encodeURIComponent(val.trim())}`);
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      } finally {
        setSugLoading(false);
      }
    }, 300);
  };

  const pickSuggestion = (s: Suggestion) => {
    setShowDrop(false);
    setSuggestions([]);
    const loc: SavedLocation = {
      type: 'gps',
      lat: s.lat, lon: s.lon,
      city: s.name,
      displayName: s.displayName,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(loc));
    onDone(loc);
  };

  const submitCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    setCityError('');
    setSugLoading(true);
    try {
      const res = await api.get(`/weather/city?q=${encodeURIComponent(cityQuery.trim())}`);
      const loc: SavedLocation = {
        type: 'city', city: cityQuery.trim(),
        displayName: res.data.city
          ? `${res.data.city}${res.data.country ? ', ' + res.data.country : ''}`
          : cityQuery.trim(),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(loc));
      onDone(loc);
    } catch (err: any) {
      setCityError(err.response?.data?.error || 'City not found. Try a different spelling.');
    } finally {
      setSugLoading(false);
    }
  };

  const useGPS = async () => {
    setGpsError('');
    setGpsState('detecting');

    // Check permission state first so we can give actionable guidance
    if ('permissions' in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          setGpsState('idle');
          setGpsError('denied');
          setTimeout(() => inputRef.current?.focus(), 100);
          return;
        }
      } catch { /* permissions API unavailable — fall through to direct request */ }
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: SavedLocation = {
          type: 'gps',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          displayName: 'Current Location',
        };
        localStorage.setItem(LS_KEY, JSON.stringify(loc));
        onDone(loc);
      },
      (err) => {
        setGpsState('idle');
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : 'Could not get location. Enter your city below.'
        );
        setTimeout(() => inputRef.current?.focus(), 100);
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-10 animate-fade-in">
      <div className="w-full max-w-sm">

        {/* Heading */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 ${isDark ? 'bg-night-card' : 'bg-cream'}`}>
            🌤️
          </div>
          <h2 className={`font-serif text-2xl mb-1 ${isDark ? 'text-night-text' : 'text-dark'}`}>
            Weather for your area
          </h2>
          <p className={`text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>
            Auto-detect or search any city worldwide
          </p>
        </div>

        {/* ── GPS button ── */}
        {navigator.geolocation && (
          <button
            onClick={useGPS}
            disabled={gpsState === 'detecting'}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-forest text-white font-semibold text-left hover:bg-forest-mid transition-all cursor-pointer border-0 disabled:opacity-70 mb-3">
            <span className={`text-2xl ${gpsState === 'detecting' ? 'animate-pulse' : ''}`}>📍</span>
            <div>
              <p className="text-sm font-bold">
                {gpsState === 'detecting' ? 'Detecting your location…' : 'Use my current location'}
              </p>
              <p className="text-xs opacity-70 mt-0.5">
                {gpsState === 'detecting' ? 'Allow location in the browser prompt' : 'Automatically detect via GPS'}
              </p>
            </div>
          </button>
        )}

        {/* GPS error */}
        {gpsError && (
          <div className={`rounded-xl px-4 py-3 mb-3 text-xs border ${isDark ? 'bg-amber-900/20 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
            {gpsError === 'denied' ? (
              <>
                <p className="font-semibold mb-1">⚠ Location permission is blocked</p>
                <p className="opacity-80">To fix: click the <strong>🔒 lock icon</strong> in your browser's address bar → <strong>Site settings</strong> → set Location to <strong>Allow</strong>, then try again.</p>
                <p className="opacity-60 mt-1">Or use the city search below.</p>
              </>
            ) : (
              <>⚠ {gpsError}</>
            )}
          </div>
        )}

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex-1 h-px ${isDark ? 'bg-night-border' : 'bg-sand'}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-night-muted' : 'text-muted'}`}>or search</span>
          <div className={`flex-1 h-px ${isDark ? 'bg-night-border' : 'bg-sand'}`} />
        </div>

        {/* ── City search with autocomplete ── */}
        <form onSubmit={submitCity}>
          <div className="relative">
            <div className={`flex items-center gap-2 border-2 rounded-2xl px-4 transition-all ${isDark ? 'bg-night-card border-night-border focus-within:border-night-primary' : 'bg-white border-sand focus-within:border-moss'}`}>
              <span className={`text-lg flex-shrink-0 ${isDark ? 'text-night-muted' : 'text-muted'}`}>🔍</span>
              <input
                ref={inputRef}
                className={`flex-1 py-3.5 text-sm bg-transparent border-0 outline-none placeholder:opacity-50 ${isDark ? 'text-night-text placeholder:text-night-muted' : 'text-dark'}`}
                placeholder="Search city — e.g. Durban, Cape Town…"
                value={cityQuery}
                onChange={e => handleCityInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                autoComplete="off"
              />
              {sugLoading && (
                <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0 ${isDark ? 'border-night-primary' : 'border-moss'}`} />
              )}
            </div>

            {/* Autocomplete dropdown */}
            {showDrop && suggestions.length > 0 && (
              <div ref={dropRef}
                className={`absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-xl z-50 overflow-hidden border animate-scale-in ${isDark ? 'bg-night-card border-night-border' : 'bg-white border-sand'}`}>
                {suggestions.map((s, i) => (
                  <button key={i} type="button"
                    onMouseDown={() => pickSuggestion(s)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors cursor-pointer border-0 ${isDark ? 'hover:bg-night-surface text-night-text' : 'hover:bg-cream text-dark'} ${i > 0 ? (isDark ? 'border-t border-night-border' : 'border-t border-sand') : ''}`}>
                    <span className="text-base flex-shrink-0">📍</span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.name}</p>
                      {(s.state || s.country) && (
                        <p className={`text-xs truncate ${isDark ? 'text-night-muted' : 'text-muted'}`}>
                          {[s.state, s.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cityError && (
            <p className={`text-xs mt-2 ml-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>⚠ {cityError}</p>
          )}

          <button
            type="submit"
            disabled={sugLoading || !cityQuery.trim()}
            className="btn-primary w-full py-3.5 mt-3 disabled:opacity-50">
            {sugLoading ? 'Searching…' : 'Get Weather →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Weather Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Weather() {
  const { t }      = useLanguage();
  const { isDark } = useTheme();

  const [savedLoc,   setSavedLoc]   = useState<SavedLocation | null>(() => {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [locWeather,  setLocWeather]  = useState<WeatherData | null>(null);
  const [districts,   setDistricts]   = useState<WeatherData[]>([]);
  const [alerts,      setAlerts]      = useState<Alert[]>([]);
  const [selected,    setSelected]    = useState<WeatherData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [locError,    setLocError]    = useState('');

  const fetchLocWeather = useCallback(async (loc: SavedLocation) => {
    setLocError('');
    try {
      let res;
      if (loc.type === 'gps' && loc.lat != null && loc.lon != null) {
        res = await api.get(`/weather/location?lat=${loc.lat}&lon=${loc.lon}`);
      } else if (loc.city) {
        res = await api.get(`/weather/city?q=${encodeURIComponent(loc.city)}`);
      }
      if (res) {
        const data = { ...res.data };
        // Update display name with real city from API
        const updated: SavedLocation = {
          ...loc,
          displayName: data.city
            ? `${data.city}${data.country ? ', ' + data.country : ''}`
            : loc.displayName,
        };
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
        setSavedLoc(updated);
        setLocWeather(data);
        setSelected(data);
      }
    } catch (err: any) {
      setLocError(err.response?.data?.error || 'Could not load weather. Check your connection.');
    }
  }, []);

  const loadDistricts = useCallback(async () => {
    try {
      const [wRes, aRes] = await Promise.all([
        api.get('/weather'),
        api.get('/weather/alerts'),
      ]);
      setDistricts(wRes.data);
      setAlerts(aRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDistricts();
    if (savedLoc) fetchLocWeather(savedLoc);
    else setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/weather/refresh');
      await loadDistricts();
      if (savedLoc) await fetchLocWeather(savedLoc);
    } finally {
      setRefreshing(false);
    }
  };

  const changeLocation = () => {
    localStorage.removeItem(LS_KEY);
    setSavedLoc(null);
    setLocWeather(null);
    setSelected(null);
  };

  // ── Setup screen if no location is saved ──────────────────────────────────
  if (!savedLoc) {
    return <LocationSetup onDone={(loc) => { setSavedLoc(loc); fetchLocWeather(loc); }} />;
  }

  if (loading) return <div className={`p-7 text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loading}</div>;

  const displayWeather = selected ?? locWeather ?? (districts.length > 0 ? districts[0] : null);

  return (
    <div className="p-4 md:p-7 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-2xl font-serif">{t.weatherTitle}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>
              📍 {savedLoc.displayName}
            </span>
            <button
              onClick={changeLocation}
              className={`text-xs underline bg-transparent border-0 cursor-pointer ${isDark ? 'text-night-primary' : 'text-moss'}`}>
              Change
            </button>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-outline text-sm px-4">
          {refreshing ? t.weatherRefreshing : t.weatherRefresh}
        </button>
      </div>

      {/* Location error */}
      {locError && (
        <div className={`rounded-2xl px-4 py-3 mb-4 text-sm border ${isDark ? 'bg-red-900/20 border-red-700 text-red-300' : 'bg-red-50 border-red-300 text-red-800'}`}>
          ⚠ {locError} —{' '}
          <button onClick={changeLocation} className="underline cursor-pointer bg-transparent border-0 font-semibold">
            Set a different location
          </button>
        </div>
      )}

      {/* ── Main weather hero card ── */}
      {displayWeather && (
        <div className="bg-gradient-to-br from-forest to-forest-mid rounded-2xl p-5 md:p-7 text-white mb-5 mt-4">
          <div className="flex items-center gap-4 mb-5">
            <span className="text-6xl md:text-7xl">{weatherEmoji(displayWeather.description)}</span>
            <div className="min-w-0">
              <p className="text-5xl md:text-6xl font-serif leading-none">{displayWeather.temperature}°C</p>
              <p className="text-sm opacity-80 capitalize mt-1">{displayWeather.description || t.weatherCurrentConditions}</p>
              <p className="text-sm font-semibold opacity-90 mt-0.5 truncate">
                {displayWeather.city
                  ? `${displayWeather.city}${displayWeather.country ? ', ' + displayWeather.country : ''}`
                  : displayWeather.region}
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

      {/* ── KZN Districts ── */}
      {districts.length > 0 && (
        <>
          <h3 className={`font-serif text-lg mb-3 ${isDark ? 'text-night-text' : 'text-dark'}`}>KZN Districts</h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {locWeather && (
              <button onClick={() => setSelected(locWeather)}
                className={`text-sm px-4 py-2 rounded-full border transition-all flex items-center gap-1.5 ${
                  selected?.city === locWeather.city && selected?.region === locWeather.region
                    ? 'bg-forest text-white border-forest'
                    : isDark ? 'bg-night-card border-night-border text-night-text hover:border-night-primary' : 'bg-white border-sand hover:border-moss'
                }`}>
                📍 {locWeather.city || 'My Location'}
              </button>
            )}
            {districts.map(w => (
              <button key={w.region} onClick={() => setSelected(w)}
                className={`text-sm px-4 py-2 rounded-full border transition-all ${
                  selected?.region === w.region && !locWeather
                    ? 'bg-forest text-white border-forest'
                    : isDark ? 'bg-night-card border-night-border text-night-text hover:border-night-primary' : 'bg-white border-sand hover:border-moss'
                }`}>
                {w.region.split('—')[1]?.trim() || w.region}
                {(w.alert_count ?? 0) > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{w.alert_count}</span>
                )}
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

      {/* ── Active alerts ── */}
      <h3 className={`font-serif text-xl mb-4 ${isDark ? 'text-night-text' : 'text-dark'}`}>
        {t.weatherActiveAlerts}
        {alerts.length > 0 && (
          <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-sans">{alerts.length}</span>
        )}
      </h3>
      {alerts.length === 0 ? (
        <p className={`text-sm ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.weatherNoAlerts}</p>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.alert_id} className={`flex items-start gap-3 border rounded-xl px-4 py-4 ${alertStyle(a.message, isDark)}`}>
              <span className="text-xl flex-shrink-0">
                {a.message.toLowerCase().includes('heatwave') ? '🌡️' :
                 a.message.toLowerCase().includes('rain') ? '🌧️' :
                 a.message.toLowerCase().includes('wind') ? '💨' : '⚠️'}
              </span>
              <div>
                <p className="text-sm font-semibold capitalize">{a.alert_type} {t.weatherAlertType}</p>
                <p className="text-sm mt-0.5">{a.message}</p>
                <p className="text-xs opacity-60 mt-1">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
