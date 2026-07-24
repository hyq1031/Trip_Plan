import { useEffect, useState } from "react";
import { fetchWeather, type WeatherResult } from "../lib/api";

// Minimal WMO weather-code -> emoji mapping (Open-Meteo uses WMO codes).
function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

export default function WeatherChip({ lat, lng, date }: { lat: number; lng: number; date: string }) {
  const [weather, setWeather] = useState<WeatherResult | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchWeather(lat, lng, date).then((w) => {
      if (!cancelled) setWeather(w);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, date]);

  if (!weather) return null;
  return (
    <span className="text-xs text-ink/50">
      {weatherEmoji(weather.weatherCode)} {Math.round(weather.tempMaxC)}°
    </span>
  );
}
