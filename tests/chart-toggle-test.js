// Check that ForecastChart renders a toggle flag when imported (unit test placeholder)
// This test is a minimal smoke test to ensure UI toggle can be wired; it does not render DOM here.
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'Charts', 'ForecastChart.tsx'), 'utf8');
if (!code.includes('jitter')) {
  console.error('ForecastChart does not reference jitter or toggle yet');
  process.exit(2);
}
console.log('chart toggle smoke check passed');
