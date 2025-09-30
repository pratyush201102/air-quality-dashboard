import React from "react";
import { getAqiColor, getAqiLabel } from "../../utils/aqi";

type Props = {
  aqi?: number | null;
};

const AQIIndicator: React.FC<Props> = ({ aqi }) => {
  const color = getAqiColor(aqi);
  const label = getAqiLabel(aqi);

  return (
    <div className="flex items-center space-x-3">
      <div style={{ backgroundColor: color }} className="w-5 h-5 rounded-full" />
      <span className="text-sm font-medium">
        {aqi !== null && aqi !== undefined ? `${aqi} – ${label}` : "No data"}
      </span>
    </div>
  );
};

export default AQIIndicator;
