import React, { useEffect, useState } from "react";
import { slugify } from "../../utils/string";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts";
import { getAqiColor } from "../../utils/aqi";

type ForecastPoint = { day: string; aqi: number; low?: number; high?: number; observed?: boolean };

function getLineColorForIndex(i: number) {
  const palette = ["#023e8a", "#ff6b6b", "#4caf50", "#9c27b0", "#ff9800"];
  return palette[i % palette.length];
}

const renderCustomDot = (props: any) => {
  const { cx, cy, payload, dataKey } = props;
  const color = getAqiColor(payload?.aqi ?? (payload && payload[dataKey]));
  const observed = payload && (payload.observed || payload[`${dataKey}_observed`]);
  if (observed) {
    // larger ring for observed (Now)
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={color} stroke="#ffb703" strokeWidth={3} />
        <circle cx={cx} cy={cy} r={3} fill="#fff" />
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1} />;
};

// (CustomTooltip will be declared inside the component to access labelMap)

export default function ForecastChart({ selectedCities = [] as string[], allCities = [] as string[] }: { selectedCities?: string[], allCities?: string[] }) {
  const [series, setSeries] = useState<Record<string, ForecastPoint[]>>({});
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [metricsMap, setMetricsMap] = useState<Record<string, { rmse?: number; mape?: number }>>({});

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload || {};
      // prefer the order of series keys known to the component
      const seriesKeys = Object.keys(series).length > 0 ? Object.keys(series) : Object.keys(row).filter(k => !k.includes('_')).filter(k => k !== 'day');
      return (
        <div style={{ background: '#fff', padding: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
          <div style={{ marginTop: 6 }}>
            {seriesKeys.map((slug: string, idx: number) => {
              const value = typeof row[slug] !== 'undefined' && row[slug] !== null ? row[slug] : null;
              if (value === null) return null;
              const observed = !!row[`${slug}_observed`];
              const cityLabel = labelMap[slug] || slug;
              const color = getLineColorForIndex(idx);
              return (
                <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
                  <div style={{ fontSize: 13 }}><strong>{cityLabel}</strong>: {value}</div>
                  {observed && <div style={{ marginLeft: 8, fontSize: 12, color: '#b45309' }}>Now</div>}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // If no selection, use the provided allCities list; otherwise use selected slugs
        const slugs = (selectedCities && selectedCities.length > 0)
          ? selectedCities
          : (allCities && allCities.length > 0 ? allCities.map(slugify) : [slugify("Los Angeles")]);

        // Build display names map and fetch concurrently
        const labelMapLocal: Record<string, string> = {};
        const fetches = slugs.map(async (slug) => {
          const display = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          labelMapLocal[slug] = display;
          try {
            // First fetch the current AQI from the API so Day 1 matches the dashboard
            let currentAqi: number | null = null;
            try {
              const r1 = await fetch(`http://localhost:3000/api/aqi/${encodeURIComponent(display)}`);
              if (r1.ok) {
                const j1 = await r1.json();
                if (j1 && typeof j1.aqi === 'number') currentAqi = j1.aqi;
              }
            } catch (e) {
              // ignore and fallback to mlpredict observed if available
            }

            // Call the ML prototype endpoint for the remainder of the horizon
            const res = await fetch(`http://localhost:3000/api/mlpredict/${encodeURIComponent(display)}`);
            if (!res.ok) {
              console.warn(`mlpredict returned ${res.status} for ${display}`);
              return [slug, null, null] as const;
            }
            const json = await res.json();
            // json.forecast: [{ts, aqi, low, high}]
            const mlPoints: ForecastPoint[] = json.forecast.map((p: any, i: number) => ({ day: `Day ${i + 1}`, aqi: p.aqi, low: p.low, high: p.high, observed: !!p.observed }));

            let points: ForecastPoint[] = mlPoints;
            if (currentAqi !== null) {
              // Replace Day 1 with the API value (observed) and shift model predictions accordingly
              const observedPoint: ForecastPoint = { day: 'Day 1', aqi: currentAqi, low: currentAqi, high: currentAqi, observed: true };
              // Keep model's Day 2+ if available
              const shifted = mlPoints.slice(1).map((p, idx) => ({ ...p, day: `Day ${idx + 2}` }));
              points = [observedPoint, ...shifted];
            }

            const metrics = json.metrics || {};
            return [slug, points, metrics] as const;
          } catch (err) {
            console.error(`Error fetching forecast for ${display}:`, err);
            return [slug, null, null] as const;
          }
        });

        const results = await Promise.all(fetches);
        const out: Record<string, ForecastPoint[]> = {};
        const metricsOut: Record<string, { rmse?: number; mape?: number }> = {};
        results.forEach(([slug, pts, metrics]) => {
          if (pts) out[slug] = pts;
          if (metrics) metricsOut[slug] = metrics as any;
        });

        setLabelMap(labelMapLocal);
        setSeries(out);
        setMetricsMap(metricsOut);
      } catch (err) {
        console.error("Error fetching forecasts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [selectedCities, allCities]);

  // Build chart data by joining day keys across series (using slug keys)
  const days = new Set<string>();
  Object.values(series).forEach((s) => s.forEach((p) => days.add(p.day)));
  const dayList = Array.from(days).sort((a, b) => {
    const na = parseInt(a.split(' ')[1] || '0', 10);
    const nb = parseInt(b.split(' ')[1] || '0', 10);
    return na - nb;
  });
  const chartData = dayList.map((day) => {
    const row: any = { day };
    Object.entries(series).forEach(([slug, arr]) => {
      const found = arr.find((p) => p.day === day);
      row[slug] = found ? found.aqi : null;
      row[`${slug}_observed`] = found ? !!(found as any).observed : false;
      row[`${slug}_low`] = found && typeof found.low === 'number' ? found.low : null;
      // band = high - low (used for stacked area)
      row[`${slug}_band`] = found && typeof found.high === 'number' && typeof found.low === 'number' ? Math.max(0, found.high - found.low) : null;
      row[`${slug}_low_abs`] = found && typeof found.low === 'number' ? found.low : null; // low absolute baseline for stacking
    });
    return row;
  });

  return (
    <div style={{ width: '100%', height: 360, paddingBottom: 20 }} className="bg-white rounded-2xl p-4 shadow mt-6">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <h3 className="text-lg font-semibold mb-2">Predictive AQI Forecast</h3>
        <div style={{fontSize: 12, color: '#4b5563'}}>
          {Object.keys(metricsMap).length === 0 && loading && <span>Loading metrics...</span>}
          {Object.keys(metricsMap).length > 0 && (
            <div style={{display: 'flex', gap: 12}}>
              {Object.entries(metricsMap).map(([slug, m]) => (
                <div key={slug} style={{background: '#f3f4f6', padding: '4px 8px', borderRadius: 6}} title={labelMap[slug] || slug}>
                  <strong style={{display: 'block', fontSize: 11}}>{labelMap[slug] || slug}</strong>
                  <span style={{fontSize: 11}}>RMSE: {m.rmse?.toFixed(2) ?? '—'}</span>
                  <span style={{marginLeft: 6, fontSize: 11}}>MAPE: {m.mape?.toFixed(2) ?? '—'}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading forecasts...</p>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          {Object.keys(series).map((slug, idx) => {
            const color = getLineColorForIndex(idx);
            return (
              <React.Fragment key={slug}>
                {/* invisible low area as baseline for stacking */}
                <Area dataKey={`${slug}_low_abs`} stackId={slug} stroke="none" fill="transparent" />
                {/* band area between low and high */}
                <Area dataKey={`${slug}_band`} stackId={slug} stroke="none" fill={color} fillOpacity={0.12} />
                <Line type="monotone" dataKey={slug} stroke={color} strokeWidth={2} dot={renderCustomDot} name={labelMap[slug] || slug} />
              </React.Fragment>
            );
          })}
          <Brush dataKey="day" height={40} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ height: 12 }} />
    </div>
  );
}
