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

// Small AQI helpers (US EPA breakpoints)
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

// Fetch history per-day and merge pollutant + weather hourly arrays
async function fetchCityHistory(city, days = 7) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  // We'll fetch per-day to avoid large multi-day queries causing 400s.
  const out = [];
  const headers = { 'User-Agent': 'air-quality-dashboard/1.0 (+https://github.com/pratyush201102/air-quality-dashboard)' };

  function dateRangeArray(startDateStr, endDateStr) {
    const arr = [];
    let cur = new Date(startDateStr + 'T00:00:00Z');
    const endD = new Date(endDateStr + 'T00:00:00Z');
    while (cur <= endD) {
      arr.push(cur.toISOString().slice(0,10));
      cur = new Date(cur.getTime() + 24*3600*1000);
    }
    return arr;
  }

  const daysList = dateRangeArray(startDate, endDate);
  // helper to fetch with retries
  async function fetchWithRetry(url, tries = 3, timeout = 20000) {
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const resp = await axios.get(url, { timeout, headers });
        return resp.data;
      } catch (e) {
        // On HTTP errors capture response info (status/body) on final attempt
        if (attempt === tries) {
          e._attempts = attempt;
          throw e;
        }
        const wait = Math.pow(2, attempt) * 500;
        await new Promise(r => setTimeout(r, wait));
      }
    }
    return null;
  }

  // Try a few variants when air-quality returns 400s; log detailed failures to disk for diagnosis.
  async function tryFetchAirForDay(city, day) {
    // Only request PM2.5 and PM10 to avoid upstream 'no2' parsing errors. This improves success rate.
    const variants = [
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&start_date=${day}&end_date=${day}&hourly=pm10,pm2_5&timezone=UTC`,
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&start_date=${day}&end_date=${day}&hourly=pm10,pm2_5`,
    ];
    for (const url of variants) {
      try {
        const data = await fetchWithRetry(url, 3, 20000);
        if (data) return data;
      } catch (err) {
        // write a compact failure log to backend/cache/fetch_history_errors.log for diagnostics
        try {
          const logPath = path.join(__dirname, '..', 'cache', 'fetch_history_errors.log');
          const info = {
            ts: new Date().toISOString(),
            city: city.slug || city.name,
            day,
            url,
            status: err && err.response && err.response.status ? err.response.status : null,
            body: err && err.response && err.response.data ? err.response.data : (err && err.message ? err.message : String(err)),
          };
          fs.mkdirSync(path.join(__dirname, '..', 'cache'), { recursive: true });
          fs.appendFileSync(logPath, JSON.stringify(info) + '\n');
        } catch (e) {
          // ignore logging errors
        }
      }
    }
    return null;
  }

  for (const day of daysList) {
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&start_date=${day}&end_date=${day}&hourly=pm10,pm2_5,no2,carbon_monoxide&timezone=UTC`;
    const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${city.lat}&longitude=${city.lon}&start_date=${day}&end_date=${day}&hourly=temperature_2m,windspeed_10m,relativehumidity_2m&timezone=UTC`;
    console.log('Fetching day', day, city.name);
    let air = null, weather = null;
    try {
      air = await tryFetchAirForDay(city, day);
    } catch (e) {
      console.warn('Air fetch failed for', city.name, day, e && e.message ? e.message : e);
    }
    try {
      weather = await fetchWithRetry(weatherUrl, 3);
    } catch (e) {
      console.warn('Weather fetch failed for', city.name, day, e && e.message ? e.message : e);
    }

    if (!air || !air.hourly || !Array.isArray(air.hourly.time)) {
      // skip to next day; we'll rely on synthetic fallback later if entire city fails
      console.warn('No air hourly data for', city.name, day);
      continue;
    }

    const ah = air.hourly;
    const times = ah.time || [];
    const pm25Arr = ah.pm2_5 || [];
    const pm10Arr = ah.pm10 || [];
    const no2Arr = ah.no2 || [];
    const coArr = ah.carbon_monoxide || [];
    const wh = weather && weather.hourly ? weather.hourly : {};
    const tempArr = wh.temperature_2m || [];
    const windArr = wh.windspeed_10m || [];
    const humArr = wh.relativehumidity_2m || [];

    for (let i = 0; i < times.length; i++) {
      const ts = new Date(times[i]).getTime();
      const pm25 = pm25Arr[i] === undefined ? null : Number(pm25Arr[i]);
      const pm10 = pm10Arr[i] === undefined ? null : Number(pm10Arr[i]);
      const no2 = no2Arr[i] === undefined ? null : Number(no2Arr[i]);
      const co = coArr[i] === undefined ? null : Number(coArr[i]);
      const temp = tempArr[i] === undefined ? null : Number(tempArr[i]);
      const wind = windArr[i] === undefined ? null : Number(windArr[i]);
      const humidity = humArr[i] === undefined ? null : Number(humArr[i]);
      const aqi = aqiFromPollutants(pm25, pm10);
      out.push({ ts, aqi, pm25, pm10, no2, co, temp, wind, humidity });
    }
    // polite pause to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  // If we collected nothing, return null so caller falls back to synthetic
  if (out.length === 0) return null;

  // Ensure output is sorted and unique by timestamp (some endpoints may overlap)
  const mapByTs = new Map();
  for (const row of out) mapByTs.set(row.ts, row);
  const final = Array.from(mapByTs.keys()).sort((a,b)=>a-b).map(k => mapByTs.get(k));
    return final;
  }

  (async function main() {
  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const days = 7;
  const summary = { cities: {}, total_real_hours: 0, total_synth_hours: 0 };
  for (const c of cities) {
    const data = await fetchCityHistory(c, days);
    let finalData = data;
    let real_hours = 0;
    let synth_hours = 0;
    if (!finalData) {
      console.warn('No data for', c.name, '- falling back to synthetic data');
      // deterministic synthetic generator (seeded by slug)
      function seedFromString(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; }
      function mulberry32(a) { return function() { var t = (a += 0x6d2b79f5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
      const rand = mulberry32(seedFromString(c.slug));
      const base = Math.floor(rand() * 120) + 30;
      finalData = Array.from({ length: days * 24 }).map((_, i) => {
        const ts = new Date(Date.now() - (days * 24 - i) * 3600 * 1000).getTime();
        const aqi = Math.max(5, Math.round(base + Math.sin(i / 24) * 20 + rand() * 15));
        const temp = Math.round(15 + Math.sin(i / 24) * 8 + rand() * 4);
        const wind = Number((rand() * 6).toFixed(2));
        const humidity = Math.round(40 + rand() * 40);
        return { ts, aqi, pm25: Math.round(aqi * 0.6 + rand() * 10), pm10: Math.round(aqi * 0.5 + rand() * 12), temp, wind, humidity };
      });
      synth_hours = finalData.length;
    } else {
      real_hours = finalData.length;
    }
    const filepath = path.join(outDir, `${c.slug}.json`);
    fs.writeFileSync(filepath, JSON.stringify(finalData, null, 2));
    console.log('Wrote', filepath, 'records:', finalData.length, `(real_hours=${real_hours} synth_hours=${synth_hours})`);
    summary.cities[c.slug] = { real_hours, synth_hours };
    summary.total_real_hours += real_hours;
    summary.total_synth_hours += synth_hours;
  }
  // write a small summary to cache for monitoring
  try {
    const cacheDir = path.join(__dirname, '..', 'cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, 'fetch_history_summary.json'), JSON.stringify(summary, null, 2));
    console.log('Summary written to backend/cache/fetch_history_summary.json');
  } catch (e) {
    // ignore
  }
  console.log('Done.');
})();
