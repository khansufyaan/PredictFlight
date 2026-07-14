import { Interface, type Log } from "ethers";
import { FLIGHT_MARKET_ABI } from "./abi.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { provider } from "./chain.js";
import { outcomeName } from "./settlement.js";

const iface = new Interface(FLIGHT_MARKET_ABI);

/**
 * Event indexer: polls Deposited/Resolved/Overturned/Claimed logs and mirrors
 * them into SQLite for the REST API. Poll-based (not websocket) so it works
 * against any plain https RPC; resumes from IndexerState.lastBlock.
 */
export async function runIndexer(): Promise<void> {
  const p = provider();
  const latest = await p.getBlockNumber();
  const state = await db.indexerState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastBlock: 0 },
  });
  if (latest <= state.lastBlock) return;

  // cap range per tick to keep RPC calls bounded
  const from = state.lastBlock + 1;
  const to = Math.min(latest, from + 9999);
  const logs = await p.getLogs({
    address: config.flightMarketAddress(),
    fromBlock: from,
    toBlock: to,
  });

  const tsCache = new Map<number, number>();
  const blockTs = async (bn: number): Promise<number> => {
    if (!tsCache.has(bn)) {
      const b = await p.getBlock(bn);
      tsCache.set(bn, b?.timestamp ?? Math.floor(Date.now() / 1000));
    }
    return tsCache.get(bn)!;
  };

  for (const log of logs) {
    const parsed = safeParse(log);
    if (!parsed) continue;
    const marketId: string | undefined = parsed.args.marketId;
    const market = marketId ? await db.market.findUnique({ where: { id: marketId } }) : null;
    if (!market || !marketId) continue; // markets created outside this oracle's db

    switch (parsed.name) {
      case "Deposited": {
        const ts = await blockTs(log.blockNumber);
        const side = Number(parsed.args.side) === 0 ? "ON_TIME" : "LATE";
        const amount = BigInt(parsed.args.amount);
        try {
          await db.deposit.create({
            data: {
              marketId,
              user: String(parsed.args.user).toLowerCase(),
              side,
              amount,
              txHash: log.transactionHash,
              logIndex: log.index,
              blockNumber: log.blockNumber,
              timestamp: ts,
            },
          });
        } catch {
          break; // unique(txHash,logIndex) — already indexed
        }
        const updated = await db.market.update({
          where: { id: marketId },
          data:
            side === "ON_TIME"
              ? { onTimePool: { increment: amount } }
              : { latePool: { increment: amount } },
        });
        await db.oddsSnapshot.create({
          data: {
            marketId,
            timestamp: ts,
            onTimePool: updated.onTimePool,
            latePool: updated.latePool,
          },
        });
        break;
      }
      case "Resolved":
      case "Overturned": {
        const ts = await blockTs(log.blockNumber);
        const oc = outcomeName(Number(parsed.args.outcome ?? parsed.args.newOutcome));
        await db.market.update({
          where: { id: marketId },
          data: {
            status: "RESOLVED",
            outcome: oc,
            resolvedAt: ts,
            ...(parsed.name === "Resolved"
              ? { actualTouchdown: Number(parsed.args.actualTouchdown) || null }
              : {}),
          },
        });
        break;
      }
      case "Claimed": {
        const ts = await blockTs(log.blockNumber);
        try {
          await db.claim.create({
            data: {
              marketId,
              user: String(parsed.args.user).toLowerCase(),
              payout: BigInt(parsed.args.payout),
              txHash: log.transactionHash,
              logIndex: log.index,
              blockNumber: log.blockNumber,
              timestamp: ts,
            },
          });
        } catch {
          // already indexed
        }
        break;
      }
    }
  }

  await db.indexerState.update({ where: { id: 1 }, data: { lastBlock: to } });
}

function safeParse(log: Log) {
  try {
    return iface.parseLog({ topics: [...log.topics], data: log.data });
  } catch {
    return null;
  }
}
