import { ROUTES } from "../routes20.js";
import { config } from "../config.js";
import { db } from "../db.js";
import { computeMarketId, flightIdBytes32, flightMarket, withRetry } from "../chain.js";
import { getProvider } from "../providers/index.js";
import type { FlightDataProvider, FlightHistory } from "../providers/types.js";

/** One history lookup per unique flight number per ingest run. */
async function historyFor(
  provider: FlightDataProvider,
  cache: Map<string, FlightHistory | null>,
  flightNumber: string,
): Promise<FlightHistory | null> {
  if (!cache.has(flightNumber)) {
    try {
      cache.set(flightNumber, await provider.getHistory(flightNumber));
    } catch (err) {
      console.warn(`[ingest] history failed for ${flightNumber}:`, err);
      cache.set(flightNumber, null);
    }
  }
  return cache.get(flightNumber) ?? null;
}

/** Pull upcoming flights (1..INGEST_DAYS_AHEAD days out) for the 20 routes and
 *  create a market per flight (on-chain first, then the db mirror row). Safe
 *  to re-run: existing flightKeys are skipped. */
export async function runIngestion(): Promise<number> {
  const provider = getProvider();
  const fm = flightMarket();
  let created = 0;

  const days = Math.max(1, config.ingestDaysAhead);
  const flights = [];
  for (let d = 1; d <= days; d++) {
    const date = new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
    flights.push(...(await provider.listFlights(ROUTES, date)));
  }

  const histCache = new Map<string, FlightHistory | null>();

  for (const f of flights) {
    const existing = await db.market.findUnique({ where: { flightKey: f.flightKey } });
    if (existing) {
      // backfill the track-record hint on markets created before it existed
      if (existing.histSample == null && existing.status === "OPEN") {
        const hist = await historyFor(provider, histCache, f.flightNumber);
        if (hist) {
          await db.market.update({
            where: { id: existing.id },
            data: {
              histOnTimePct: hist.onTimePct,
              histSample: hist.sample,
              histAvgDelayMin: hist.avgDelayMin,
            },
          });
        }
      }
      continue;
    }
    if (f.scheduledDeparture <= Math.floor(Date.now() / 1000) + 10) continue;

    const marketId = computeMarketId(f.flightKey, f.scheduledDeparture);
    try {
      const hist = await historyFor(provider, histCache, f.flightNumber);
      const onChain = await withRetry("getMarket", () => fm.getMarket(marketId));
      if (onChain.scheduledDeparture === 0n) {
        const tx = await withRetry("createMarket", () =>
          fm.createMarket(flightIdBytes32(f.flightKey), f.scheduledDeparture, f.scheduledArrival),
        );
        const receipt = await tx.wait();
        await upsertMarketRow(marketId, f, receipt.hash, hist);
      } else {
        await upsertMarketRow(marketId, f, null, hist); // chain ahead of db: heal mirror
      }
      created++;
      console.log(`[ingest] market ${f.flightKey} -> ${marketId}`);
    } catch (err) {
      console.error(`[ingest] failed for ${f.flightKey}:`, err);
    }
  }
  return created;
}

async function upsertMarketRow(
  marketId: string,
  f: {
    flightKey: string;
    flightNumber: string;
    origin: string;
    destination: string;
    scheduledDeparture: number;
    scheduledArrival: number;
  },
  txHash: string | null,
  hist: FlightHistory | null,
) {
  const histFields = hist
    ? {
        histOnTimePct: hist.onTimePct,
        histSample: hist.sample,
        histAvgDelayMin: hist.avgDelayMin,
      }
    : {};
  await db.market.upsert({
    where: { id: marketId },
    update: { ...histFields },
    create: {
      id: marketId,
      flightKey: f.flightKey,
      flightNumber: f.flightNumber,
      origin: f.origin,
      destination: f.destination,
      scheduledDeparture: f.scheduledDeparture,
      scheduledArrival: f.scheduledArrival,
      status: "OPEN",
      createTxHash: txHash,
      ...histFields,
    },
  });
}
