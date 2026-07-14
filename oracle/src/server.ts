import { buildApi } from "./api.js";
import { config } from "./config.js";
import { runIndexer } from "./indexer.js";
import { runIngestion } from "./jobs/ingest.js";
import { runWatcher } from "./jobs/watcher.js";

/** Simple interval scheduler with overlap protection — cron granularity is
 *  overkill for three fixed-period jobs and keeps dependencies down. */
function every(label: string, ms: number, fn: () => Promise<unknown>): NodeJS.Timeout {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (err) {
      console.error(`[${label}]`, err);
    } finally {
      running = false;
    }
  };
  void tick();
  return setInterval(tick, ms);
}

async function main() {
  const app = await buildApi();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[api] listening on :${config.port} (provider=${config.provider})`);

  every("indexer", config.indexerIntervalMs, runIndexer);
  every("watcher", config.watcherIntervalMs, runWatcher);
  every("ingest", config.ingestIntervalMs, runIngestion);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
