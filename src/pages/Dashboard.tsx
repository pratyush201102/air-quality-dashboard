// frontend/src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { fetchLocationAqi, AirQualityData } from "../utils/api";
import AqiCard from "../components/AqiCard";
import SampleChart from "../components/Charts/SampleChart";
import ForecastChart from "../components/Charts/ForecastChart";
import PredictivePlaceholder from "../components/PredictivePlaceholder";
import AqiLegend from "../components/AqiLegend";
import CitySelector from "../components/CitySelector";
import { slugify } from "../utils/string";

const cities = ["Los Angeles", "Beijing", "Delhi", "London"];

export default function Dashboard() {
  const [data, setData] = useState<AirQualityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollutant, setSelectedPollutant] = useState<keyof AirQualityData | 'aqi'>('aqi');
  const [selectedCities, setSelectedCities] = useState<string[]>(cities.slice(0, 2).map(slugify));

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
        {/* Place legend above controls for better visibility */}
        <AqiLegend />
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
          <div>
            <label className="text-sm text-gray-700 mr-2">Pollutant:</label>
            <select
              value={selectedPollutant}
              onChange={(e) => setSelectedPollutant(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="aqi">AQI</option>
              <option value="pm25">PM2.5</option>
              <option value="pm10">PM10</option>
              <option value="no2">NO₂</option>
              <option value="co">CO</option>
            </select>
          </div>

          <div className="flex-1">
            <CitySelector
              cities={cities}
              selected={selectedCities}
              onChange={setSelectedCities}
              placeholder="Select one or more cities to compare"
            />
          </div>
        </div>

        <SampleChart data={data} pollutant={selectedPollutant} selectedCities={selectedCities} />
  <ForecastChart selectedCities={selectedCities} allCities={cities} />
        <PredictivePlaceholder />
      </div>
    </div>
  );
}
