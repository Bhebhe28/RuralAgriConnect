import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

interface WeatherRow {
  region: string;
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

const weatherEmoji = (desc: string = '') => {
  const d = desc.toLowerCase();
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('cloud')) return '⛅';
  if (d.includes('clear') || d.includes('sunny')) return '☀️';
  if (d.includes('mist') || d.includes('fog')) return '🌫️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('hot') || d.includes('dry')) return '🌡️';
  return '⛅';
};

const severityStyle = (msg: string) => {
  if (msg.toLowerCase().includes('heatwave') || msg.toLowerCase().includes('heavy'))
    return 'bg-red-50 border-red-300 text-red-900';
  if (msg.toLowerCase().includes('wind') || msg.toLowerCase().includes('rain'))
    return 'bg-amber-50 border-amber-300 text-amber-900';
  return 'bg-blue-50 border-blue-300 text-blue-900';
};

export default function Weather() {
  const [weather, setWeather]   = useState<WeatherRow[]>([]);
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<WeatherRow | null>(null);
  const { t } = useLanguage();

  const load = async () => {
    try {
      const [wRes, aRes] = await Promise.all([
        api.get('/weather'),
        api.get('/weather/alerts'),
      ]);
      setWeather(wRes.data);
      setAlerts(aRes.data);
      if (wRes.data.length > 0) setSelected(wRes.data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/weather/refresh');
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="p-7 text-muted">{t.loading}</div>;

  return (
    <div className="p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-serif">{t.weatherTitle}</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-outline text-sm px-4"
        >
          {refreshing ? t.weatherRefreshing : t.weatherRefresh}
        </button>
      </div>
      <p className="text-sm text-muted mb-6">{t.weatherSubtitle}</p>

      {/* Region selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {weather.map(w => (
          <button
            key={w.region}
            onClick={() => setSelected(w)}
            className={`text-sm px-4 py-2 rounded-full border transition-all
              ${selected?.region === w.region
                ? 'bg-forest text-white border-forest'
                : 'bg-white border-sand hover:border-moss'}`}
          >
            {w.region.split('—')[1]?.trim() || w.region}
            {(w.alert_count ?? 0) > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {w.alert_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main weather widget */}
      {selected && (
        <div className="bg-gradient-to-br from-forest to-forest-mid rounded-2xl p-7 text-white mb-6">
          <div className="flex items-center gap-5 mb-5">
            <span className="text-7xl">{weatherEmoji(selected.description)}</span>
            <div>
              <p className="text-6xl font-serif">{selected.temperature}°C</p>
              <p className="text-base opacity-80 capitalize">{selected.description || t.weatherCurrentConditions}</p>
              <p className="text-sm opacity-60 mt-1">📍 {selected.region}</p>
              <p className="text-xs opacity-50 mt-0.5">{t.weatherUpdated}: {selected.forecast_date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              [t.weatherHumidity,  `${selected.humidity}%`],
              [t.weatherWind,      `${selected.wind_speed} km/h`],
              [t.weatherRainfall,  `${selected.rainfall} mm`],
              [t.weatherFeelsLike, `${selected.feels_like ?? selected.temperature}°C`],
            ].map(([label, val]) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{val}</p>
                <p className="text-xs opacity-70 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All regions summary */}
      <h3 className="font-serif text-xl mb-4">{t.weatherAllRegions}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {weather.map(w => (
          <div
            key={w.region}
            onClick={() => setSelected(w)}
            className="card mb-0 cursor-pointer hover:-translate-y-0.5 transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{w.region.split('—')[1]?.trim()}</p>
                <p className="text-3xl font-serif text-forest mt-1">{w.temperature}°C</p>
                <p className="text-xs text-muted capitalize mt-0.5">{w.description || '—'}</p>
              </div>
              <div className="text-5xl">{weatherEmoji(w.description)}</div>
            </div>
            <div className="flex gap-3 mt-3 text-xs text-muted">
              <span>💧 {w.humidity}%</span>
              <span>💨 {w.wind_speed} km/h</span>
              <span>🌧 {w.rainfall} mm</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active alerts */}
      <h3 className="font-serif text-xl mb-4">
        {t.weatherActiveAlerts}
        {alerts.length > 0 && (
          <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-sans">
            {alerts.length}
          </span>
        )}
      </h3>
      {alerts.length === 0 ? (
        <p className="text-muted text-sm">{t.weatherNoAlerts}</p>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.alert_id} className={`flex items-start gap-3 border rounded-xl px-4 py-4 ${severityStyle(a.message)}`}>
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
