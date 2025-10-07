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
import { slugify } from "../../utils/string";

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

export default function SampleChart({
  data,
  pollutant = 'aqi',
  selectedCities,
}: {
  data: AirQualityData[];
  pollutant?: keyof AirQualityData | 'aqi';
  selectedCities?: string[];
}) {
  // selectedCities contains slugs like 'los-angeles'. Backend may return fuller names
  // like 'Los Angeles-North Main Street' — compare by inclusion so the slug
  // 'los-angeles' matches 'los-angeles-north-main-street'.
  const filtered = selectedCities && selectedCities.length > 0
    ? data.filter((d) => selectedCities.some((slug) => slugify(d.city).includes(slug)))
    : data;
  const title = pollutant === 'aqi' ? 'AQI Comparison' : `${pollutant.toUpperCase()} Comparison`;

  // normalize into uniform shape for the chart and derive a short display label
  const mapped = filtered.map((d) => {
    const val = pollutant === 'aqi' ? d.aqi : (d as any)[pollutant];
    // find a matching slug from selectedCities so we can show a concise label (e.g., 'Delhi')
    const matchedSlug = selectedCities && selectedCities.length > 0
      ? selectedCities.find((slug) => slugify(d.city).includes(slug))
      : undefined;
    const displayName = (matchedSlug || slugify(d.city)).split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    return {
      city: d.city, // full city name (for tooltips)
      label: displayName, // short display name for X axis
      value: val === null || val === undefined ? null : Number(val),
      raw: d,
    };
  });

  return (
    <div style={{ width: '100%', height: 320 }} className="bg-white rounded-2xl p-4 shadow">
      <h3 className="text-lg font-semibold mb-2">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mapped}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip labelFormatter={(label) => label} />
          <Legend />
          <Bar
            dataKey="value"
            name={pollutant === 'aqi' ? 'AQI' : pollutant.toUpperCase()}
            fill={getColor(pollutant === 'pm25' ? 'pm25' : pollutant === 'pm10' ? 'pm10' : 'pm25')}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
