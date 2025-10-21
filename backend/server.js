const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;

// AQICN API Key
const AQICN_KEY = "fd43f848b79493d8249c91a90fae9833c56c41c3";

app.use(cors()); 

// Helper: fetch WAQI feed for a city and normalize fields
async function fetchAqiForCity(cityParam) {
  try {
    const url = `https://api.waqi.info/feed/${encodeURIComponent(cityParam)}/?token=${AQICN_KEY}`;
    const resp = await axios.get(url);
    const body = resp.data;
    if (!body || body.status !== 'ok' || !body.data) return null;
    const { aqi, iaqi, city } = body.data;
    return {
      city: city?.name || cityParam,
      aqi: typeof aqi === 'number' ? aqi : (iaqi?.pm25?.v ? Math.round(iaqi.pm25.v) : null),
      pm25: iaqi?.pm25?.v || 0,
      pm10: iaqi?.pm10?.v || 0,
      no2: iaqi?.no2?.v || 0,
      co: iaqi?.co?.v || 0,
      raw: body.data,
    };
  } catch (err) {
    return null;
  }
}

// Helper: cache current observed AQI to backend/data/current-<slug>.json
function writeCurrentCache(slug, obj) {
  try {
    const path = require('path');
    const fs = require('fs');
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, `current-${slug}.json`);
    fs.writeFileSync(p, JSON.stringify({ ts: Date.now(), ...obj }));
  } catch (e) {
    console.warn('Failed to write current cache', e.message || e);
  }
}

function readCurrentCache(slug, maxAgeMs = 1000 * 60 * 30) { // default 30 minutes
  try {
    const path = require('path');
    const fs = require('fs');
    const p = path.join(__dirname, 'data', `current-${slug}.json`);
    if (!fs.existsSync(p)) return null;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!raw.ts) return null;
    if (Date.now() - raw.ts > maxAgeMs) return null;
    return raw;
  } catch (e) {
    return null;
  }
}

// Root route
app.get("/", (req, res) => {
  res.send(`
    <h1>🌍 Air Quality Backend (AQICN)</h1>
    <p>Try these sample endpoints:</p>
    <ul>
      <li><a href="/api/aqi/Los-Angeles">/api/aqi/Los-Angeles</a></li>
      <li><a href="/api/aqi/Beijing">/api/aqi/Beijing</a></li>
      <li><a href="/api/aqi/Delhi">/api/aqi/Delhi</a></li>
      <li><a href="/api/aqi/London">/api/aqi/London</a></li>
    </ul>
  `);
});

// AQI endpoint
app.get("/api/aqi/:city", async (req, res) => {
  const cityParam = req.params.city;
  console.log('/api/aqi called for', cityParam);

  try {
    const result = await fetchAqiForCity(cityParam);
    if (!result) return res.json({ city: cityParam, message: 'No AQI data available' });
    // write current cache (slugify the city param)
    const slug = cityParam.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      console.log('Writing current cache for', slug);
      writeCurrentCache(slug, result);
      console.log('Wrote current cache for', slug);
    } catch (e) {
      console.warn('Cache write error for', slug, e.message || e);
    }
    res.json(result);
  } catch (error) {
    console.error("AQICN API error:", error.response?.status, error.response?.data || error.message);
    res.json({
      city: cityParam,
      aqi: null,
      pm25: null,
      pm10: null,
      no2: null,
      co: null,
      message: "Error fetching AQI data",
    });
  }
});

// Mock predictive endpoint
app.get("/api/predict/:city", (req, res) => {
  const cityParam = req.params.city;
  // Deterministic simulated forecast per city using a seeded PRNG
  function seedFromString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    }
    return h;
  }

  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const seed = seedFromString(cityParam.toLowerCase());
  const rand = mulberry32(seed);

  const base = Math.floor(rand() * 80) + 40; // base 40-120 deterministic per city
  const forecast = Array.from({ length: 5 }).map((_, i) => {
    const drift = Math.round((Math.sin(i / 2) + rand() * 0.5) * 10);
    const aqi = Math.max(0, base + drift + i * 2);
    return {
      day: `Day ${i + 1}`,
      aqi,
      low: Math.max(0, aqi - Math.round(rand() * 12 + 5)),
      high: aqi + Math.round(rand() * 12 + 5),
    };
  });

  res.json({ city: cityParam, forecast });
});

// --- Simple ML-based forecast (Multiple Linear Regression prototype)
// Endpoint: /api/mlpredict/:city?horizon=24&window=72
app.get('/api/mlpredict/:city', async (req, res) => {
  console.log('Received request for /api/mlpredict', req.path, 'query=', req.query, 'PID=', process.pid);
  const cityParam = req.params.city;
  const horizon = parseInt(req.query.horizon || '24', 10);
  const window = parseInt(req.query.window || '72', 10); // history window in hours

  // Try to load historical data from backend/data/<slug>.json if present, otherwise generate synthetic
  const fs = require('fs');
  const path = require('path');
  const slug = cityParam.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dataPath = path.join(__dirname, 'data', `${slug}.json`);

  let history = null;
  if (fs.existsSync(dataPath)) {
    try {
      history = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (err) {
      console.warn('Failed to parse history file', dataPath, err.message);
      history = null;
    }
  }

  // If no history file, synthesize a small time-series using deterministic seeded PRNG
  if (!history) {
    // synthesize hourly AQI and pollutants for `window` hours
    function seedFromString(s) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
      return h;
    }
    function mulberry32(a) {
      return function () { var t = (a += 0x6d2b79f5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }

    const rand = mulberry32(seedFromString(slug));
    const base = Math.floor(rand() * 120) + 30;
    history = Array.from({ length: window }).map((_, i) => {
      const ts = Date.now() - (window - i) * 3600 * 1000;
      const aqi = Math.max(5, Math.round(base + Math.sin(i / 24) * 20 + rand() * 15));
      return { ts, aqi, pm25: Math.round(aqi * 0.6 + rand() * 10), pm10: Math.round(aqi * 0.5 + rand() * 12), no2: Math.round(rand() * 40), co: Math.round(rand() * 10) };
    });
  }

  // Prefer the cached current AQI (written by /api/aqi) to guarantee Day1 matches the dashboard
  const cached = readCurrentCache(slug);
  let currentObserved = null;
  if (cached && typeof cached.aqi === 'number') {
    currentObserved = { ts: cached.ts, aqi: cached.aqi, pm25: cached.pm25, pm10: cached.pm10, no2: cached.no2, co: cached.co, observed: true };
  } else {
    // fall back to a live fetch if cache not present
    try {
      const live = await fetchAqiForCity(cityParam);
      if (live && typeof live.aqi === 'number') {
        currentObserved = { ts: Date.now(), aqi: live.aqi, pm25: live.pm25, pm10: live.pm10, no2: live.no2, co: live.co, observed: true };
      }
    } catch (err) {
      // ignore
    }
  }

  // Build features: We'll use lagged AQI and current pollutant levels as simple features.
  // Prepare X (features) and y (target) using the last `window` points (hourly).
  let rows = history.slice(Math.max(0, history.length - window));
  // If we have a current observed point, append it so the model trains on the latest observation
  if (currentObserved) {
    try {
      // ensure fields exist
      rows = rows.slice();
      rows.push({ ts: currentObserved.ts || Date.now(), aqi: currentObserved.aqi, pm25: currentObserved.pm25 || 0, pm10: currentObserved.pm10 || 0, no2: currentObserved.no2 || 0, co: currentObserved.co || 0 });
      console.log('mlpredict: appended currentObserved to training rows for', cityParam);
    } catch (e) {
      console.warn('mlpredict: failed to append currentObserved', e && e.message ? e.message : e);
    }
  }

  const X = [];
  const y = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    X.push([prev.aqi, cur.pm25 || 0, cur.pm10 || 0, cur.no2 || 0, cur.co || 0, 1]); // 1 for intercept
    y.push(cur.aqi);
  }

  // Helper to fetch live AQI directly from WAQI (same logic as /api/aqi)
  async function fetchLiveAqi(cityName) {
    try {
      const url = `https://api.waqi.info/feed/${encodeURIComponent(cityName)}/?token=${AQICN_KEY}`;
      const resp = await axios.get(url);
      if (resp.data && resp.data.status === 'ok' && resp.data.data) {
        const { aqi, iaqi } = resp.data.data;
        return { aqi, iaqi };
      }
    } catch (e) {
      // ignore
    }
    return null;
  }


  // Simple OLS solver: beta = (X^T X)^-1 X^T y
  function transpose(A) { return A[0].map((_, c) => A.map(r => r[c])); }
  function matMul(A, B) { return A.map(row => transpose(B).map(col => row.reduce((s, v, i) => s + v * col[i], 0))); }
  function matVecMul(A, v) { return A.map(row => row.reduce((s, x, i) => s + x * v[i], 0)); }
  function inverse2(A) {
    // use numeric.js style for small matrices via Gaussian elimination
    const n = A.length; const M = A.map(r => r.slice());
    const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    for (let i = 0; i < n; i++) {
      // pivot
      let piv = i; for (let r = i; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
      if (Math.abs(M[piv][i]) < 1e-12) return null;
      [M[i], M[piv]] = [M[piv], M[i]]; [I[i], I[piv]] = [I[piv], I[i]];
      const div = M[i][i];
      for (let c = 0; c < n; c++) { M[i][c] /= div; I[i][c] /= div; }
      for (let r = 0; r < n; r++) if (r !== i) {
        const fac = M[r][i];
        for (let c = 0; c < n; c++) { M[r][c] -= fac * M[i][c]; I[r][c] -= fac * I[i][c]; }
      }
    }
    return I;
  }

  let beta = null;
  if (X.length > 0) {
    const Xt = transpose(X);
    const XtX = matMul(Xt, X);
    const inv = inverse2(XtX);
    if (inv) {
      const Xty = matVecMul(Xt, y);
      beta = matVecMul(inv, Xty);
    }
  }

  // Forecast recursively: use last observed values and predicted AQI as needed
  const forecast = [];
  const last = rows[rows.length - 1];
  // prefer live current observed AQI when available so Day 1 will match dashboard
  const observedPoint = currentObserved || { ts: last.ts, aqi: last.aqi, pm25: last.pm25, pm10: last.pm10, no2: last.no2, co: last.co, observed: true };
  let prevAQI = observedPoint.aqi;
  // prepend the observed value (live if available, otherwise last history point)
  forecast.push({ ts: observedPoint.ts, aqi: observedPoint.aqi, low: observedPoint.aqi, high: observedPoint.aqi, observed: true });
  for (let h = 1; h <= horizon; h++) {
    // use same pollutant levels as last (naive), could be improved
    const features = [prevAQI, last.pm25 || 0, last.pm10 || 0, last.no2 || 0, last.co || 0, 1];
    const pred = beta ? Math.round(matVecMul([features], beta)[0]) : Math.round(prevAQI + 2 * (Math.random() - 0.5));
    const low = Math.max(0, Math.round(pred - Math.max(5, pred * 0.1)));
    const high = Math.round(pred + Math.max(5, pred * 0.1));
    const ts = Date.now() + h * 3600 * 1000;
    forecast.push({ ts, aqi: pred, low, high });
    prevAQI = pred;
  }

  // simple evaluation: RMSE/MAPE on last few points (if beta computed)
  let metrics = { rmse: null, mape: null };
  if (beta && X.length > 0) {
    const preds = matVecMul(X, beta);
    const n = preds.length;
    const mse = preds.reduce((s, p, i) => s + Math.pow(p - y[i], 2), 0) / n;
    const rmse = Math.sqrt(mse);
    const mape = preds.reduce((s, p, i) => s + Math.abs((y[i] - p) / (y[i] || 1)), 0) / n * 100;
    metrics = { rmse: Number(rmse.toFixed(2)), mape: Number(mape.toFixed(2)) };
  }

  // Final safety: ensure the first forecast point (Day 1) matches the AQI API value when possible
  try {
    // Prefer the local /api/aqi response to guarantee exact match with dashboard
    try {
      console.log('mlpredict: attempting local /api/aqi override for', cityParam);
      const localResp = await axios.get(`http://localhost:${PORT}/api/aqi/${encodeURIComponent(cityParam)}`);
      console.log('mlpredict: local /api/aqi response:', (localResp && localResp.data) ? JSON.stringify({ aqi: localResp.data.aqi }) : 'no-data');
      if (localResp && localResp.data && typeof localResp.data.aqi === 'number' && forecast && forecast.length > 0) {
        forecast[0].aqi = localResp.data.aqi;
        forecast[0].low = localResp.data.aqi;
        forecast[0].high = localResp.data.aqi;
        forecast[0].observed = true;
        console.log('mlpredict: overridden forecast[0] to', localResp.data.aqi);
      } else {
        console.log('mlpredict: local override not applied - response missing aqi or forecast empty');
      }
    } catch (e) {
      // fallback to fetchAqiForCity if local call fails
      console.warn('mlpredict: local /api/aqi call failed, falling back to WAQI fetch', e.message || e);
      const live = await fetchAqiForCity(cityParam);
      console.log('mlpredict: fetchAqiForCity returned', live && typeof live.aqi === 'number' ? live.aqi : 'no-data');
      if (live && typeof live.aqi === 'number' && forecast && forecast.length > 0) {
        forecast[0].aqi = live.aqi;
        forecast[0].low = live.aqi;
        forecast[0].high = live.aqi;
        forecast[0].observed = true;
        console.log('mlpredict: overridden forecast[0] with live WAQI', live.aqi);
      }
    }
  } catch (e) {
    // ignore
  }

  // Smoothing: blend the observed Day1 into the first few predicted steps so the
  // series transitions smoothly from the observed value to the model predictions.
  try {
    const blendSteps = 3; // number of steps to blend over (1..blendSteps)
    const observedAQIValue = (forecast && forecast[0] && typeof forecast[0].aqi === 'number') ? forecast[0].aqi : null;
    if (observedAQIValue !== null) {
      for (let i = 1; i < Math.min(forecast.length, 1 + blendSteps); i++) {
        const pred = typeof forecast[i].aqi === 'number' ? forecast[i].aqi : null;
        if (pred === null) continue;
        const w = Math.min(1, i / blendSteps); // ramp weight from observed->model
        const blended = Math.round((1 - w) * observedAQIValue + w * pred);
        // preserve a reasonable spread for low/high by keeping half the original spread
        const origLow = typeof forecast[i].low === 'number' ? forecast[i].low : Math.max(0, pred - 5);
        const origHigh = typeof forecast[i].high === 'number' ? forecast[i].high : pred + 5;
        const origSpread = Math.max(1, Math.round((origHigh - origLow) / 2));
        forecast[i].aqi = blended;
        forecast[i].low = Math.max(0, blended - origSpread);
        forecast[i].high = blended + origSpread;
      }
      console.log('mlpredict: applied blending for', cityParam, 'blendSteps=', blendSteps, 'observed=', observedAQIValue);
    }
  } catch (e) {
    console.warn('mlpredict: blending error', e && e.message ? e.message : e);
  }

  res.json({ city: cityParam, model: 'mlr', horizon, forecast, metrics });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
