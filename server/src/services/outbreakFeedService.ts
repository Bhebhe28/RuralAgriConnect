/**
 * Live outbreak feed via iNaturalist public API (free, no API key needed).
 * Queries real field observations of agricultural pests in KZN coordinates.
 */

// KZN bounding box
const KZN = { nelat: -26.8, nelng: 32.9, swlat: -31.5, swlng: 28.8 };

// Assign district from lat/lon (approximate municipal boundaries)
function kznRegion(lat: number, lon: number): string {
  if (lat > -30.2 && lat < -29.4 && lon > 30.5 && lon < 31.2) return 'KwaZulu-Natal — eThekwini';
  if (lat > -30.0 && lat < -29.2 && lon > 29.8 && lon < 30.7) return 'KwaZulu-Natal — uMgungundlovu';
  if (lat > -29.6 && lat < -28.8 && lon > 30.8 && lon < 31.6) return 'KwaZulu-Natal — iLembe';
  if (lat > -28.6 && lat < -27.2 && lon > 30.8 && lon < 32.8) return 'KwaZulu-Natal — Zululand';
  if (lat > -29.5 && lat < -28.3 && lon > 29.2 && lon < 30.6) return 'KwaZulu-Natal — uThukela';
  return 'KwaZulu-Natal — KZN';
}

interface PestDef {
  taxonName: string;
  commonName: string;
  crop: string;
  severity: 'critical' | 'warning' | 'info';
  tip: string;
}

const PESTS: PestDef[] = [
  {
    taxonName: 'Spodoptera frugiperda',
    commonName: 'Fall Armyworm',
    crop: 'Maize',
    severity: 'critical',
    tip: 'Apply Coragen or Ampligo insecticide early morning. Scout every 7 days — treat when >8 larvae per 100 plants.',
  },
  {
    taxonName: 'Tuta absoluta',
    commonName: 'Tomato Leaf Miner',
    crop: 'Vegetables',
    severity: 'critical',
    tip: 'Use pheromone traps and apply spinosad or emamectin benzoate. Remove and destroy infested leaves.',
  },
  {
    taxonName: 'Bemisia tabaci',
    commonName: 'Silverleaf Whitefly',
    crop: 'Vegetables',
    severity: 'warning',
    tip: 'Apply imidacloprid or use yellow sticky traps. Avoid excessive nitrogen fertilisation.',
  },
  {
    taxonName: 'Helicoverpa armigera',
    commonName: 'Cotton Bollworm',
    crop: 'Maize',
    severity: 'warning',
    tip: 'Apply Bt-based or pyrethroid sprays at first sign of damage. Use pheromone traps for monitoring.',
  },
  {
    taxonName: 'Locusta migratoria',
    commonName: 'Migratory Locust',
    crop: 'Maize',
    severity: 'critical',
    tip: 'Report to DALRRD immediately. Apply chlorpyrifos or malathion bait sprays. Coordinate with neighbouring farms.',
  },
  {
    taxonName: 'Phytophthora infestans',
    commonName: 'Late Blight',
    crop: 'Vegetables',
    severity: 'warning',
    tip: 'Apply copper oxychloride or mancozeb preventatively every 7–10 days. Avoid overhead irrigation.',
  },
  {
    taxonName: 'Spodoptera exempta',
    commonName: 'African Armyworm',
    crop: 'Maize',
    severity: 'critical',
    tip: 'Spray cypermethrin or chlorpyrifos on larvae. Act fast — armyworm spreads rapidly between fields.',
  },
  {
    taxonName: 'Tetranychus urticae',
    commonName: 'Two-spotted Spider Mite',
    crop: 'Vegetables',
    severity: 'warning',
    tip: 'Apply abamectin or wettable sulphur. Increase humidity and avoid water stress in plants.',
  },
];

export interface LiveAlert {
  region: string;
  crop_type: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  source_url?: string;
  observed_on?: string;
}

async function fetchPestObservations(pest: PestDef, daysBack = 90): Promise<LiveAlert[]> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = new URL('https://api.inaturalist.org/v1/observations');
  url.searchParams.set('taxon_name',  pest.taxonName);
  url.searchParams.set('nelat',       String(KZN.nelat));
  url.searchParams.set('nelng',       String(KZN.nelng));
  url.searchParams.set('swlat',       String(KZN.swlat));
  url.searchParams.set('swlng',       String(KZN.swlng));
  url.searchParams.set('order_by',    'created_at');
  url.searchParams.set('order',       'desc');
  url.searchParams.set('per_page',    '3');
  url.searchParams.set('d1',          since);
  url.searchParams.set('quality_grade', 'research,needs_id');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'RurAgriConnect/1.0 (KZN agricultural app)' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];
  const data = await res.json() as any;
  if (!data.results?.length) return [];

  // Group to one alert per region per pest
  const regionsSeen = new Set<string>();
  const alerts: LiveAlert[] = [];

  for (const obs of data.results) {
    const lat = obs.location ? parseFloat(obs.location.split(',')[0]) : null;
    const lon = obs.location ? parseFloat(obs.location.split(',')[1]) : null;
    const region = (lat && lon) ? kznRegion(lat, lon) : 'KwaZulu-Natal — KZN';
    if (regionsSeen.has(region)) continue;
    regionsSeen.add(region);

    const place  = obs.place_guess || region.split('— ')[1] || 'KZN';
    const date   = obs.observed_on || obs.created_at?.split('T')[0] || '';
    const obsUrl = `https://www.inaturalist.org/observations/${obs.id}`;

    alerts.push({
      region,
      crop_type: pest.crop,
      severity:  pest.severity,
      source_url: obsUrl,
      observed_on: date,
      description: `🔴 ${pest.commonName} (${pest.taxonName}) observed near ${place} on ${date}. ${pest.tip} [Source: iNaturalist observation #${obs.id}]`,
    });
  }

  return alerts;
}

export async function fetchLiveOutbreakAlerts(): Promise<LiveAlert[]> {
  const results = await Promise.allSettled(PESTS.map(p => fetchPestObservations(p)));
  const alerts: LiveAlert[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') alerts.push(...r.value);
  }
  return alerts;
}
