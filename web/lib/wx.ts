/** Shared weather bits: WMO code descriptions, severity for route coloring,
 *  and great-circle sampling between two airports. */

export const WMO: [number, string, string][] = [
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

export function describe(code: number): { icon: string; label: string } {
  for (const [max, icon, label] of WMO) if (code <= max) return { icon, label };
  return { icon: "🌡", label: "—" };
}

/** How much a WMO condition threatens a schedule: 0 fine, 1 slows things
 *  down, 2 the kind of weather flights get rerouted around. */
export function severity(code: number): 0 | 1 | 2 {
  if (code <= 3) return 0; // clear/cloudy
  if (code >= 95) return 2; // thunderstorms
  if (code >= 85) return 2; // snow showers
  if (code >= 71 && code <= 77) return 2; // snow
  if (code >= 65 && code <= 67) return 2; // heavy/freezing rain
  return 1; // fog, drizzle, light rain, showers
}

export interface LatLon {
  lat: number;
  lon: number;
}

/** n points along the great circle from a to b, inclusive of both ends.
 *  Spherical linear interpolation — good enough for drawing weather along
 *  a route; we're sampling forecasts, not navigating. */
export function gcPoints(a: LatLon, b: LatLon, n: number): LatLon[] {
  const rad = Math.PI / 180;
  const φ1 = a.lat * rad, λ1 = a.lon * rad;
  const φ2 = b.lat * rad, λ2 = b.lon * rad;
  const x1 = Math.cos(φ1) * Math.cos(λ1), y1 = Math.cos(φ1) * Math.sin(λ1), z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2), y2 = Math.cos(φ2) * Math.sin(λ2), z2 = Math.sin(φ2);
  const dot = Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2));
  const ω = Math.acos(dot);
  const out: LatLon[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    let kx: number, ky: number, kz: number;
    if (ω < 1e-6) {
      kx = x1; ky = y1; kz = z1;
    } else {
      const s1 = Math.sin((1 - t) * ω) / Math.sin(ω);
      const s2 = Math.sin(t * ω) / Math.sin(ω);
      kx = s1 * x1 + s2 * x2;
      ky = s1 * y1 + s2 * y2;
      kz = s1 * z1 + s2 * z2;
    }
    out.push({
      lat: Math.atan2(kz, Math.hypot(kx, ky)) / rad,
      lon: Math.atan2(ky, kx) / rad,
    });
  }
  return out;
}
