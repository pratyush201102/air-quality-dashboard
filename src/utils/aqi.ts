// src/utils/aqi.ts
export function getAqiColor(aqi?: number | null): string {
  if (aqi === null || aqi === undefined) return "#9E9E9E"; // gray
  if (aqi <= 50) return "#4CAF50"; // Good
  if (aqi <= 100) return "#FFEB3B"; // Moderate
  if (aqi <= 150) return "#FF9800"; // Unhealthy for Sensitive
  if (aqi <= 200) return "#F44336"; // Unhealthy
  if (aqi <= 300) return "#9C27B0"; // Very Unhealthy
  return "#6B021A"; // Hazardous (dark maroon)
}

export function getAqiLabel(aqi?: number | null): string {
  if (aqi === null || aqi === undefined) return "No data";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (Sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}
