/**
 * `npm run demo` — full accelerated market lifecycle against a throwaway anvil:
 *   create -> deposit both sides -> lock -> "fly" -> resolve -> fast-forward
 *   dispute window -> claim -> leaderboard. Finishes in ~2 minutes.
 */
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Contract, JsonRpcProvider, Wallet, formatUnits, parseUnits } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_DIR = path.resolve(__dirname, "..");
const RPC = "http://127.0.0.1:8547";

process.env.RPC_URL = RPC;
process.env.DATABASE_URL = "file:./demo.db";
process.env.FLIGHT_PROVIDER = "mock";
process.env.MOCK_DEPARTS_IN_SEC = "35";
process.env.MOCK_FLIGHT_DURATION_SEC = "25";
process.env.MOCK_FORCE_OUTCOME = "ON_TIME";
process.env.WATCHER_INTERVAL_MS = "5000";

const log = (msg: string) => console.log(`\n=== ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  log("resetting demo database");
  execSync("rm -rf prisma/demo.db prisma/demo.db-journal && npx prisma db push --skip-generate", {
    cwd: ORACLE_DIR,
    stdio: "pipe",
    env: process.env,
  });

  log("starting throwaway anvil on :8547");
  const anvil = spawn("anvil", ["--port", "8547", "--silent"], { stdio: "ignore" });
  process.on("exit", () => anvil.kill());
  await sleep(1500);

  const { deployStack, ANVIL_KEYS } = await import("./scripts/deploy-local.js");
  const { usdcAddress, flightMarketAddress } = await deployStack(RPC);
  process.env.ORACLE_PRIVATE_KEY = ANVIL_KEYS[0];
  process.env.USDC_ADDRESS = usdcAddress;
  process.env.FLIGHT_MARKET_ADDRESS = flightMarketAddress;
  log(`deployed MockUSDC=${usdcAddress} FlightMarket=${flightMarketAddress}`);

  // import after env is final so config picks everything up
  const { runIngestion } = await import("./jobs/ingest.js");
  const { runWatcher } = await import("./jobs/watcher.js");
  const { runIndexer } = await import("./indexer.js");
  const { computeLeaderboard } = await import("./leaderboard.js");
  const { db } = await import("./db.js");
  const { ERC20_ABI, FLIGHT_MARKET_ABI } = await import("./abi.js");

  log("ingestion: creating markets for tomorrow's 20 routes (mock, accelerated)");
  const created = await runIngestion();
  // pick a market with enough runway that deposits land before lock
  const now = Math.floor(Date.now() / 1000);
  const candidates = await db.market.findMany({ orderBy: { scheduledDeparture: "asc" } });
  const market = candidates.find((m) => m.scheduledDeparture >= now + 20) ?? candidates.at(-1)!;
  log(`${created} markets created; betting on ${market.flightNumber} ${market.origin}->${market.destination} (${market.id.slice(0, 10)}…)`);

  const provider = new JsonRpcProvider(RPC);
  provider.pollingInterval = 200;
  const alice = new Wallet(ANVIL_KEYS[1], provider);
  const bob = new Wallet(ANVIL_KEYS[2], provider);
  const usdcAs = (w: Wallet) => new Contract(usdcAddress, ERC20_ABI, w);
  const fmAs = (w: Wallet) => new Contract(flightMarketAddress, FLIGHT_MARKET_ABI, w);

  log("alice bets 100 USDC ON_TIME, bob bets 50 USDC LATE");
  await (await usdcAs(alice).approve(flightMarketAddress, parseUnits("100", 6))).wait();
  await (await fmAs(alice).deposit(market.id, 0, parseUnits("100", 6))).wait();
  await (await usdcAs(bob).approve(flightMarketAddress, parseUnits("50", 6))).wait();
  await (await fmAs(bob).deposit(market.id, 1, parseUnits("50", 6))).wait();
  await runIndexer();
  const m1 = await db.market.findUnique({ where: { id: market.id } });
  log(`pools indexed: ON_TIME=${formatUnits(m1!.onTimePool, 6)} LATE=${formatUnits(m1!.latePool, 6)} (implied on-time ${Math.round((100 * Number(m1!.onTimePool)) / (Number(m1!.onTimePool) + Number(m1!.latePool)))}%)`);

  log(`waiting for departure (locks in ~${market.scheduledDeparture - Math.floor(Date.now() / 1000)}s) and landing…`);
  for (let i = 0; i < 40; i++) {
    await sleep(5000);
    // keep anvil's clock moving so resolve's lock check sees wall time
    await provider.send("evm_mine", []);
    await runWatcher();
    const cur = await db.market.findUnique({ where: { id: market.id } });
    if (cur!.status === "RESOLVED") break;
    process.stdout.write(`   t+${(i + 1) * 5}s status=${cur!.status}\r`);
  }
  const resolved = await db.market.findUnique({ where: { id: market.id } });
  if (resolved!.status !== "RESOLVED") throw new Error("market did not resolve in time");
  log(`resolved: ${resolved!.outcome} (touchdown ${resolved!.actualTouchdown! - resolved!.scheduledArrival}s after schedule) tx=${resolved!.resolveTxHash?.slice(0, 18)}…`);

  log("fast-forwarding the 24h dispute window on anvil");
  await provider.send("evm_increaseTime", [24 * 3600 + 60]);
  await provider.send("evm_mine", []);

  const before = await usdcAs(alice).balanceOf(alice.address);
  await (await fmAs(alice).claim(market.id)).wait();
  const after = await usdcAs(alice).balanceOf(alice.address);
  log(`alice claimed ${formatUnits(after - before, 6)} USDC (stake 100 + 50 winnings - 2% fee = 149)`);

  await runIndexer();
  const lb = await computeLeaderboard();
  log("leaderboard (ROI):");
  for (const row of lb) {
    console.log(
      `   ${row.address.slice(0, 10)}…  roi=${row.roiPct.toFixed(1)}%  W/L=${row.wins}/${row.losses}  streak=${row.currentStreak}`,
    );
  }

  log("demo complete ✈");
  anvil.kill();
  await db.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
