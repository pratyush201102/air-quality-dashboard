const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Small mapping of cities -> coords used by the dashboard
const cities = [
  { name: 'Los Angeles', slug: 'los-angeles', lat: 34.052235, lon: -118.243683 },
  { name: 'Beijing', slug: 'beijing', lat: 39.904202, lon: 116.407394 },
  { name: 'Delhi', slug: 'delhi', lat: 28.704060, lon: 77.102493 },
  { name: 'London', slug: 'london', lat: 51.507351, lon: -0.127758 },
];

// Simple AQI conversion using US EPA breakpoints for PM2.5 and PM10
// Returns approximate AQI for given pm25 and pm10 values
function aqiFromPm25(pm25) {
  if (pm25 === null || pm25 === undefined) return null;
  const bp = [
    { c_low: 0.0, c_high: 12.0, i_low: 0, i_high: 50 },
    { c_low: 12.1, c_high: 35.4, i_low: 51, i_high: 100 },
    { c_low: 35.5, c_high: 55.4, i_low: 101, i_high: 150 },
    { c_low: 55.5, c_high: 150.4, i_low: 151, i_high: 200 },
    { c_low: 150.5, c_high: 250.4, i_low: 201, i_high: 300 },
    { c_low: 250.5, c_high: 350.4, i_low: 301, i_high: 400 },
    { c_low: 350.5, c_high: 500.4, i_low: 401, i_high: 500 },
  ];
  for (const b of bp) {
    if (pm25 >= b.c_low && pm25 <= b.c_high) {
      const aqi = ((b.i_high - b.i_low) / (b.c_high - b.c_low)) * (pm25 - b.c_low) + b.i_low;
      return Math.round(aqi);
    }
  }
  return Math.round(pm25 * 2);
}
function aqiFromPm10(pm10) {
  if (pm10 === null || pm10 === undefined) return null;
  const bp = [
    { c_low: 0, c_high: 54, i_low: 0, i_high: 50 },
    { c_low: 55, c_high: 154, i_low: 51, i_high: 100 },
    { c_low: 155, c_high: 254, i_low: 101, i_high: 150 },
    { c_low: 255, c_high: 354, i_low: 151, i_high: 200 },
    { c_low: 355, c_high: 424, i_low: 201, i_high: 300 },
    { c_low: 425, c_high: 504, i_low: 301, i_high: 400 },
    { c_low: 505, c_high: 604, i_low: 401, i_high: 500 },
  ];
  for (const b of bp) {
    if (pm10 >= b.c_low && pm10 <= b.c_high) {
      const aqi = ((b.i_high - b.i_low) / (b.c_high - b.c_low)) * (pm10 - b.c_low) + b.i_low;
      return Math.round(aqi);
    }
  }
  return Math.round(pm10 * 1.5);
}
function aqiFromPollutants(pm25, pm10) {
  const a1 = aqiFromPm25(pm25);
  const a2 = aqiFromPm10(pm10);
  if (a1 === null && a2 === null) return null;
  if (a1 === null) return a2;
  if (a2 === null) return a1;
  return Math.max(a1, a2);
}

async function fetchCityHistory(city, days = 7) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  // Open-Meteo Air Quality API
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&start_date=${startDate}&end_date=${endDate}&hourly=pm10,pm2_5,no2,carbon_monoxide`;
  console.log('Fetching', city.name, url);
  try {
    const resp = await axios.get(url, { timeout: 20000 });
    const payload = resp.data;
    if (!payload || !payload.hourly) {
      console.warn('No hourly data for', city.name);
      return null;
    }
    const hourly = payload.hourly;
    const times = hourly.time || [];
    const pm25Arr = hourly.pm2_5 || [];
    const pm10Arr = hourly.pm10 || [];
    const no2Arr = hourly.no2 || [];
    const coArr = hourly.carbon_monoxide || [];

    const out = [];
    for (let i = 0; i < times.length; i++) {
      const ts = new Date(times[i]).getTime();
      const pm25 = pm25Arr[i] === undefined ? null : Number(pm25Arr[i]);
      const pm10 = pm10Arr[i] === undefined ? null : Number(pm10Arr[i]);
      const no2 = no2Arr[i] === undefined ? null : Number(no2Arr[i]);
      const co = coArr[i] === undefined ? null : Number(coArr[i]);
      const aqi = aqiFromPollutants(pm25, pm10);
      out.push({ ts, aqi, pm25, pm10, no2, co });
    }

    return out;
  } catch (err) {
    console.error('Failed to fetch for', city.name, err.message);
    return null;
  }
}

(async function main() {
  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const c of cities) {
    const data = await fetchCityHistory(c, 7);
    let finalData = data;
    if (!finalData) {
      console.warn('No data for', c.name, '- falling back to synthetic data');
      // deterministic synthetic generator (seeded by slug)
      function seedFromString(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; }
      function mulberry32(a) { return function() { var t = (a += 0x6d2b79f5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
      const rand = mulberry32(seedFromString(c.slug));
      const base = Math.floor(rand() * 120) + 30;
      finalData = Array.from({ length: (typeof days === 'number' ? days : 7) * 24 }).map((_, i) => {
        const dd = (typeof days === 'number' ? days : 7);
        const ts = new Date(Date.now() - (dd * 24 - i) * 3600 * 1000).getTime();
        const aqi = Math.max(5, Math.round(base + Math.sin(i / 24) * 20 + rand() * 15));
        return { ts, aqi, pm25: Math.round(aqi * 0.6 + rand() * 10), pm10: Math.round(aqi * 0.5 + rand() * 12), no2: Math.round(rand() * 40), co: Math.round(rand() * 10) };
      });
    }
    const filepath = path.join(outDir, `${c.slug}.json`);
    fs.writeFileSync(filepath, JSON.stringify(finalData, null, 2));
    console.log('Wrote', filepath, 'records:', finalData.length);
  }
  console.log('Done.');
})();
