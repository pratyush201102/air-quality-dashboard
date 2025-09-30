// frontend/src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { fetchLocationAqi, AirQualityData } from "../utils/api";
import AqiCard from "../components/AqiCard";
import SampleChart from "../components/Charts/SampleChart";
import ForecastChart from "../components/Charts/ForecastChart";
import PredictivePlaceholder from "../components/PredictivePlaceholder";
import AqiLegend from "../components/AqiLegend";

const cities = ["Los Angeles", "Beijing", "Delhi", "London"];

export default function Dashboard() {
  const [data, setData] = useState<AirQualityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const results = await Promise.all(cities.map(fetchLocationAqi));
        setData(results.filter((r): r is AirQualityData => r !== null));
      } catch (err) {
        console.error("Error fetching AQI data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <p className="text-center mt-6">Loading AQI data...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">🌍 Air Quality Dashboard</h1>
      

      {data.length === 0 ? (
        <p className="text-center text-gray-500">No AQI data available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((cityData) => (
            <AqiCard key={cityData.city} data={cityData} />
          ))}
        </div>
      )}

      {/* Charts & predictive placeholder */}
      <div className="mt-8">
        <AqiLegend />
        <SampleChart data={data} />
        <ForecastChart />
        <PredictivePlaceholder />
      </div>
    </div>
  );
}
