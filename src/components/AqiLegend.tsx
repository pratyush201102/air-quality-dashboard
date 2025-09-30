import React from "react";
import { getAqiColor, getAqiLabel } from "../utils/aqi";

const bands = [
  { from: 0, to: 50 },
  { from: 51, to: 100 },
  { from: 101, to: 150 },
  { from: 151, to: 200 },
  { from: 201, to: 300 },
  { from: 301, to: 500 },
];

export default function AqiLegend() {
  return (
    <div className="w-full bg-white rounded-2xl p-4 shadow mt-6">
      <h4 className="text-sm font-semibold mb-3">AQI Severity Legend</h4>

      {/* Stacked color bar */}
      <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden' }}>
        {bands.map((b, i) => {
          const mid = Math.floor((b.from + b.to) / 2);
          return (
            <div
              key={i}
              style={{ background: getAqiColor(mid), flex: 1 }}
              title={`${b.from} - ${b.to}`}
            />
          );
        })}
      </div>

      {/* Labels below the bar, compact and horizontal */}
      <div style={{ display: 'flex', marginTop: 8, gap: 6 }}>
        {bands.map((b, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 600 }}>{b.from}-{b.to}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>{getAqiLabel((b.from + b.to) / 2)}</div>
          </div>
        ))}
      </div>

      {/* Removed textual Good/Unhealthy labels to keep legend purely graphical */}
    </div>
  );
}
