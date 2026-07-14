import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  // chain
  rpcUrl: process.env.RPC_URL ?? process.env.RPC_URL_BASE ?? process.env.RPC_URL_BASE_SEPOLIA ?? "http://127.0.0.1:8545",
  oraclePrivateKey: () => req("ORACLE_PRIVATE_KEY"),
  usdcAddress: () => req("USDC_ADDRESS"),
  flightMarketAddress: () => req("FLIGHT_MARKET_ADDRESS"),

  // service
  port: Number(process.env.PORT ?? 4000),
  adminSecret: process.env.ADMIN_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",

  // flight data
  provider: (process.env.FLIGHT_PROVIDER ?? "mock") as "mock" | "aeroapi",
  aeroApiKey: process.env.AEROAPI_KEY ?? "",

  // jobs (ms). Defaults: ingest every 6h, watch every 2min, index every 15s.
  ingestIntervalMs: Number(process.env.INGEST_INTERVAL_MS ?? 6 * 60 * 60 * 1000),
  watcherIntervalMs: Number(process.env.WATCHER_INTERVAL_MS ?? 2 * 60 * 1000),
  indexerIntervalMs: Number(process.env.INDEXER_INTERVAL_MS ?? 15 * 1000),

  // MockProvider pacing: how long after "now" mock flights depart/fly (seconds)
  mockDepartsInSec: Number(process.env.MOCK_DEPARTS_IN_SEC ?? 45),
  mockFlightDurationSec: Number(process.env.MOCK_FLIGHT_DURATION_SEC ?? 30),
  mockForceOutcome: process.env.MOCK_FORCE_OUTCOME as
    | "ON_TIME"
    | "LATE"
    | "CANCELLED"
    | "DIVERTED"
    | undefined,

  // settlement
  onTimeThresholdSec: 15 * 60,
  manualReviewAfterSec: 6 * 60 * 60,
};

export const OUTCOME = { UNRESOLVED: 0, ON_TIME: 1, LATE: 2, VOID: 3 } as const;
export type OutcomeName = keyof typeof OUTCOME;
