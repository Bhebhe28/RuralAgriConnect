import { v4 as uuidv4 } from 'uuid';
import { getDb, query, run } from '../db/database';

const KZN_REGIONS = [
  { name: 'KwaZulu-Natal — eThekwini',     lat: -29.8587, lon: 31.0218 },
  { name: 'KwaZulu-Natal — uMgungundlovu', lat: -29.6006, lon: 30.3794 },
  { name: 'KwaZulu-Natal — iLembe',        lat: -29.3833, lon: 31.1500 },
  { name: 'KwaZulu-Natal — Zululand',      lat: -27.7667, lon: 31.9000 },
  { name: 'KwaZulu-Natal — uThukela',      lat: -28.7333, lon: 29.4667 },
];

export interface WeatherResult {
  region: string; temperature: number; feels_like: number;
  humidity: number; rainfall: number; wind_speed: number;
  description: string; icon: string; forecast_date: string;
}

export async function fetchAndSaveWeather(): Promise<WeatherResult[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    console.warn('⚠️  No OpenWeatherMap API key — using mock weather data');
    return saveMockWeather();
  }

  const results: WeatherResult[] = [];
  const today = new Date().toISOString().split('T')[0];
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
        wind_speed:    Math.round(data.wind.speed * 3.6),
        description:   data.weather[0].description,
        icon:          data.weather[0].icon,
        forecast_date: today,
      };

      // Delete old entry for today and save fresh
      run(db, `DELETE FROM weather_data WHERE region = ? AND forecast_date = ?`, [region.name, today]);
      run(db, `INSERT INTO weather_data (weather_id, region, forecast_date, temperature, feels_like, humidity, rainfall, wind_speed, description, icon, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), weather.region, weather.forecast_date, weather.temperature, weather.feels_like,
         weather.humidity, weather.rainfall, weather.wind_speed, weather.description, weather.icon,
         new Date().toISOString()]);

      checkAndCreateAlert(db, weather);
      results.push(weather);
      console.log(`✅ Weather: ${region.name} — ${weather.temperature}°C`);
    } catch (err: any) {
      console.warn(`⚠️  Weather unavailable for ${region.name}: ${err.message}`);
    }
  }

  return results.length > 0 ? results : saveMockWeather();
}

function checkAndCreateAlert(db: any, w: WeatherResult) {
  const today = new Date().toISOString().split('T')[0];

  if (w.rainfall > 20) {
    const existing = query<any>(db,
      `SELECT alert_id FROM alerts WHERE alert_type = 'weather' AND message LIKE ? AND created_at LIKE ?`,
      [`%Heavy rainfall%${w.region}%`, `${today}%`]);
    if (!existing.length) {
      run(db, `INSERT INTO alerts (alert_id, alert_type, message, created_at) VALUES (?,?,?,?)`,
        [uuidv4(), 'weather',
         `Heavy rainfall (${w.rainfall}mm) expected in ${w.region}. Delay fertilizer application and check drainage channels.`,
         new Date().toISOString()]);
    }
  }

  if (w.temperature > 35) {
    const existing = query<any>(db,
      `SELECT alert_id FROM alerts WHERE alert_type = 'weather' AND message LIKE ? AND created_at LIKE ?`,
      [`%Heatwave%${w.region}%`, `${today}%`]);
    if (!existing.length) {
      run(db, `INSERT INTO alerts (alert_id, alert_type, message, created_at) VALUES (?,?,?,?)`,
        [uuidv4(), 'weather',
         `Heatwave alert: ${w.temperature}°C in ${w.region}. Increase irrigation frequency and apply mulch.`,
         new Date().toISOString()]);
    }
  }
}

async function saveMockWeather(): Promise<WeatherResult[]> {
  const today = new Date().toISOString().split('T')[0];
  const db = await getDb();
  const mock: WeatherResult[] = KZN_REGIONS.map((r, i) => ({
    region:        r.name,
    temperature:   [26, 24, 28, 35, 22][i],
    feels_like:    [28, 26, 30, 38, 24][i],
    humidity:      [72, 68, 65, 45, 75][i],
    rainfall:      [12,  5,  0,  0, 18][i],
    wind_speed:    [18, 14, 20, 22, 16][i],
    description:   ['Partly cloudy', 'Sunny', 'Clear sky', 'Hot and dry', 'Light rain'][i],
    icon:          ['02d', '01d', '01d', '01d', '10d'][i],
    forecast_date: today,
  }));

  for (const w of mock) {
    run(db, `DELETE FROM weather_data WHERE region = ? AND forecast_date = ?`, [w.region, today]);
    run(db, `INSERT INTO weather_data (weather_id, region, forecast_date, temperature, feels_like, humidity, rainfall, wind_speed, description, icon, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), w.region, w.forecast_date, w.temperature, w.feels_like,
       w.humidity, w.rainfall, w.wind_speed, w.description, w.icon,
       new Date().toISOString()]);
  }
  return mock;
}
