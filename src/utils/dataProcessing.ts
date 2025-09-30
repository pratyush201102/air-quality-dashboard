// src/utils/dataProcessing.ts

export interface AirQualityData {
  city: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  co2: number;
  message?: string;
}

// Helper to categorize AQI
export function getAqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}
