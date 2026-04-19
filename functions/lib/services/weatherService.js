"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndSaveWeather = fetchAndSaveWeather;
const uuid_1 = require("uuid");
const firestore_1 = require("../db/firestore");
const KZN_REGIONS = [
    { name: 'KwaZulu-Natal — eThekwini', lat: -29.8587, lon: 31.0218 },
    { name: 'KwaZulu-Natal — uMgungundlovu', lat: -29.6006, lon: 30.3794 },
    { name: 'KwaZulu-Natal — iLembe', lat: -29.3833, lon: 31.1500 },
    { name: 'KwaZulu-Natal — Zululand', lat: -27.7667, lon: 31.9000 },
    { name: 'KwaZulu-Natal — uThukela', lat: -28.7333, lon: 29.4667 },
];
async function fetchAndSaveWeather() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey === 'your_openweather_api_key_here') {
        console.warn('⚠️  No OpenWeatherMap API key — using mock weather data');
        return getMockWeather();
    }
    const results = [];
    const today = new Date().toISOString().split('T')[0];
    for (const region of KZN_REGIONS) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${region.lat}&lon=${region.lon}&appid=${apiKey}&units=metric`;
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const weather = {
                region: region.name,
                temperature: Math.round(data.main.temp),
                feels_like: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                rainfall: data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
                wind_speed: Math.round(data.wind.speed * 3.6),
                description: data.weather[0].description,
                icon: data.weather[0].icon,
                forecast_date: today,
            };
            // Delete old entry for today and save fresh
            const old = await (0, firestore_1.getDocs)('weather_data', [['region', '==', region.name], ['forecast_date', '==', today]]);
            await Promise.all(old.map((o) => (0, firestore_1.deleteDoc)('weather_data', o.id)));
            await (0, firestore_1.setDoc)('weather_data', (0, uuid_1.v4)(), { ...weather, created_at: (0, firestore_1.now)() });
            await checkAndCreateAlert(weather);
            results.push(weather);
            console.log(`✅ Weather: ${region.name} — ${weather.temperature}°C`);
        }
        catch (err) {
            console.warn(`⚠️  Weather unavailable for ${region.name}: ${err.message}`);
        }
    }
    return results.length > 0 ? results : getMockWeather();
}
async function checkAndCreateAlert(w) {
    const today = new Date().toISOString().split('T')[0];
    if (w.rainfall > 20) {
        const exists = await (0, firestore_1.getDocs)('alerts', [['alert_type', '==', 'weather']]);
        const alreadyExists = exists.some((a) => a.message?.includes('Heavy rainfall') && a.message?.includes(w.region) &&
            a.created_at?.startsWith(today));
        if (!alreadyExists) {
            await (0, firestore_1.setDoc)('alerts', (0, uuid_1.v4)(), {
                alert_type: 'weather',
                message: `Heavy rainfall (${w.rainfall}mm) expected in ${w.region}. Delay fertilizer application and check drainage channels.`,
                issued_by: null, created_at: (0, firestore_1.now)(),
            });
        }
    }
    if (w.temperature > 35) {
        const exists = await (0, firestore_1.getDocs)('alerts', [['alert_type', '==', 'weather']]);
        const alreadyExists = exists.some((a) => a.message?.includes('Heatwave') && a.message?.includes(w.region) &&
            a.created_at?.startsWith(today));
        if (!alreadyExists) {
            await (0, firestore_1.setDoc)('alerts', (0, uuid_1.v4)(), {
                alert_type: 'weather',
                message: `Heatwave alert: ${w.temperature}°C in ${w.region}. Increase irrigation frequency and apply mulch.`,
                issued_by: null, created_at: (0, firestore_1.now)(),
            });
        }
    }
}
function getMockWeather() {
    const today = new Date().toISOString().split('T')[0];
    return KZN_REGIONS.map((r, i) => ({
        region: r.name,
        temperature: [26, 24, 28, 35, 22][i],
        feels_like: [28, 26, 30, 38, 24][i],
        humidity: [72, 68, 65, 45, 75][i],
        rainfall: [12, 5, 0, 0, 18][i],
        wind_speed: [18, 14, 20, 22, 16][i],
        description: ['Partly cloudy', 'Sunny', 'Clear sky', 'Hot and dry', 'Light rain'][i],
        icon: ['02d', '01d', '01d', '01d', '10d'][i],
        forecast_date: today,
    }));
}
//# sourceMappingURL=weatherService.js.map