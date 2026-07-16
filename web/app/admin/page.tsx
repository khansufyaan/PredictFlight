"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { API_URL } from "@/lib/config";

/* Operator dashboard. Deliberately unlinked from the consumer site: the only
 * way in is typing /admin, and every byte of data sits behind ADMIN_SECRET on
 * the oracle — the page itself holds no numbers until the password unlocks it. */

interface Bucket {
  label: string;
  bettors: number;
  newBettors: number;
  bets: number;
  volumeUsd: number;
  revenueUsd: number;
}
interface Metrics {
  generatedAt: number;
  kpis: Record<string, number | null>;
  daily: Bucket[];
  weekly: Bucket[];
  monthly: Bucket[];
  notes: string[];
}
interface StatusCheck {
  component: string;
  status: "green" | "degraded" | "red";
  detail: string;
}

const fetchAdmin = async <T,>(path: string, secret: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "x-admin-secret": secret },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("bad password");
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const pctf = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`);

const LIGHT: Record<string, string> = {
  green: "bg-board-green",
  degraded: "bg-board-amber",
  red: "bg-board-red",
};

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="board-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-board-dim">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-[10px] text-board-dim">{sub}</div>}
    </div>
  );
}

function BucketTable({ title, rows }: { title: string; rows: Bucket[] }) {
  return (
    <div className="board-card overflow-x-auto p-3">
      <div className="flap mb-2 text-xs text-board-amber">{title}</div>
      <table className="w-full text-right text-[11px]">
        <thead className="text-board-dim">
          <tr>
            <th className="pb-1 text-left font-normal">period</th>
            <th className="font-normal">bettors</th>
            <th className="font-normal">new</th>
            <th className="font-normal">bets</th>
            <th className="font-normal">volume</th>
            <th className="font-normal">revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.label} className="border-t border-board-line">
              <td className="py-1 text-left text-board-dim">{b.label}</td>
              <td>{b.bettors}</td>
              <td className={b.newBettors ? "text-board-green" : ""}>{b.newBettors}</td>
              <td>{b.bets}</td>
              <td>{money(b.volumeUsd)}</td>
              <td className={b.revenueUsd ? "font-bold text-board-green" : ""}>
                {money(b.revenueUsd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const [secret, setSecret] = useState(
    () => (typeof window !== "undefined" && sessionStorage.getItem("jetlag-ops")) || "",
  );
  const [input, setInput] = useState("");

  const metricsQ = useQuery({
    queryKey: ["admin-metrics", secret],
    queryFn: () => fetchAdmin<Metrics>("/admin/metrics", secret),
    enabled: !!secret,
    refetchInterval: 60_000,
    retry: false,
  });
  const statusQ = useQuery({
    queryKey: ["admin-status", secret],
    queryFn: () => fetchAdmin<{ overall: string; checks: StatusCheck[] }>("/admin/status", secret),
    enabled: !!secret,
    refetchInterval: 30_000,
    retry: false,
  });

  const unlock = () => {
    sessionStorage.setItem("jetlag-ops", input);
    setSecret(input);
  };

  if (!secret || metricsQ.error) {
    return (
      <div className="mx-auto max-w-xs pt-16">
        <div className="board-card p-5 text-center">
          <div className="flap mb-3 text-xs text-board-amber">Operations — restricted</div>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            placeholder="password"
            className="w-full rounded border border-board-line bg-board-bg px-3 py-2 text-center"
            autoFocus
          />
          <button className="btn-amber mt-3 w-full" onClick={unlock}>
            Unlock
          </button>
          {metricsQ.error != null && secret && (
            <p className="mt-2 text-[11px] text-board-red">wrong password</p>
          )}
        </div>
      </div>
    );
  }

  const m = metricsQ.data;
  const s = statusQ.data;
  if (!m) return <p className="text-sm text-board-dim">loading metrics…</p>;
  const k = m.kpis;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flap text-sm font-bold text-board-amber">Operations</h1>
        <span className="text-[10px] text-board-dim">
          refreshed {new Date(m.generatedAt * 1000).toLocaleTimeString()}
        </span>
      </div>

      {/* stack status board */}
      <div className="board-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${LIGHT[s?.overall ?? "red"]}`} />
          <span className="flap text-xs text-board-amber">Stack status</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-2">
          {(s?.checks ?? []).map((c) => (
            <div key={c.component} className="flex items-start gap-2 text-[11px]">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${LIGHT[c.status]}`} />
              <span>
                <b className="text-white">{c.component}</b>{" "}
                <span className="text-board-dim">{c.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* the money row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Revenue (2% fees)" value={money(k.revenueUsd)} sub={`take rate ${pctf(k.takeRatePct)}`} />
        <Tile label="Total volume" value={money(k.totalVolumeUsd)} sub={`${k.totalBets} bets`} />
        <Tile label="TVL (live pools)" value={money(k.tvlUsd)} sub={`matched ${money(k.matchedLiquidityUsd)}`} />
        <Tile label="Claims paid out" value={money(k.claimsPaidUsd)} />
      </div>

      {/* growth + engagement */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Bettors all-time" value={String(k.totalBettors ?? 0)} sub={`avg bet ${money(k.avgBetUsd)}`} />
        <Tile label="DAU / WAU / MAU" value={`${k.dau} / ${k.wau} / ${k.mau}`} sub="unique betting wallets" />
        <Tile label="30d retention" value={pctf(k.retention30dPct)} sub={`churn ${pctf(k.churn30dPct)}`} />
        <Tile label="Repeat bettors" value={pctf(k.repeatBettorPct)} sub="placed 2+ bets" />
      </div>

      {/* marketplace health */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          label="Markets"
          value={String(k.marketsTotal ?? 0)}
          sub={`${k.marketsOpen} open · ${k.marketsLocked} in air · ${k.marketsResolved} done`}
        />
        <Tile label="Market fill rate" value={pctf(k.marketFillRatePct)} sub="markets with ≥1 bet" />
        <Tile label="Voided (refunds)" value={String(k.marketsVoid ?? 0)} />
        <Tile
          label="Needs review"
          value={String(k.needsReview ?? 0)}
          sub={k.needsReview ? "⚠ settle manually!" : "queue clear"}
        />
      </div>

      <BucketTable title="Daily — last 14 days" rows={m.daily} />
      <div className="grid gap-4 lg:grid-cols-2">
        <BucketTable title="Weekly — last 8 weeks" rows={m.weekly} />
        <BucketTable title="Monthly — last 6 months" rows={m.monthly} />
      </div>

      <div className="board-card p-3 text-[11px] text-board-dim">
        {m.notes.map((n, i) => (
          <p key={i} className="mb-1 last:mb-0">
            • {n}
          </p>
        ))}
      </div>
    </div>
  );
}
