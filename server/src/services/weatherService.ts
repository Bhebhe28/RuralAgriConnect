import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';
import type { Database } from 'sql.js';

function writeSmsNotifications(db: Database, alertId: string, region: string) {
  try {
    const regionShort = region.split('—')[1]?.trim() || region;
    const farmers = query<any>(db,
      `SELECT f.farmer_id FROM farmers f WHERE f.region LIKE ? OR f.region IS NULL`,
      [`%${regionShort}%`]
    );
    farmers.forEach((f: any) => {
      run(db,
        `INSERT INTO sms_notifications (sms_id, farmer_id, alert_id, status) VALUES (?,?,?,?)`,
        [uuidv4(), f.farmer_id, alertId, 'pending']
      );
    });
  } catch (e) {
    // Non-critical — don't break weather fetch
  }
}

// KZN regions mapped to coordinates
const KZN_REGIONS = [
  { name: 'KwaZulu-Natal — eThekwini',      lat: -29.8587, lon: 31.0218 },
  { name: 'KwaZulu-Natal — uMgungundlovu',  lat: -29.6006, lon: 30.3794 },
  { name: 'KwaZulu-Natal — iLembe',         lat: -29.3833, lon: 31.1500 },
  { name: 'KwaZulu-Natal — Zululand',       lat: -27.7667, lon: 31.9000 },
  { name: 'KwaZulu-Natal — uThukela',       lat: -28.7333, lon: 29.4667 },
];

export interface WeatherResult {
  region: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  description: string;
  icon: string;
  forecast_date: string;
}

export async function fetchAndSaveWeather(): Promise<WeatherResult[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    console.warn('⚠️  No OpenWeatherMap API key set — using mock weather data');
    return getMockWeather();
  }

  const results: WeatherResult[] = [];
  const db = await getDb();

  for (const region of KZN_REGIONS) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${region.lat}&lon=${region.lon}&appid=${apiKey}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as any;

      const weather: WeatherResult = {
        region:        region.name,
        temperature:   Math.round(data.main.temp),
        feels_like:    Math.round(data.main.feels_like),
        humidity:      data.main.humidity,
        rainfall:      data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
        wind_speed:    Math.round(data.wind.speed * 3.6), // m/s → km/h
        description:   data.weather[0].description,
        icon:          data.weather[0].icon,
        forecast_date: new Date().toISOString().split('T')[0],
      };

      // Save to DB — replace today's entry for this region
      run(db,
        `DELETE FROM weather_data WHERE region = ? AND forecast_date = ?`,
        [weather.region, weather.forecast_date]
      );
      run(db,
        `INSERT INTO weather_data (weather_id,region,forecast_date,temperature,humidity,rainfall,wind_speed)
         VALUES (?,?,?,?,?,?,?)`,
        [uuidv4(), weather.region, weather.forecast_date,
         weather.temperature, weather.humidity, weather.rainfall, weather.wind_speed]
      );

      // Auto-create alert if conditions are extreme
      await checkAndCreateAlert(weather);

      results.push(weather);
      console.log(`✅ Weather fetched: ${region.name} — ${weather.temperature}°C`);
    } catch (err: any) {
      const msg = err.message?.includes('fetch failed') || err.message?.includes('ENOTFOUND')
        ? 'No internet — using cached data'
        : err.message;
      console.warn(`⚠️  Weather unavailable for ${region.name}: ${msg}`);
    }
  }

  return results.length > 0 ? results : getMockWeather();
}

async function checkAndCreateAlert(w: WeatherResult) {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];

  // Heavy rain alert
  if (w.rainfall > 20) {
    const exists = query(db,
      `SELECT alert_id FROM alerts WHERE alert_type='weather' AND message LIKE ? AND DATE(created_at)=?`,
      [`%Heavy rainfall%${w.region}%`, today]
    );
    if (!exists.length) {
      const alertId = uuidv4();
      run(db,
        `INSERT INTO alerts (alert_id,alert_type,message,issued_by) VALUES (?,?,?,?)`,
        [alertId, 'weather',
         `Heavy rainfall (${w.rainfall}mm) expected in ${w.region}. Delay fertilizer application and check drainage channels.`,
         null]
      );
      writeSmsNotifications(db, alertId, w.region);
      console.log(`🚨 Auto-alert created: Heavy rain in ${w.region}`);
    }
  }

  // Heatwave alert
  if (w.temperature > 35) {
    const exists = query(db,
      `SELECT alert_id FROM alerts WHERE alert_type='weather' AND message LIKE ? AND DATE(created_at)=?`,
      [`%Heatwave%${w.region}%`, today]
    );
    if (!exists.length) {
      const alertId = uuidv4();
      run(db,
        `INSERT INTO alerts (alert_id,alert_type,message,issued_by) VALUES (?,?,?,?)`,
        [alertId, 'weather',
         `Heatwave alert: ${w.temperature}°C in ${w.region}. Increase irrigation frequency and apply mulch to retain soil moisture.`,
         null]
      );
      writeSmsNotifications(db, alertId, w.region);
      console.log(`🚨 Auto-alert created: Heatwave in ${w.region}`);
    }
  }

  // High wind alert
  if (w.wind_speed > 50) {
    const alertId = uuidv4();
    run(db,
      `INSERT INTO alerts (alert_id,alert_type,message,issued_by) VALUES (?,?,?,?)`,
      [alertId, 'weather',
       `High wind warning: ${w.wind_speed}km/h in ${w.region}. Secure structures and avoid spraying.`,
       null]
    );
    writeSmsNotifications(db, alertId, w.region);
  }
}

function getMockWeather(): WeatherResult[] {
  return KZN_REGIONS.map((r, i) => ({
    region:        r.name,
    temperature:   [26, 24, 28, 35, 22][i],
    feels_like:    [28, 26, 30, 38, 24][i],
    humidity:      [72, 68, 65, 45, 75][i],
    rainfall:      [12,  5,  0,  0, 18][i],
    wind_speed:    [18, 14, 20, 22, 16][i],
    description:   ['Partly cloudy','Sunny','Clear sky','Hot and dry','Light rain'][i],
    icon:          ['02d','01d','01d','01d','10d'][i],
    forecast_date: new Date().toISOString().split('T')[0],
  }));
}
