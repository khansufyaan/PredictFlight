"use client";

import { useQuery } from "@tanstack/react-query";
import { AIRPORTS } from "@/lib/airports";

const WMO: [number, string, string][] = [
  [0, "☀️", "clear"],
  [2, "⛅", "partly cloudy"],
  [3, "☁️", "overcast"],
  [48, "🌫", "fog"],
  [57, "🌦", "drizzle"],
  [67, "🌧", "rain"],
  [77, "❄️", "snow"],
  [82, "🌧", "showers"],
  [86, "❄️", "snow showers"],
  [99, "⛈", "thunderstorms"],
];

function describe(code: number): { icon: string; label: string } {
  for (const [max, icon, label] of WMO) if (code <= max) return { icon, label };
  return { icon: "🌡", label: "—" };
}

/** Forecast at the destination airport around the scheduled arrival hour,
 *  from the free open-meteo API. Weather is half the delay story — give the
 *  predictor the sky they're flying into. */
export function WeatherChip({ airport, at }: { airport: string; at: number }) {
  const spot = AIRPORTS[airport];
  const { data } = useQuery({
    queryKey: ["wx", airport, Math.floor(at / 3600)],
    enabled: !!spot && at * 1000 > Date.now() - 3600_000 && at * 1000 < Date.now() + 15 * 86400_000,
    staleTime: 30 * 60_000,
    refetchInterval: false,
    queryFn: async () => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}` +
        `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph&timeformat=unixtime&forecast_days=16`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather unavailable");
      const j = await res.json();
      const times: number[] = j.hourly?.time ?? [];
      let best = -1;
      let dist = Infinity;
      times.forEach((t, i) => {
        const d = Math.abs(t - at);
        if (d < dist) (dist = d), (best = i);
      });
      if (best < 0 || dist > 3 * 3600) return null;
      return {
        temp: Math.round(j.hourly.temperature_2m[best]),
        rain: j.hourly.precipitation_probability?.[best] ?? null,
        wind: Math.round(j.hourly.wind_speed_10m[best]),
        code: j.hourly.weather_code[best] as number,
      };
    },
  });

  if (!spot || !data) return null;
  const { icon, label } = describe(data.code);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-board-line bg-board-bg px-2 py-1 text-[11px] text-board-dim"
      title={`open-meteo forecast for ${spot.city} at scheduled arrival`}
    >
      <span className="text-sm leading-none">{icon}</span>
      {airport} on arrival: {label} · {data.temp}°F
      {data.rain != null && data.rain > 10 && <> · {data.rain}% rain</>}
      {data.wind >= 20 && <> · wind {data.wind}mph</>}
    </span>
  );
}
