import React from "react";
import AQIIndicator from "./Indicators/AqiIndicator";
import { AirQualityData } from "../utils/api";
import { getAqiColor, getAqiLabel } from "../utils/aqi";

type Props = {
  data: AirQualityData;
};

const AqiCard: React.FC<Props> = ({ data }) => {
  const { city, aqi, pm25, pm10, no2, co } = data;
  const borderColor = getAqiColor(aqi ?? null);

  const isBeijing = city.toLowerCase().includes('beijing');

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-72" style={{ borderLeft: `6px solid ${borderColor}` }}>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-800 leading-tight">{city}</h2>
      </div>

      <div className="mt-2">
  <div className="text-sm font-semibold text-gray-700 mb-2">Air quality</div>
        <div className="rounded-md bg-gray-50 border border-gray-100 p-2">
          <div className="text-sm text-gray-700">AQI: <span className="font-bold text-gray-900">{aqi !== null ? aqi : '–'}</span></div>
        </div>

  <div style={{ height: 8 }} />
  <div className="text-sm font-semibold text-gray-700 mt-3 mb-2">Pollutants</div>
        <div className="space-y-2">
          <div className="bg-white border border-gray-100 rounded-md p-2">
            <div className="text-sm text-gray-700">PM2.5: <span className="font-medium text-gray-800">{pm25 ?? '–'}</span></div>
          </div>
          <div className="bg-white border border-gray-100 rounded-md p-2">
            <div className="text-sm text-gray-700">PM10: <span className="font-medium text-gray-800">{pm10 ?? '–'}</span></div>
          </div>
          <div className="bg-white border border-gray-100 rounded-md p-2">
            <div className="text-sm text-gray-700">NO₂: <span className="font-medium text-gray-800">{no2 ?? '–'}</span></div>
          </div>
          <div className="bg-white border border-gray-100 rounded-md p-2">
            <div className="text-sm text-gray-700">CO: <span className="font-medium text-gray-800">{co ?? '–'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AqiCard;
