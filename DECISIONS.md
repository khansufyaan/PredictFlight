# DECISIONS

Decisions made without asking, as instructed. Newest last.

1. **Repo layout**: the repo root _is_ the monorepo (`contracts/`, `oracle/`,
   `web/`) rather than a nested `flightpool/` directory.

2. **No forge-std / OpenZeppelin**: this build environment has GitHub egress
   scoped to this repo only, so submodule installs fail. The contract is
   dependency-free (own reentrancy guard + safe-transfer helpers); tests use a
   ~40-line vendored cheatcode interface (`test/utils/FTest.sol`). Modern forge
   treats any revert in a test as a failure, so DSTest-style asserts aren't
   needed.

3. **marketId = keccak256(abi.encode(flightId, scheduledDeparture))** — stable,
   collision-free per flight instance, computable off-chain before creation.
   `flightId` (bytes32) is `keccak256(flightKey)` where `flightKey` is
   `"UA415|SFO|LAX|2026-07-20|<depEpoch>"`.

4. **Fee applies to winnings only** (the pro-rata share of the losing pool),
   not to the returned stake. Zero-opposite-pool claims return stake exactly,
   no fee — per spec.

5. **Overturn restarts the 24h dispute window.** Otherwise an overturn at hour
   23:59 gives the new outcome a 1-minute dispute window, which defeats the
   point of having one.

6. **Orphaned losing pool**: if a market resolves with a non-empty losing pool
   but an empty winning pool, those funds are unclaimable by anyone. Added
   `absorbOrphanedPool()` (owner-only, post-window) folding them into protocol
   fees instead of bricking them in the contract.

7. **Cancelled-before-departure flights** still resolve VOID only *after*
   scheduled departure, because `resolve()` requires the market to be locked
   (spec's resolve-before-lock guard). Depositors on a known-cancelled flight
   can stop depositing; refunds arrive after departure time + dispute window.

8. **Rounding dust** (integer division in payouts/fees) stays in the contract
   permanently. Bounded by ~1 unit (1e-6 USDC) per claimant per market; not
   worth extra bookkeeping.

9. **Interval scheduler instead of a cron library** — three fixed-period jobs
   (ingest 6h, watcher 2min, indexer 15s) with overlap protection; configurable
   via `*_INTERVAL_MS` env vars, which is also how the demo accelerates time.

10. **Poll-based event indexer** (`eth_getLogs` from a checkpoint) rather than
    websocket subscriptions — works with any plain HTTPS RPC, survives
    restarts, and is idempotent via a `(txHash, logIndex)` unique key.

11. **Leaderboard ROI counts unclaimed winnings** — computed from indexed
    deposits + outcomes using the parimutuel formula rather than `Claimed`
    events, so a winner appears on the board during the dispute window, before
    claiming. VOID markets are excluded from ROI/streaks.

12. **Challenge acceptance is API-verified, not indexer-inferred**: a matchup
    forms only when the taker calls `POST /challenge/:code/accept` (the
    challenge page does this after their deposit confirms) and the API verifies
    an indexed opposite-side deposit from that address. A random opposite-side
    bettor never gets tagged into someone's head-to-head.

13. **One flight per route per day** from the AeroAPI schedules endpoint keeps
    market volume at ~20/day and AeroAPI usage inside the personal tier.

14. **MockProvider realism**: accelerated wall-clock (flights depart ~45s after
    listing, fly ~30s) but *reported* touchdown delays are in real minutes, so
    the ≤15-minute rule is exercised exactly as in production. Outcome mix per
    flight key is deterministic: ~62% on-time / 28% late / 6% cancelled /
    4% diverted.

15. **Foundry from npm** (`@foundry-rs/forge` 1.7.1) since GitHub releases were
    unreachable from this environment. Any Foundry ≥1.0 works.

16. **Mainnet ask**: everything is network-agnostic (USDC/RPC are config), and
    Base mainnet deploy scripts + docs are included, but I did not (cannot, and
    would not silently) deploy with real funds: that requires the owner's funded
    key, and running a real-money betting market carries regulatory/licensing
    risk plus single-owner trust assumptions (oracle key can resolve, owner key
    can overturn). README documents the exact mainnet steps and the safer
    Sepolia rehearsal.

17. **Vercel**: only `web/` deploys to Vercel. The oracle is a long-running
    stateful process (cron jobs + SQLite + event indexer) and does not fit
    Vercel's serverless model — it needs a VM/container host (Railway, Fly,
    Render, a VPS).
