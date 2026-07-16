import type { Route } from "../routes20.js";
import { config } from "../config.js";
import type { FlightDataProvider, FlightHistory, FlightStatus, ScheduledFlight } from "./types.js";

const BASE = "https://aeroapi.flightaware.com/aeroapi";

// AeroAPI personal tier throttles bursts hard — space every call out and
// back off on 429 instead of failing the whole ingest run.
const MIN_GAP_MS = Number(process.env.AEROAPI_MIN_GAP_MS ?? 7000);
let lastCallAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function aeroGet(path: string): Promise<any> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    const res = await fetch(`${BASE}${path}`, {
      headers: { "x-apikey": config.aeroApiKey, Accept: "application/json" },
    });
    if (res.status === 429) {
      await sleep(30_000 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`AeroAPI ${res.status} on ${path}`);
    return res.json();
  }
  throw new Error("AeroAPI rate limited (retries exhausted)");
}

const toEpoch = (iso: string | null | undefined): number | undefined =>
  iso ? Math.floor(Date.parse(iso) / 1000) : undefined;

/**
 * FlightAware AeroAPI v4 provider.
 *  - listFlights: GET /schedules/{start}/{end}?origin&destination (first flight
 *    per route per day keeps market volume ~= 20/day for the MVP).
 *  - getStatus: GET /flights/{ident} filtered to the matching departure, using
 *    actual_on (touchdown), cancelled, diverted and actual destination.
 */
export class AeroApiProvider implements FlightDataProvider {
  readonly name = "aeroapi";

  constructor() {
    if (!config.aeroApiKey) throw new Error("AEROAPI_KEY is required for FLIGHT_PROVIDER=aeroapi");
  }

  async listFlights(routes: Route[], dateISO: string): Promise<ScheduledFlight[]> {
    const out: ScheduledFlight[] = [];
    const next = new Date(new Date(`${dateISO}T00:00:00Z`).getTime() + 86400_000)
      .toISOString()
      .slice(0, 10);
    for (const r of routes) {
      try {
        const data = await aeroGet(
          `/schedules/${dateISO}/${next}?origin=${r.origin}&destination=${r.destination}&max_pages=1`,
        );
        const f = (data.scheduled ?? [])[0];
        if (!f) continue;
        const dep = toEpoch(f.scheduled_out ?? f.scheduled_off);
        const arr = toEpoch(f.scheduled_in ?? f.scheduled_on);
        if (!dep || !arr || arr <= dep) continue;
        const ident: string = f.ident ?? r.flightNumber;
        out.push({
          flightKey: `${ident}|${r.origin}|${r.destination}|${dateISO}|${dep}`,
          flightNumber: ident,
          origin: r.origin,
          destination: r.destination,
          scheduledDeparture: dep,
          scheduledArrival: arr,
        });
      } catch (err) {
        console.warn(`[aeroapi] schedule fetch failed ${r.origin}-${r.destination}:`, err);
      }
    }
    return out;
  }

  async getStatus(flight: ScheduledFlight): Promise<FlightStatus> {
    const start = new Date((flight.scheduledDeparture - 6 * 3600) * 1000).toISOString();
    const end = new Date((flight.scheduledDeparture + 6 * 3600) * 1000).toISOString();
    const data = await aeroGet(
      `/flights/${encodeURIComponent(flight.flightNumber)}?start=${start}&end=${end}&max_pages=1`,
    );
    const flights: any[] = data.flights ?? [];
    // pick the leg whose scheduled departure is closest to ours
    const leg = flights
      .map((f) => ({ f, dep: toEpoch(f.scheduled_out ?? f.scheduled_off) ?? 0 }))
      .sort(
        (a, b) =>
          Math.abs(a.dep - flight.scheduledDeparture) - Math.abs(b.dep - flight.scheduledDeparture),
      )[0]?.f;
    if (!leg) return { phase: "unknown" };

    if (leg.cancelled) return { phase: "cancelled" };
    const touchdown = toEpoch(leg.actual_on);
    const actualDestination: string | undefined =
      leg.destination?.code_iata ?? leg.destination?.code ?? undefined;
    if (touchdown) {
      const diverted = leg.diverted || (actualDestination && actualDestination !== flight.destination);
      return {
        phase: diverted ? "diverted" : "landed",
        actualTouchdown: touchdown,
        actualDestination,
      };
    }
    const departed = toEpoch(leg.actual_off ?? leg.actual_out);
    return { phase: departed ? "active" : "scheduled" };
  }

  /** Track record over the last ~9 days of the same flight number: share of
   *  completed runs that arrived within the 15-min grace, plus mean delay.
   *  One AeroAPI call per unique ident; cancelled/unflown legs are excluded. */
  async getHistory(flightNumber: string): Promise<FlightHistory | null> {
    const end = new Date(Date.now() - 3600_000).toISOString(); // past only
    const start = new Date(Date.now() - 9 * 86400_000).toISOString();
    let data: any;
    try {
      data = await aeroGet(
        `/flights/${encodeURIComponent(flightNumber)}?start=${start}&end=${end}&max_pages=1`,
      );
    } catch (err) {
      console.warn(`[aeroapi] history fetch failed for ${flightNumber}:`, err);
      return null;
    }
    const legs: any[] = data.flights ?? [];
    const delays: number[] = [];
    for (const leg of legs) {
      if (leg.cancelled) continue;
      const sched = toEpoch(leg.scheduled_in ?? leg.scheduled_on);
      const actual = toEpoch(leg.actual_in ?? leg.actual_on);
      if (!sched || !actual) continue;
      delays.push((actual - sched) / 60);
    }
    if (delays.length === 0) return null;
    const onTime = delays.filter((d) => d <= 15).length;
    return {
      onTimePct: onTime / delays.length,
      sample: delays.length,
      avgDelayMin: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length),
    };
  }
}
