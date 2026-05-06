import React, { useState, useEffect } from 'react';
import { getCropCalendar } from '../services/firestore';

interface CalendarEntry {
  id: string;
  calendar_id?: string;
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

const DEFAULT_CALENDAR: CalendarEntry[] = [
  { id: 'c1',  crop_type: 'Maize',      region: 'KwaZulu-Natal', activity: 'Land Preparation', month_start: 8,  month_end: 10, description: 'Clear fields, plough and disc. Apply agricultural lime if soil pH < 5.5, ideally 2–3 weeks before planting.' },
  { id: 'c2',  crop_type: 'Maize',      region: 'KwaZulu-Natal', activity: 'Planting',          month_start: 10, month_end: 12, description: 'Plant at 75cm row spacing, 25cm between plants. Use certified seed. Apply 2:3:2 (22) basal fertilizer at planting.' },
  { id: 'c3',  crop_type: 'Maize',      region: 'KwaZulu-Natal', activity: 'Weed Control',      month_start: 11, month_end: 1,  description: 'Apply pre-emergent herbicide after planting. Hand weed or cultivate when maize is knee-high.' },
  { id: 'c4',  crop_type: 'Maize',      region: 'KwaZulu-Natal', activity: 'Top Dressing',      month_start: 12, month_end: 2,  description: 'Apply LAN (28% N) at 150–200 kg/ha when maize reaches the V6 stage (knee high). Avoid applying during drought.' },
  { id: 'c5',  crop_type: 'Maize',      region: 'KwaZulu-Natal', activity: 'Pest Scouting',     month_start: 11, month_end: 4,  description: 'Scout weekly for Fall Armyworm, stalk borer, and aphids. Apply Coragen or Ampligo when threshold is exceeded.' },
  { id: 'c6',  crop_type: 'Maize',      region: 'KwaZulu-Natal', activity: 'Harvesting',        month_start: 4,  month_end: 6,  description: 'Harvest when grain moisture is 12–14%. Dry cobs on elevated racks. Store in cool, dry, rodent-proof conditions.' },
  { id: 'c7',  crop_type: 'Vegetables', region: 'KwaZulu-Natal', activity: 'Seedbed Prep',      month_start: 1,  month_end: 3,  description: 'Prepare a fine seedbed with good drainage. Incorporate compost at 5 tons/ha. Add 2:3:2 NPK basal fertilizer.' },
  { id: 'c8',  crop_type: 'Vegetables', region: 'KwaZulu-Natal', activity: 'Transplanting',     month_start: 2,  month_end: 4,  description: 'Transplant seedlings in the evening or on cloudy days to reduce transplant shock. Water immediately after transplanting.' },
  { id: 'c9',  crop_type: 'Vegetables', region: 'KwaZulu-Natal', activity: 'Weed Control',      month_start: 2,  month_end: 5,  description: 'Hand weed regularly. Apply mulch to suppress weeds and retain soil moisture. Avoid deep cultivation near roots.' },
  { id: 'c10', crop_type: 'Vegetables', region: 'KwaZulu-Natal', activity: 'Fertilizing',       month_start: 2,  month_end: 5,  description: 'Apply balanced NPK foliar spray every 2 weeks. Supplement with compost tea for organic production.' },
  { id: 'c11', crop_type: 'Vegetables', region: 'KwaZulu-Natal', activity: 'Irrigation',        month_start: 10, month_end: 4,  description: 'Water consistently. Drip irrigation is ideal. Avoid overhead watering in late afternoon to reduce fungal disease risk.' },
  { id: 'c12', crop_type: 'Vegetables', region: 'KwaZulu-Natal', activity: 'Harvesting',        month_start: 4,  month_end: 7,  description: 'Harvest in the cool morning hours. Grade and pack carefully to minimise bruising and post-harvest losses.' },
  { id: 'c13', crop_type: 'Legumes',    region: 'KwaZulu-Natal', activity: 'Land Preparation',  month_start: 9,  month_end: 10, description: 'Plough and disc field. Legumes fix nitrogen — avoid high-N fertilizers. Target soil pH of 6.0–6.5.' },
  { id: 'c14', crop_type: 'Legumes',    region: 'KwaZulu-Natal', activity: 'Planting',          month_start: 10, month_end: 11, description: 'Inoculate soybean seeds with Rhizobium inoculant. Plant at 75cm rows. Apply phosphorus and potassium fertilizer.' },
  { id: 'c15', crop_type: 'Legumes',    region: 'KwaZulu-Natal', activity: 'Pest Scouting',     month_start: 11, month_end: 2,  description: 'Monitor for pod borers, aphids, and rust disease. Apply copper oxychloride at the first signs of rust.' },
  { id: 'c16', crop_type: 'Legumes',    region: 'KwaZulu-Natal', activity: 'Harvesting',        month_start: 3,  month_end: 5,  description: 'Harvest when pods are brown and dry. Thresh carefully to avoid seed damage. Dry to below 12% moisture before storage.' },
  { id: 'c17', crop_type: 'Root Crops', region: 'KwaZulu-Natal', activity: 'Land Preparation',  month_start: 7,  month_end: 9,  description: 'Deep plough to 30cm for potatoes and sweet potatoes. Ensure excellent drainage. Incorporate compost at planting depth.' },
  { id: 'c18', crop_type: 'Root Crops', region: 'KwaZulu-Natal', activity: 'Planting',          month_start: 8,  month_end: 10, description: 'Plant certified, disease-free seed potatoes. Cut pieces with at least 2 eyes. Apply Ridomil or similar at planting.' },
  { id: 'c19', crop_type: 'Root Crops', region: 'KwaZulu-Natal', activity: 'Irrigation',        month_start: 8,  month_end: 12, description: 'Consistent soil moisture is critical for tuber development. Reduce irrigation 2 weeks before harvest to prevent rot.' },
  { id: 'c20', crop_type: 'Root Crops', region: 'KwaZulu-Natal', activity: 'Pest Scouting',     month_start: 9,  month_end: 12, description: 'Scout for late blight, black scurf, and tuber moth. Apply preventative fungicide sprays during wet weather.' },
  { id: 'c21', crop_type: 'Root Crops', region: 'KwaZulu-Natal', activity: 'Harvesting',        month_start: 11, month_end: 3,  description: 'Harvest in dry weather. Allow tubers to cure for 2 weeks at 15°C before storage. Store in cool, dark, well-ventilated conditions.' },
];

function activityColor(activity: string) {
  return ACTIVITY_COLORS[activity] || 'bg-sand text-dark border-sand';
}

function isActiveInMonth(entry: CalendarEntry, month: number): boolean {
  const s = entry.month_start;
  const e = entry.month_end;
  if (s <= e) return month >= s && month <= e;
  return month >= s || month <= e;
}

export default function CropCalendar() {
  const [entries, setEntries]   = useState<CalendarEntry[]>(DEFAULT_CALENDAR);
  const [loading, setLoading]   = useState(true);
  const [cropFilter, setCropFilter] = useState('All');
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    getCropCalendar()
      .then(data => {
        if (data.length > 0) setEntries(data as CalendarEntry[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = cropFilter === 'All' ? entries : entries.filter(e => e.crop_type === cropFilter);

  const byCrop = filtered.reduce<Record<string, CalendarEntry[]>>((acc, e) => {
    if (!acc[e.crop_type]) acc[e.crop_type] = [];
    acc[e.crop_type].push(e);
    return acc;
  }, {});

  const currentActivities = entries.filter(e => isActiveInMonth(e, currentMonth));

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-serif">📅 Crop Calendar</h2>
        <p className="text-sm text-muted mt-0.5">KwaZulu-Natal seasonal farming schedule — know exactly what to do each month</p>
      </div>

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
              <button key={a.id}
                onClick={() => setSelected(a)}
                className="bg-white/15 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors cursor-pointer">
                🌾 {a.crop_type} — {a.activity}
              </button>
            ))}
          </div>
        </div>
      )}

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
                      <tr key={entry.id} className="border-t border-sand/50">
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
                                }`}>✓</div>
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
                <span className="font-semibold">{MONTHS[selected.month_start - 1]} — {MONTHS[selected.month_end - 1]}</span>
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
