import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { AirQualityData } from "../../utils/api";

function getColor(pollutant: string) {
  switch (pollutant) {
    case "pm25":
      return "#FF5722"; // orange-red
    case "pm10":
      return "#2196F3"; // blue
    default:
      return "#9E9E9E"; // gray fallback
  }
}

export default function SampleChart({ data }: { data: AirQualityData[] }) {
  return (
    <div style={{ width: '100%', height: 320 }} className="bg-white rounded-2xl p-4 shadow">
      <h3 className="text-lg font-semibold mb-2">
        Regional PM2.5 / PM10 Comparison
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="city" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="pm25"
            name="PM2.5"
            fill={getColor("pm25")}
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="pm10"
            name="PM10"
            fill={getColor("pm10")}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
