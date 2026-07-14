"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { flightMarketAbi } from "@/lib/abi";
import type { Market } from "@/lib/api";
import { FLIGHT_MARKET_ADDRESS } from "@/lib/config";
import { usdc } from "@/lib/format";
import { Countdown } from "./Countdown";

const DISPUTE_WINDOW = 24 * 3600;

export function ClaimPanel({ market }: { market: Market }) {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { data: stakeOnTime } = useReadContract({
    address: FLIGHT_MARKET_ADDRESS,
    abi: flightMarketAbi,
    functionName: "getStake",
    args: address ? [market.id as `0x${string}`, address, 0] : undefined,
    query: { enabled: !!address },
  });
  const { data: stakeLate } = useReadContract({
    address: FLIGHT_MARKET_ADDRESS,
    abi: flightMarketAbi,
    functionName: "getStake",
    args: address ? [market.id as `0x${string}`, address, 1] : undefined,
    query: { enabled: !!address },
  });
  const { data: alreadyClaimed, refetch } = useReadContract({
    address: FLIGHT_MARKET_ADDRESS,
    abi: flightMarketAbi,
    functionName: "claimed",
    args: address ? [market.id as `0x${string}`, address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => {
    if (isSuccess) {
      refetch();
      queryClient.invalidateQueries();
    }
  }, [isSuccess, refetch, queryClient]);

  if (!address || market.status !== "RESOLVED" || !market.resolvedAt) return null;

  const onTime = stakeOnTime ?? 0n;
  const late = stakeLate ?? 0n;
  const winStake = market.outcome === "VOID" ? onTime + late : market.outcome === "ON_TIME" ? onTime : late;
  if (winStake === 0n) {
    if (onTime + late > 0n) {
      return (
        <div className="board-card p-4 text-center text-sm text-board-dim">
          Your ${usdc(onTime + late)} was on the losing side. Better luck next flight.
        </div>
      );
    }
    return null;
  }

  const unlockAt = market.resolvedAt + DISPUTE_WINDOW;
  const locked = Date.now() / 1000 < unlockAt;

  let estimate = winStake;
  if (market.outcome !== "VOID") {
    const winPool = BigInt(market.outcome === "ON_TIME" ? market.onTimePool : market.latePool);
    const losePool = BigInt(market.outcome === "ON_TIME" ? market.latePool : market.onTimePool);
    if (winPool > 0n && losePool > 0n) {
      const winnings = (winStake * losePool) / winPool;
      estimate = winStake + winnings - (winnings * 200n) / 10_000n;
    }
  }

  return (
    <div className="board-card p-4">
      <div className="flap mb-2 text-xs text-board-dim">
        {market.outcome === "VOID" ? "Refund" : "Winnings"}
      </div>
      <div className="text-2xl font-bold text-board-green">${usdc(estimate, 2)}</div>
      {alreadyClaimed ? (
        <div className="mt-2 text-sm text-board-dim">Claimed ✓</div>
      ) : locked ? (
        <div className="mt-2 text-sm text-board-amber">
          Dispute window — claims unlock in <Countdown to={unlockAt} doneLabel="now" />
        </div>
      ) : (
        <button
          className="btn-amber mt-3 w-full"
          disabled={isPending}
          onClick={() =>
            writeContract({
              address: FLIGHT_MARKET_ADDRESS,
              abi: flightMarketAbi,
              functionName: "claim",
              args: [market.id as `0x${string}`],
            })
          }
        >
          {isPending ? "Claiming…" : "Claim"}
        </button>
      )}
    </div>
  );
}
