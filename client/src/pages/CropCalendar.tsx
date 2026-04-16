import React, { useState, useEffect } from 'react';
import api from '../api/client';

interface CalendarEntry {
  calendar_id: string;
  crop_type: string;
  region: string;
  activity: string;
  month_start: number;
  month_end: number;
  description: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CROPS  = ['All', 'Maize', 'Vegetables', 'Legumes', 'Poultry', 'Root Crops'];

const ACTIVITY_COLORS: Record<string, string> = {
  'Land Preparation': 'bg-amber-100 text-amber-800 border-amber-200',
  'Planting':         'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Transplanting':    'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Seedbed Prep':     'bg-amber-100 text-amber-800 border-amber-200',
  'Weed Control':     'bg-orange-100 text-orange-800 border-orange-200',
  'Top Dressing':     'bg-blue-100 text-blue-800 border-blue-200',
  'Fertilizing':      'bg-blue-100 text-blue-800 border-blue-200',
  'Pest Scouting':    'bg-red-100 text-red-800 border-red-200',
  'Irrigation':       'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Harvesting':       'bg-forest/10 text-forest border-forest/20',
  'Slaughter':        'bg-forest/10 text-forest border-forest/20',
  'Brooding':         'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Vaccination':      'bg-purple-100 text-purple-800 border-purple-200',
};

function activityColor(activity: string) {
  return ACTIVITY_COLORS[activity] || 'bg-sand text-dark border-sand';
}

function isActiveInMonth(entry: CalendarEntry, month: number): boolean {
  const s = entry.month_start;
  const e = entry.month_end;
  if (s <= e) return month >= s && month <= e;
  // Wraps year (e.g. Oct–Feb)
  return month >= s || month <= e;
}

export default function CropCalendar() {
  const [entries, setEntries]   = useState<CalendarEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [cropFilter, setCropFilter] = useState('All');
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  useEffect(() => {
    api.get('/calendar').then(r => {
      setEntries(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = cropFilter === 'All' ? entries : entries.filter(e => e.crop_type === cropFilter);

  // Group by crop
  const byCrop = filtered.reduce<Record<string, CalendarEntry[]>>((acc, e) => {
    if (!acc[e.crop_type]) acc[e.crop_type] = [];
    acc[e.crop_type].push(e);
    return acc;
  }, {});

  // Current month activities
  const currentActivities = entries.filter(e => isActiveInMonth(e, currentMonth));

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-serif">📅 Crop Calendar</h2>
        <p className="text-sm text-muted mt-0.5">KwaZulu-Natal seasonal farming schedule — know exactly what to do each month</p>
      </div>

      {/* Current month highlight */}
      {currentActivities.length > 0 && (
        <div className="bg-gradient-to-r from-forest to-forest-mid rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📌</span>
            <div>
              <p className="font-semibold">This Month — {MONTHS[currentMonth - 1]}</p>
              <p className="text-white/60 text-xs">{currentActivities.length} activities in progress</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentActivities.map(a => (
              <button key={a.calendar_id}
                onClick={() => setSelected(a)}
                className="bg-white/15 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors cursor-pointer">
                🌾 {a.crop_type} — {a.activity}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crop filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CROPS.map(c => (
          <button key={c} onClick={() => setCropFilter(c)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
              cropFilter === c ? 'bg-forest text-white border-forest' : 'bg-white border-sand text-muted hover:border-moss'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-12 text-muted">Loading calendar…</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCrop).map(([crop, cropEntries]) => (
            <div key={crop} className="card">
              <h3 className="font-serif text-lg mb-4">🌾 {crop}</h3>

              {/* Month grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-4 text-muted font-bold uppercase tracking-wide w-36">Activity</th>
                      {MONTHS.map((m, i) => (
                        <th key={m} className={`text-center py-2 px-1 font-bold w-10 ${
                          i + 1 === currentMonth ? 'text-forest bg-moss/10 rounded-t-lg' : 'text-muted'
                        }`}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cropEntries.map(entry => (
                      <tr key={entry.calendar_id} className="border-t border-sand/50">
                        <td className="py-2 pr-4">
                          <button onClick={() => setSelected(entry)}
                            className={`text-xs px-2 py-1 rounded-lg border font-medium text-left w-full hover:opacity-80 transition-opacity cursor-pointer ${activityColor(entry.activity)}`}>
                            {entry.activity}
                          </button>
                        </td>
                        {MONTHS.map((_, i) => {
                          const month = i + 1;
                          const active = isActiveInMonth(entry, month);
                          return (
                            <td key={month} className={`text-center py-2 px-1 ${month === currentMonth ? 'bg-moss/5' : ''}`}>
                              {active ? (
                                <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-white text-xs font-bold ${
                                  month === currentMonth ? 'bg-forest scale-110' : 'bg-moss/70'
                                }`}>
                                  ✓
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full mx-auto bg-sand/50" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`badge mb-2 ${activityColor(selected.activity)}`}>{selected.activity}</span>
                <h3 className="font-serif text-xl">{selected.crop_type}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-dark text-xl bg-transparent border-0 cursor-pointer">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted w-20">Period:</span>
                <span className="font-semibold">
                  {MONTHS[selected.month_start - 1]} — {MONTHS[selected.month_end - 1]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted w-20">Region:</span>
                <span className="font-semibold">{selected.region}</span>
              </div>
              {selected.description && (
                <div className="bg-cream rounded-xl p-4 mt-2">
                  <p className="text-sm leading-relaxed">{selected.description}</p>
                </div>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="btn-primary w-full mt-5">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
