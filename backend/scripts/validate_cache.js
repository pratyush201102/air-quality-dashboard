const fs = require('fs');
const path = require('path');
const CACHE_DIR = path.join(__dirname, '..', 'cache');

function validateForecastFile(p) {
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const data = raw && raw.data ? raw.data : raw;
    if (!data || !Array.isArray(data.forecast)) return { ok: false, reason: 'no-forecast' };
    for (let i = 0; i < data.forecast.length; i++) {
      const f = data.forecast[i];
      if (typeof f.aqi !== 'number') return { ok: false, reason: `missing-aqi-${i}` };
      if (typeof f.low !== 'number' || typeof f.high !== 'number') return { ok: false, reason: `missing-low-high-${i}` };
      if (f.high < f.low) return { ok: false, reason: `high-less-than-low-${i}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'parse-error' };
  }
}

(async function main() {
  if (!fs.existsSync(CACHE_DIR)) { console.log('No cache dir found at', CACHE_DIR); process.exit(0); }
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.startsWith('forecast-') && f.endsWith('.json'));
  let allOk = true;
  for (const f of files) {
    const p = path.join(CACHE_DIR, f);
    const r = validateForecastFile(p);
    if (!r.ok) {
      allOk = false;
      console.error('Invalid forecast file:', f, r.reason);
    } else {
      console.log('OK:', f);
    }
  }
  process.exit(allOk ? 0 : 2);
})();
