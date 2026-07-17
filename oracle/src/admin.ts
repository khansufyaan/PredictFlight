import { config } from "./config.js";
import { db } from "./db.js";
import { provider } from "./chain.js";

const FEE_BPS = 200n;
const BPS = 10_000n;
const DAY = 86_400;

const usd = (raw: bigint) => Number(raw) / 1e6;

/** Fee the protocol earns from one resolved market: 2% of the losing pool,
 *  charged on winnings only — so it exists only when both sides have money. */
function marketFee(m: { outcome: string; onTimePool: bigint; latePool: bigint }): bigint {
  if (m.outcome !== "ON_TIME" && m.outcome !== "LATE") return 0n;
  const winPool = m.outcome === "ON_TIME" ? m.onTimePool : m.latePool;
  const losePool = m.outcome === "ON_TIME" ? m.latePool : m.onTimePool;
  if (winPool === 0n || losePool === 0n) return 0n;
  return (losePool * FEE_BPS) / BPS;
}

interface Bucket {
  label: string;
  start: number; // inclusive, epoch sec
  end: number; // exclusive
  bettors: number;
  newBettors: number;
  bets: number;
  volumeUsd: number;
  revenueUsd: number;
}

function makeBuckets(now: number, sizeSec: number, count: number, label: (s: number) => string) {
  const out: Omit<Bucket, "bettors" | "newBettors" | "bets" | "volumeUsd" | "revenueUsd">[] = [];
  // align daily/weekly buckets to UTC midnight for stable reporting
  const todayStart = Math.floor(now / DAY) * DAY;
  for (let i = count - 1; i >= 0; i--) {
    const start = todayStart - i * sizeSec;
    out.push({ label: label(start), start, end: start + sizeSec });
  }
  return out;
}

export async function computeMetrics() {
  const now = Math.floor(Date.now() / 1000);
  const [deposits, markets, claims] = await Promise.all([
    db.deposit.findMany({ orderBy: { timestamp: "asc" } }),
    db.market.findMany(),
    db.claim.findMany(),
  ]);

  // ---- first-seen map for "new bettor" + retention math
  const firstSeen = new Map<string, number>();
  const betsPerUser = new Map<string, number>();
  for (const d of deposits) {
    if (!firstSeen.has(d.user)) firstSeen.set(d.user, d.timestamp);
    betsPerUser.set(d.user, (betsPerUser.get(d.user) ?? 0) + 1);
  }

  // ---- resolved-market revenue, keyed by resolvedAt for time series
  const resolved = markets.filter((m) => m.status === "RESOLVED");
  const revenueEvents = resolved
    .map((m) => ({ t: m.resolvedAt ?? 0, fee: marketFee(m) }))
    .filter((e) => e.fee > 0n);

  const series = (sizeSec: number, count: number, label: (s: number) => string): Bucket[] =>
    makeBuckets(now, sizeSec, count, label).map((b) => {
      const inWin = deposits.filter((d) => d.timestamp >= b.start && d.timestamp < b.end);
      const uniq = new Set(inWin.map((d) => d.user));
      const fresh = [...uniq].filter(
        (u) => firstSeen.get(u)! >= b.start && firstSeen.get(u)! < b.end,
      );
      const vol = inWin.reduce((a, d) => a + d.amount, 0n);
      const rev = revenueEvents
        .filter((e) => e.t >= b.start && e.t < b.end)
        .reduce((a, e) => a + e.fee, 0n);
      return {
        ...b,
        bettors: uniq.size,
        newBettors: fresh.length,
        bets: inWin.length,
        volumeUsd: usd(vol),
        revenueUsd: usd(rev),
      };
    });

  const fmtDay = (s: number) =>
    new Date(s * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtWeek = (s: number) => `wk of ${fmtDay(s)}`;
  const fmtMonth = (s: number) =>
    new Date(s * 1000).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  // ---- engagement: unique bettors over rolling windows
  const activeSince = (sec: number) =>
    new Set(deposits.filter((d) => d.timestamp >= now - sec).map((d) => d.user)).size;

  // ---- churn/retention: of wallets that bet in the previous 30d window,
  //      what share came back in the current 30d window?
  const cur = new Set(deposits.filter((d) => d.timestamp >= now - 30 * DAY).map((d) => d.user));
  const prev = new Set(
    deposits
      .filter((d) => d.timestamp >= now - 60 * DAY && d.timestamp < now - 30 * DAY)
      .map((d) => d.user),
  );
  const returned = [...prev].filter((u) => cur.has(u)).length;
  const retention30 = prev.size ? returned / prev.size : null;

  // ---- pools / liquidity
  const openPools = markets
    .filter((m) => m.status === "OPEN" || m.status === "LOCKED")
    .reduce((a, m) => a + m.onTimePool + m.latePool, 0n);
  const matched = markets.reduce(
    (a, m) => a + 2n * (m.onTimePool < m.latePool ? m.onTimePool : m.latePool),
    0n,
  );
  const totalVolume = deposits.reduce((a, d) => a + d.amount, 0n);
  const totalRevenue = revenueEvents.reduce((a, e) => a + e.fee, 0n);
  const claimsPaid = claims.reduce((a, c) => a + c.payout, 0n);

  const marketsWithBets = new Set(deposits.map((d) => d.marketId)).size;
  const repeatBettors = [...betsPerUser.values()].filter((n) => n >= 2).length;

  // ---- site traffic (first-party beacon): daily views + unique visitors,
  //      last 30 days, zero-filled so the chart has a bar per day
  const since = new Date((now - 30 * DAY) * 1000).toISOString().slice(0, 10);
  const trafficRows = (await db.$queryRawUnsafe(
    `SELECT day, COUNT(*) AS views, COUNT(DISTINCT vh) AS visitors
       FROM Visit WHERE day >= ? GROUP BY day ORDER BY day`,
    since,
  )) as { day: string; views: bigint | number; visitors: bigint | number }[];
  const byDay = new Map(trafficRows.map((r) => [r.day, r]));
  const traffic: { day: string; views: number; visitors: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date((now - i * DAY) * 1000).toISOString().slice(0, 10);
    const r = byDay.get(day);
    traffic.push({ day, views: Number(r?.views ?? 0), visitors: Number(r?.visitors ?? 0) });
  }

  return {
    generatedAt: now,
    traffic,
    kpis: {
      // the number VCs ask about first: protocol revenue (the 2%)
      revenueUsd: usd(totalRevenue),
      totalVolumeUsd: usd(totalVolume),
      takeRatePct: totalVolume > 0n ? (Number(totalRevenue) / Number(totalVolume)) * 100 : 0,
      tvlUsd: usd(openPools), // money currently locked in live pools
      matchedLiquidityUsd: usd(matched), // volume that actually has a counterparty
      claimsPaidUsd: usd(claimsPaid),
      totalBettors: firstSeen.size,
      totalBets: deposits.length,
      avgBetUsd: deposits.length ? usd(totalVolume) / deposits.length : 0,
      dau: activeSince(DAY),
      wau: activeSince(7 * DAY),
      mau: activeSince(30 * DAY),
      retention30dPct: retention30 == null ? null : retention30 * 100,
      churn30dPct: retention30 == null ? null : (1 - retention30) * 100,
      repeatBettorPct: firstSeen.size ? (repeatBettors / firstSeen.size) * 100 : 0,
      marketsTotal: markets.length,
      marketsOpen: markets.filter((m) => m.status === "OPEN").length,
      marketsLocked: markets.filter((m) => m.status === "LOCKED").length,
      marketsResolved: resolved.length,
      marketsVoid: resolved.filter((m) => m.outcome === "VOID").length,
      marketFillRatePct: markets.length ? (marketsWithBets / markets.length) * 100 : 0,
      needsReview: markets.filter((m) => m.needsReview).length,
    },
    daily: series(DAY, 14, fmtDay),
    weekly: series(7 * DAY, 8, fmtWeek),
    monthly: series(30 * DAY, 6, fmtMonth),
    notes: [
      "Sign-in counts live in the Privy dashboard (we don't store logins server-side); 'bettors' here = unique wallets that deposited.",
      "Revenue = 2% of each losing pool on resolved markets (fee is charged on winnings only). Sweep it on-chain with sweepFees().",
      "Churn = share of last-30d-window bettors who did not bet again this window.",
    ],
  };
}

type Light = "green" | "degraded" | "red";
interface Check {
  component: string;
  status: Light;
  detail: string;
}

async function timed<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

/** Ops status board: every dependency of the stack, green/degraded/red. */
export async function computeStatus(): Promise<{ overall: Light; checks: Check[] }> {
  const checks: Check[] = [];
  const push = (component: string, status: Light, detail: string) =>
    checks.push({ component, status, detail });

  push("oracle api", "green", "serving requests (you're reading this)");

  // database
  try {
    const n = await timed(4000, () => db.market.count());
    push("database", "green", `${n} markets stored`);
  } catch (e) {
    push("database", "red", String(e));
  }

  // chain rpc + indexer lag
  let head = 0;
  try {
    head = await timed(6000, () => provider().getBlockNumber());
    push("base rpc", "green", `head block ${head}`);
  } catch (e) {
    push("base rpc", "red", `unreachable: ${String(e).slice(0, 80)}`);
  }
  try {
    const st = await db.indexerState.findFirst();
    const lag = head && st ? head - st.lastBlock : null;
    if (lag == null) push("indexer", "degraded", "no checkpoint yet");
    else if (lag < 300) push("indexer", "green", `${lag} blocks behind head`);
    else push("indexer", "degraded", `${lag} blocks behind head`);
  } catch (e) {
    push("indexer", "red", String(e));
  }

  // contract deployed?
  try {
    const addr = config.flightMarketAddress();
    const code = await timed(6000, () => provider().getCode(addr));
    push(
      "flightmarket contract",
      code && code !== "0x" ? "green" : "red",
      code && code !== "0x" ? addr : "no code at address",
    );
  } catch (e) {
    push("flightmarket contract", "red", String(e).slice(0, 80));
  }

  // oracle wallet gas
  try {
    const w = await timed(6000, async () => {
      const { oracleWallet } = await import("./chain.js");
      const wallet = oracleWallet();
      const bal = await provider().getBalance(wallet.address);
      return { addr: wallet.address, bal };
    });
    const eth = Number(w.bal) / 1e18;
    push(
      "oracle wallet gas",
      eth > 0.0004 ? "green" : eth > 0.0001 ? "degraded" : "red",
      `${eth.toFixed(5)} ETH on ${w.addr.slice(0, 8)}… (settles ~${Math.floor(eth / 0.000015)} more flights)`,
    );
  } catch (e) {
    push("oracle wallet gas", "red", String(e).slice(0, 80));
  }

  // flight data ingestion freshness
  try {
    const newest = await db.market.findFirst({ orderBy: { createdAt: "desc" } });
    const ageH = newest ? (Date.now() - newest.createdAt.getTime()) / 3600_000 : Infinity;
    if (ageH < 26) push("flight data ingest", "green", `last market created ${ageH.toFixed(1)}h ago (${config.provider})`);
    else if (ageH < 48) push("flight data ingest", "degraded", `no new markets in ${ageH.toFixed(0)}h`);
    else push("flight data ingest", "red", `no new markets in ${ageH.toFixed(0)}h — check AeroAPI key/quota`);
  } catch (e) {
    push("flight data ingest", "red", String(e));
  }

  // settlement queue
  try {
    const stuck = await db.market.count({ where: { needsReview: true } });
    push(
      "settlement queue",
      stuck === 0 ? "green" : "degraded",
      stuck === 0 ? "no flights awaiting manual review" : `${stuck} flight(s) BLOCKED on manual review`,
    );
  } catch (e) {
    push("settlement queue", "red", String(e));
  }

  const overall: Light = checks.some((c) => c.status === "red")
    ? "red"
    : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : "green";
  return { overall, checks };
}
