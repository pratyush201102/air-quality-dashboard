const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;

// AQICN API Key
const AQICN_KEY = "fd43f848b79493d8249c91a90fae9833c56c41c3";

app.use(cors()); 

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

  try {
    const url = `https://api.waqi.info/feed/${encodeURIComponent(cityParam)}/?token=${AQICN_KEY}`;
    const response = await axios.get(url);
    const { status, data } = response.data;

    if (status !== "ok") {
      return res.json({ city: cityParam, message: "No AQI data available", detail: data });
    }

    const { aqi, iaqi, city } = data;
    const pm25 = iaqi.pm25?.v || 0;
    const pm10 = iaqi.pm10?.v || 0;
    const no2 = iaqi.no2?.v || 0;
    const co = iaqi.co?.v || 0;

    res.json({
      city: city.name,   // Actual city name from API
      aqi,
      pm25,
      pm10,
      no2,
      co,
    });
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
