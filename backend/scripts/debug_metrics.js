const fs = require('fs');
const path = require('path');
const history = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'los-angeles.json')));
const window = 72;
let rows = history.slice(Math.max(0, history.length - window));
const featureNames = ['prevAQI','pm25','pm10','no2','co'];
if (rows.some(r => typeof r.temp === 'number')) featureNames.push('temp');
if (rows.some(r => typeof r.wind === 'number')) featureNames.push('wind');
if (rows.some(r => typeof r.humidity === 'number')) featureNames.push('humidity');
featureNames.push('intercept');
const useDelta = true;
const X = [];
const y = [];
for (let i = 1; i < rows.length; i++) {
  const prev = rows[i-1];
  const cur = rows[i];
  const feats = [];
  feats.push(prev.aqi);
  feats.push(cur.pm25 || 0);
  feats.push(cur.pm10 || 0);
  feats.push(cur.no2 || 0);
  feats.push(cur.co || 0);
  if (featureNames.includes('temp')) feats.push(cur.temp || 0);
  if (featureNames.includes('wind')) feats.push(cur.wind || 0);
  if (featureNames.includes('humidity')) feats.push(cur.humidity || 0);
  feats.push(1);
  X.push(feats);
  y.push(useDelta ? cur.aqi - prev.aqi : cur.aqi);
}
function transpose(A){ return A[0].map((_,c)=>A.map(r=>r[c])); }
function matMul(A,B){ return A.map(row => transpose(B).map(col => row.reduce((s,v,i) => s + v*col[i],0))); }
function matVecMul(A,v){ return A.map(row => row.reduce((s,x,i) => s + x*v[i],0)); }
function inverse2(A){
  const n = A.length; const M = A.map(r => r.slice());
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i===j?1:0)));
  for (let i = 0; i < n; i++){
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
console.log('rows', rows.length, 'X rows', X.length, 'feature count', featureNames.length);
if (X.length === 0) process.exit(0);
const Xt = transpose(X);
const XtX = matMul(Xt, X);
const inv = inverse2(XtX);
console.log('inv exists', !!inv);
if (!inv) { console.log('Matrix singular'); process.exit(0); }
const Xty = matVecMul(Xt, y);
const beta = matVecMul(inv, Xty);
console.log('beta len', beta.length);
const preds = matVecMul(X, beta);
const predAQIs = preds.map((p,i) => Math.round((X[i][0] || 0) + p));
const actualAQIs = [];
for (let i = 1; i < rows.length; i++) actualAQIs.push(rows[i].aqi);
console.log('predAQIs len', predAQIs.length, 'actual len', actualAQIs.length);
const residuals = predAQIs.map((p,i) => p - actualAQIs[i]);
console.log('residuals sample', residuals.slice(0,10));
const varr = residuals.reduce((s,r) => s + r*r, 0) / Math.max(1, residuals.length);
console.log('var', varr);
const residualStd = Math.sqrt(varr);
console.log('residualStd', residualStd);
const n = Math.min(predAQIs.length, actualAQIs.length) || 1;
const mse = predAQIs.slice(0,n).reduce((s,p,i) => s + Math.pow(p - actualAQIs[i],2), 0) / n;
const rmse = Math.sqrt(mse);
const mape = predAQIs.slice(0,n).reduce((s,p,i) => s + Math.abs((actualAQIs[i] - p) / (actualAQIs[i] || 1)), 0) / n * 100;
console.log('rmse', rmse, 'mape', mape);
