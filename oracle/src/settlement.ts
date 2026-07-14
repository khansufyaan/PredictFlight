import { OUTCOME, type OutcomeName } from "./config.js";
import { db } from "./db.js";
import { flightMarket, withRetry } from "./chain.js";

/**
 * Resolve a market on-chain. Idempotent: checks on-chain state first and
 * treats "already resolved" as success, so crashed/re-run watchers never
 * double-resolve. RPC calls retry with exponential backoff.
 */
export async function resolveOnChain(
  marketId: string,
  outcome: Exclude<OutcomeName, "UNRESOLVED">,
  actualTouchdown: number,
): Promise<{ txHash: string | null; alreadyResolved: boolean }> {
  const fm = flightMarket();

  const onChain = await withRetry("getMarket", () => fm.getMarket(marketId));
  if (onChain.scheduledDeparture === 0n) throw new Error(`market ${marketId} unknown on-chain`);
  if (onChain.resolvedAt !== 0n) {
    console.log(`[settle] ${marketId} already resolved on-chain, syncing db only`);
    await db.market.update({
      where: { id: marketId },
      data: {
        status: "RESOLVED",
        outcome: outcomeName(Number(onChain.outcome)),
        resolvedAt: Number(onChain.resolvedAt),
        actualTouchdown: Number(onChain.actualTouchdown) || null,
      },
    });
    return { txHash: null, alreadyResolved: true };
  }

  const tx = await withRetry("resolve", () =>
    fm.resolve(marketId, OUTCOME[outcome], actualTouchdown),
  );
  const receipt = await tx.wait();
  console.log(`[settle] resolved ${marketId} -> ${outcome} in tx ${receipt.hash}`);

  await db.market.update({
    where: { id: marketId },
    data: {
      status: "RESOLVED",
      outcome,
      resolvedAt: Math.floor(Date.now() / 1000),
      actualTouchdown: actualTouchdown || null,
      resolveTxHash: receipt.hash,
      needsReview: false,
    },
  });
  return { txHash: receipt.hash, alreadyResolved: false };
}

export function outcomeName(n: number): OutcomeName {
  return (Object.keys(OUTCOME) as OutcomeName[])[n] ?? "UNRESOLVED";
}
