"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { api } from "@/lib/api";
import { shortAddr, usdc } from "@/lib/format";

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const { data: rows } = useQuery({ queryKey: ["leaderboard"], queryFn: api.leaderboard });

  return (
    <div>
      <h1 className="flap mb-4 text-sm text-board-amber">Leaderboard — ROI on resolved flights</h1>
      {!isConnected && (
        <div className="board-card mb-4 flex items-center justify-between p-4 text-xs text-board-dim">
          <span>Connect a wallet to see yourself on the board.</span>
          <ConnectButton />
        </div>
      )}
      <div className="board-card divide-y divide-board-line">
        {(rows ?? []).map((r, i) => (
          <div
            key={r.address}
            className={`flex items-center gap-3 p-3 text-sm ${
              address && r.address === address.toLowerCase() ? "bg-board-amber/10" : ""
            }`}
          >
            <span className="w-6 text-right text-board-dim">{i + 1}</span>
            <span className="flex-1">{shortAddr(r.address)}</span>
            {r.currentStreak >= 3 && (
              <span className="rounded bg-board-amber/20 px-1.5 py-0.5 text-[10px] text-board-amber">
                🔥 {r.currentStreak} streak
              </span>
            )}
            <span className="w-16 text-right text-[11px] text-board-dim">
              {r.wins}W/{r.losses}L
            </span>
            <span className="w-20 text-right text-[11px] text-board-dim">${usdc(r.staked)}</span>
            <span
              className={`w-20 text-right font-bold ${r.roiPct >= 0 ? "text-board-green" : "text-board-red"}`}
            >
              {r.roiPct >= 0 ? "+" : ""}
              {r.roiPct.toFixed(1)}%
            </span>
          </div>
        ))}
        {rows && rows.length === 0 && (
          <div className="p-6 text-center text-xs text-board-dim">
            No resolved bets yet. Be the first on the board.
          </div>
        )}
      </div>
    </div>
  );
}
