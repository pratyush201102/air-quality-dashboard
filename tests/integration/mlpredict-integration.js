const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CITY = process.env.TEST_CITY || 'Los-Angeles';

async function run() {
  try {
    console.log('Integration test: fetching /api/aqi/' + CITY);
    const aqiResp = await axios.get(`${BASE}/api/aqi/${encodeURIComponent(CITY)}`);
    const aqi = aqiResp.data && aqiResp.data.aqi;
    console.log('AQI API returned:', aqi);
    if (typeof aqi !== 'number') {
      console.error('AQI API did not return numeric aqi');
      process.exit(2);
    }

    console.log('Fetching /api/mlpredict/' + CITY);
    const mlResp = await axios.get(`${BASE}/api/mlpredict/${encodeURIComponent(CITY)}?horizon=6`);
    const fc = mlResp.data && mlResp.data.forecast;
    if (!Array.isArray(fc) || fc.length === 0) {
      console.error('mlpredict did not return forecast');
      process.exit(3);
    }
    console.log('mlpredict.forecast[0].aqi =', fc[0].aqi);
    if (fc[0].aqi !== aqi) {
      console.error('Mismatch: mlpredict.forecast[0].aqi !== /api/aqi', fc[0].aqi, '!=', aqi);
      process.exit(4);
    }

    console.log('Integration test passed — Day1 matches AQI API');
    process.exit(0);
  } catch (e) {
    console.error('Integration test error', e && e.message ? e.message : e);
    process.exit(10);
  }
}

run();
