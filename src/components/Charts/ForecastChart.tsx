import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts";
import { getAqiColor } from "../../utils/aqi";

// Placeholder dataset for predictive simulation
const forecastData = [
  { day: "Today", aqi: 65 },
  { day: "Tomorrow", aqi: 72 },
  { day: "Day 3", aqi: 80 },
  { day: "Day 4", aqi: 95 },
  { day: "Day 5", aqi: 78 },
];

function getLineColor(aqi: number) {
  if (aqi <= 50) return "#4CAF50"; // Good
  if (aqi <= 100) return "#FFEB3B"; // Moderate
  if (aqi <= 150) return "#FF9800"; // Unhealthy for Sensitive
  if (aqi <= 200) return "#F44336"; // Unhealthy
  return "#9C27B0"; // Very Unhealthy+
}

const renderCustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = getAqiColor(payload.aqi);
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1} />;
};

export default function ForecastChart() {
  return (
  <div style={{ width: '100%', height: 360, paddingBottom: 20 }} className="bg-white rounded-2xl p-4 shadow mt-6">
      <h3 className="text-lg font-semibold mb-2">
        Predictive AQI Forecast (Placeholder)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={forecastData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="aqi"
            stroke={getLineColor(80)}
            strokeWidth={3}
            dot={renderCustomDot}
            activeDot={{ r: 9 }}
          />
          <Brush dataKey="day" height={40} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ height: 12 }} />
    </div>
  );
}
