// Simple deterministic jitter unit test
const assert = require('assert');
function deterministicJitter(slug, dayNum) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 16777619) >>> 0;
  const frac = (h % 1000) / 1000;
  const jitter = (frac - 0.5) * 2.0;
  const scale = 2.0;
  return dayNum >= 4 ? jitter * scale : 0;
}

// deterministic test vectors
const a = deterministicJitter('los-angeles', 4);
const b = deterministicJitter('los-angeles', 4);
assert.strictEqual(a, b, 'jitter should be deterministic for same slug/day');
assert.strictEqual(deterministicJitter('los-angeles', 3), 0, 'jitter before day 4 should be 0');
console.log('jitter tests passed');
