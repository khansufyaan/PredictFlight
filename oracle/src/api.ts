import { createHash, randomBytes } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { computeMetrics, computeStatus } from "./admin.js";
import { config, OUTCOME, type OutcomeName } from "./config.js";
import { currentFeeds } from "./feeds.js";
import { db } from "./db.js";
import { computeLeaderboard } from "./leaderboard.js";
import { resolveOnChain } from "./settlement.js";

/** Shared guard for operator endpoints: x-admin-secret must match ADMIN_SECRET. */
function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const secret = req.headers["x-admin-secret"];
  if (!config.adminSecret || secret !== config.adminSecret) {
    reply.code(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
}

const j = (x: unknown) =>
  JSON.parse(JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

function marketView(m: any) {
  const total = BigInt(m.onTimePool) + BigInt(m.latePool);
  const onTimeOdds = total === 0n ? 0.5 : Number((BigInt(m.onTimePool) * 10_000n) / total) / 10_000;
  return j({
    ...m,
    impliedOnTimeProb: onTimeOdds,
    impliedLateProb: 1 - onTimeOdds,
  });
}

export async function buildApi(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  // Public read endpoints change on a seconds cadence at most. A short shared
  // cache (CDN / proxy) absorbs polling bursts so the DB sees one query per
  // window instead of one per client — the cheapest scalability lever we have.
  app.addHook("onSend", async (req, reply) => {
    if (req.method === "GET" && !reply.getHeader("cache-control")) {
      reply.header("cache-control", "public, s-maxage=5, stale-while-revalidate=15");
    }
  });

  app.get("/health", async () => ({ ok: true, provider: config.provider }));

  // current live video id per cam airport (stream ids rotate; we re-resolve
  // server-side). Long shared cache: it changes every few days at most.
  app.get("/feeds", async (_req, reply) => {
    reply.header("cache-control", "public, s-maxage=300, stale-while-revalidate=3600");
    return currentFeeds();
  });

  // first-party pageview beacon. Anonymous by construction: the visitor hash
  // is salted with the calendar day, so it cannot link a browser across days.
  app.post("/track", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const { path } = (req.body ?? {}) as { path?: string };
    const p = typeof path === "string" && path.length <= 100 ? path.split("?")[0] : "/";
    if (p.startsWith("/admin")) return { ok: true };
    const fwd = req.headers["x-forwarded-for"];
    const ip = (typeof fwd === "string" ? fwd.split(",")[0].trim() : "") || req.ip;
    const ua = String(req.headers["user-agent"] ?? "");
    const day = new Date().toISOString().slice(0, 10);
    const vh = createHash("sha256").update(`${day}|${ip}|${ua}`).digest("hex").slice(0, 16);
    await db.visit.create({
      data: { day, path: p, vh, ts: Math.floor(Date.now() / 1000) },
    });
    return { ok: true };
  });

  app.get("/markets", async (req) => {
    const { status } = req.query as { status?: string };
    const markets = await db.market.findMany({
      where: status ? { status: status.toUpperCase() } : undefined,
      orderBy: { scheduledDeparture: "asc" },
    });
    return markets.map(marketView);
  });

  app.get("/markets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const m = await db.market.findUnique({
      where: { id },
      include: {
        snapshots: { orderBy: { timestamp: "asc" } },
        challenges: { where: { acceptor: { not: null } } },
      },
    });
    if (!m) return reply.code(404).send({ error: "market not found" });
    const { snapshots, challenges, ...rest } = m;
    return {
      ...marketView(rest),
      oddsHistory: j(snapshots),
      matchups: j(challenges),
    };
  });

  app.get("/markets/:id/positions/:address", async (req, reply) => {
    const { id, address } = req.params as { id: string; address: string };
    const deposits = await db.deposit.findMany({
      where: { marketId: id, user: address.toLowerCase() },
    });
    let onTime = 0n;
    let late = 0n;
    for (const d of deposits) (d.side === "ON_TIME" ? (onTime += d.amount) : (late += d.amount));
    return j({ onTime, late });
  });

  app.get("/leaderboard", async () => computeLeaderboard());

  /** every market the wallet has a position in, with aggregated stakes */
  app.get("/users/:address/positions", async (req) => {
    const { address } = req.params as { address: string };
    const deposits = await db.deposit.findMany({
      where: { user: address.toLowerCase() },
      include: { market: true },
    });
    const agg = new Map<string, { market: any; onTime: bigint; late: bigint }>();
    for (const d of deposits) {
      const cur = agg.get(d.marketId) ?? { market: d.market, onTime: 0n, late: 0n };
      if (d.side === "ON_TIME") cur.onTime += d.amount;
      else cur.late += d.amount;
      agg.set(d.marketId, cur);
    }
    return [...agg.values()]
      .sort((a, b) => b.market.scheduledDeparture - a.market.scheduledDeparture)
      .map(({ market, onTime, late }) => ({
        market: marketView(market),
        onTime: onTime.toString(),
        late: late.toString(),
      }));
  });

  app.post("/challenge", async (req, reply) => {
    const { marketId, side, creator } = (req.body ?? {}) as {
      marketId?: string;
      side?: string;
      creator?: string;
    };
    if (!marketId || !creator || !["ON_TIME", "LATE"].includes(side ?? "")) {
      return reply.code(400).send({ error: "marketId, side (ON_TIME|LATE), creator required" });
    }
    const market = await db.market.findUnique({ where: { id: marketId } });
    if (!market) return reply.code(404).send({ error: "market not found" });
    if (market.status !== "OPEN") return reply.code(409).send({ error: "market not open" });

    const code = randomBytes(6).toString("hex");
    const ch = await db.challenge.create({
      data: { code, marketId, side: side!, creator: creator.toLowerCase() },
    });
    return { code: ch.code, url: `/challenge/${ch.code}` };
  });

  app.get("/challenge/:code", async (req, reply) => {
    const { code } = req.params as { code: string };
    const ch = await db.challenge.findUnique({ where: { code }, include: { market: true } });
    if (!ch) return reply.code(404).send({ error: "challenge not found" });
    const { market, ...rest } = ch;
    return { ...j(rest), market: marketView(market), oppositeSide: ch.side === "ON_TIME" ? "LATE" : "ON_TIME" };
  });

  /** Called by the frontend after its opposite-side deposit confirms; verified
   *  against indexed Deposited events, so a matchup only forms via the link. */
  app.post("/challenge/:code/accept", async (req, reply) => {
    const { code } = req.params as { code: string };
    const { address } = (req.body ?? {}) as { address?: string };
    if (!address) return reply.code(400).send({ error: "address required" });
    const ch = await db.challenge.findUnique({ where: { code } });
    if (!ch) return reply.code(404).send({ error: "challenge not found" });
    if (ch.acceptor) return reply.code(409).send({ error: "challenge already accepted" });
    const user = address.toLowerCase();
    if (user === ch.creator) return reply.code(400).send({ error: "cannot accept own challenge" });

    const opposite = ch.side === "ON_TIME" ? "LATE" : "ON_TIME";
    const deposit = await db.deposit.findFirst({
      where: { marketId: ch.marketId, user, side: opposite },
    });
    if (!deposit) {
      return reply
        .code(409)
        .send({ error: "no opposite-side deposit indexed yet for this address — retry shortly" });
    }
    const updated = await db.challenge.update({ where: { code }, data: { acceptor: user } });
    return j(updated);
  });

  // ---- operator endpoints (never cached, never public) ----

  app.get("/admin/metrics", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    reply.header("cache-control", "no-store");
    return computeMetrics();
  });

  app.get("/admin/status", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    reply.header("cache-control", "no-store");
    return computeStatus();
  });

  app.post("/admin/resolve", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { marketId, outcome, actualTouchdown } = (req.body ?? {}) as {
      marketId?: string;
      outcome?: string;
      actualTouchdown?: number;
    };
    const oc = outcome?.toUpperCase() as OutcomeName | undefined;
    if (!marketId || !oc || !(oc in OUTCOME) || oc === "UNRESOLVED") {
      return reply.code(400).send({ error: "marketId and outcome (ON_TIME|LATE|VOID) required" });
    }
    const market = await db.market.findUnique({ where: { id: marketId } });
    if (!market) return reply.code(404).send({ error: "market not found" });
    const result = await resolveOnChain(marketId, oc, actualTouchdown ?? 0);
    return result;
  });

  return app;
}
