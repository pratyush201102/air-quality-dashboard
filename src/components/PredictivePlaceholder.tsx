import React, { useEffect, useState } from "react";
import { cities } from "../data/cities";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type ForecastPoint = { day: string; aqi: number; low: number; high: number; range?: number };

export default function PredictivePlaceholder() {
  const [data, setData] = useState<ForecastPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("Los Angeles");

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/api/predict/${encodeURIComponent(city)}`);
        const json = await res.json();
        setData(json.forecast);
      } catch (err) {
        console.error("Error fetching forecast:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [city]);

  return (
  <div className="w-full bg-white rounded-2xl p-6 shadow mt-6" style={{ paddingBottom: 72 }}>
      <h3 className="text-lg font-semibold mb-2">Predictive Modeling (beta)</h3>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Short-term AQI predictions with uncertainty bands (mock data).</p>
        <div>
          <label className="text-sm text-gray-600 mr-2">City:</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 h-56">
        {loading && <p className="text-center">Loading predictions...</p>}
        {!loading && !data && (
          <div className="h-full flex items-center justify-center text-gray-400">No data</div>
        )}

        {data && (
          // compute range to draw shaded band between low and high
          (() => {
            const withRange = data.map((d) => ({ ...d, range: d.high - d.low }));
              return (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={withRange} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  {/* draw low as baseline (invisible) and range as filled area above it */}
                  <Area type="monotone" dataKey="low" stroke="transparent" fill="transparent" />
                  <Area
                    type="monotone"
                    dataKey="range"
                    stroke="none"
                    fill="#90cdf4"
                    fillOpacity={0.25}
                    isAnimationActive={false}
                  />
                  <Area type="monotone" dataKey="aqi" stroke="#023e8a" fill="#023e8a" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            );
          })()
        )}
      </div>
    </div>
  );
}
