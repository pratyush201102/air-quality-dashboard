import React from "react";
import AQIIndicator from "./Indicators/AqiIndicator";
import { AirQualityData } from "../utils/api";
import { getAqiColor } from "../utils/aqi";

type Props = {
  data: AirQualityData;
};

const AqiCard: React.FC<Props> = ({ data }) => {
  const { city, aqi, pm25, pm10, no2, co } = data;
  const borderColor = getAqiColor(aqi ?? null);

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 w-72 flex" style={{ borderLeft: `6px solid ${borderColor}` }}>
      <h2 className="text-lg font-bold text-gray-700 mb-2">{city}</h2>

      {/* AQI Number */}
      <p className="text-4xl font-extrabold mb-2">{aqi !== null ? aqi : "–"}</p>

      {/* ✅ New AQI Indicator */}
      <AQIIndicator aqi={aqi} />

      <div className="mt-4 space-y-1 text-sm text-gray-600">
        <p>PM2.5: {pm25 ?? "–"}</p>
        <p>PM10: {pm10 ?? "–"}</p>
        <p>NO₂: {no2 ?? "–"}</p>
        <p>CO: {co ?? "–"}</p>
      </div>
    </div>
  );
};

export default AqiCard;
