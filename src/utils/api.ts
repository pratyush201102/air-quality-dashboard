// frontend/src/utils/api.ts
export interface AirQualityData {
  city: string;  // ✅ matches backend
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  co: number | null;
}

export async function fetchLocationAqi(city: string): Promise<AirQualityData | null> {
  try {
    const res = await fetch(`http://localhost:3000/api/aqi/${city}`);
    if (!res.ok) throw new Error(`Error fetching AQI for ${city}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}
