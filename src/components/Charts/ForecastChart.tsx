import React, { useEffect, useState } from "react";
import { slugify } from "../../utils/string";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Brush,
} from "recharts";
import { getAqiColor } from "../../utils/aqi";

type ForecastPoint = { day: string; aqi: number };

function getLineColorForIndex(i: number) {
  const palette = ["#023e8a", "#ff6b6b", "#4caf50", "#9c27b0", "#ff9800"];
  return palette[i % palette.length];
}

const renderCustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = getAqiColor(payload.aqi);
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1} />;
};

export default function ForecastChart({ selectedCities = [] as string[], allCities = [] as string[] }: { selectedCities?: string[], allCities?: string[] }) {
  const [series, setSeries] = useState<Record<string, ForecastPoint[]>>({});
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
            const res = await fetch(`http://localhost:3000/api/predict/${encodeURIComponent(display)}`);
            if (!res.ok) return [slug, null] as const;
            const json = await res.json();
            const points = json.forecast.map((p: any, i: number) => ({ day: `Day ${i + 1}`, aqi: p.aqi }));
            return [slug, points] as const;
          } catch (err) {
            console.error(`Error fetching forecast for ${display}:`, err);
            return [slug, null] as const;
          }
        });

        const results = await Promise.all(fetches);
        const out: Record<string, ForecastPoint[]> = {};
        results.forEach(([slug, pts]) => {
          if (pts) out[slug] = pts;
        });

        setLabelMap(labelMapLocal);
        setSeries(out);
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
  const dayList = Array.from(days).sort();
  const chartData = dayList.map((day) => {
    const row: any = { day };
    Object.entries(series).forEach(([slug, arr]) => {
      const found = arr.find((p) => p.day === day);
      row[slug] = found ? found.aqi : null;
    });
    return row;
  });

  return (
    <div style={{ width: '100%', height: 360, paddingBottom: 20 }} className="bg-white rounded-2xl p-4 shadow mt-6">
      <h3 className="text-lg font-semibold mb-2">Predictive AQI Forecast</h3>
      {loading && <p className="text-sm text-gray-500">Loading forecasts...</p>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          {Object.keys(series).map((slug, idx) => (
            <Line key={slug} type="monotone" dataKey={slug} stroke={getLineColorForIndex(idx)} strokeWidth={2} dot={renderCustomDot} name={labelMap[slug] || slug} />
          ))}
          <Brush dataKey="day" height={40} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ height: 12 }} />
    </div>
  );
}
