import { db } from "./db.js";

export interface LeaderboardRow {
  address: string;
  staked: string; // USDC 6dp, resolved non-void markets only
  returned: string; // winning-side gross returns (stake + winnings after fee)
  roiPct: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
}

/**
 * Ranks wallets by ROI over resolved (non-void) markets, computed from indexed
 * Deposited events + market outcomes. "Returned" uses the parimutuel formula
 * rather than Claimed events so unclaimed winnings still count toward ROI.
 * Win streak = consecutive resolved markets (by resolution time) where the
 * wallet had stake on the winning side.
 */
export async function computeLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  const markets = await db.market.findMany({
    where: { status: "RESOLVED", outcome: { in: ["ON_TIME", "LATE"] } },
    include: { deposits: true },
    orderBy: { resolvedAt: "asc" },
  });

  type Acc = {
    staked: bigint;
    returned: bigint;
    wins: number;
    losses: number;
    currentStreak: number;
    bestStreak: number;
  };
  const acc = new Map<string, Acc>();
  const get = (a: string): Acc => {
    if (!acc.has(a)) {
      acc.set(a, { staked: 0n, returned: 0n, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0 });
    }
    return acc.get(a)!;
  };

  for (const m of markets) {
    const winSide = m.outcome; // "ON_TIME" | "LATE"
    const winnerPool = winSide === "ON_TIME" ? m.onTimePool : m.latePool;
    const loserPool = winSide === "ON_TIME" ? m.latePool : m.onTimePool;

    // aggregate per user per side for this market
    const perUser = new Map<string, { win: bigint; lose: bigint }>();
    for (const d of m.deposits) {
      const u = perUser.get(d.user) ?? { win: 0n, lose: 0n };
      if (d.side === winSide) u.win += d.amount;
      else u.lose += d.amount;
      perUser.set(d.user, u);
    }

    for (const [user, { win, lose }] of perUser) {
      const a = get(user);
      a.staked += win + lose;
      if (win > 0n) {
        const winnings = winnerPool > 0n && loserPool > 0n ? (win * loserPool) / winnerPool : 0n;
        const fee = (winnings * 200n) / 10_000n;
        a.returned += win + winnings - fee;
        a.wins++;
        a.currentStreak++;
        a.bestStreak = Math.max(a.bestStreak, a.currentStreak);
      } else {
        a.losses++;
        a.currentStreak = 0;
      }
    }
  }

  return [...acc.entries()]
    .map(([address, a]) => ({
      address,
      staked: a.staked.toString(),
      returned: a.returned.toString(),
      roiPct:
        a.staked === 0n ? 0 : Number(((a.returned - a.staked) * 10_000n) / a.staked) / 100,
      wins: a.wins,
      losses: a.losses,
      currentStreak: a.currentStreak,
      bestStreak: a.bestStreak,
    }))
    .sort((x, y) => y.roiPct - x.roiPct || y.wins - x.wins)
    .slice(0, limit);
}
