import { API_URL } from "./config";

export interface Market {
  id: string;
  flightKey: string;
  flightNumber: string;
  origin: string;
  destination: string;
  scheduledDeparture: number;
  scheduledArrival: number;
  status: "OPEN" | "LOCKED" | "RESOLVED";
  outcome: "UNRESOLVED" | "ON_TIME" | "LATE" | "VOID";
  resolvedAt: number | null;
  actualTouchdown: number | null;
  needsReview: boolean;
  onTimePool: string;
  latePool: string;
  impliedOnTimeProb: number;
  impliedLateProb: number;
}

export interface OddsPoint {
  timestamp: number;
  onTimePool: string;
  latePool: string;
}

export interface Matchup {
  code: string;
  side: string;
  creator: string;
  acceptor: string | null;
}

export interface MarketDetail extends Market {
  oddsHistory: OddsPoint[];
  matchups: Matchup[];
}

export interface LeaderboardRow {
  address: string;
  staked: string;
  returned: string;
  roiPct: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
}

export interface ChallengeInfo {
  code: string;
  side: "ON_TIME" | "LATE";
  creator: string;
  acceptor: string | null;
  oppositeSide: "ON_TIME" | "LATE";
  market: Market;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} on ${path}`);
  return res.json();
}

export const api = {
  markets: () => get<Market[]>("/markets"),
  market: (id: string) => get<MarketDetail>(`/markets/${id}`),
  position: (id: string, address: string) =>
    get<{ onTime: string; late: string }>(`/markets/${id}/positions/${address}`),
  leaderboard: () => get<LeaderboardRow[]>("/leaderboard"),
  challenge: (code: string) => get<ChallengeInfo>(`/challenge/${code}`),
  createChallenge: async (marketId: string, side: string, creator: string) => {
    const res = await fetch(`${API_URL}/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ marketId, side, creator }),
    });
    if (!res.ok) throw new Error(`challenge create failed (${res.status})`);
    return res.json() as Promise<{ code: string }>;
  },
  acceptChallenge: async (code: string, address: string) => {
    const res = await fetch(`${API_URL}/challenge/${code}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address }),
    });
    return res.ok;
  },
};
