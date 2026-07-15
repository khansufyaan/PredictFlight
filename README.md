# FlightPool ✈

PvP parimutuel prediction markets on flight punctuality, settled in USDC on
Base. Bet ON TIME or LATE before departure; after the flight lands, winners
split the losing pool pro-rata minus a 2% fee.

```
contracts/   Foundry — FlightMarket.sol (registry of parimutuel markets)
oracle/      Node 20 + Fastify + Prisma/SQLite + ethers v6 — flight data,
             market creation, arrival watching, on-chain settlement, REST API
web/         Next.js 14 + Tailwind + wagmi/viem + RainbowKit — the app
```

## How it works

- One market per scheduled flight. Binary outcome: **ON_TIME** (touchdown ≤
  scheduled arrival + 15 min) or **LATE** (everything else, incl. diversions).
  Cancellations **VOID** the market and refund everyone in full.
- Deposits open until scheduled departure (lock). Implied odds = pool ratio.
- The oracle resolves on-chain after landing; a **24h dispute window** follows
  (owner can overturn during it — overturning restarts the window). Claims are
  pull-based after the window.
- Off-chain PvP: ROI/streak leaderboard and shareable challenge links that
  form head-to-head matchups when a friend takes the opposite side.

## Prerequisites

- Node 20+, npm
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`, or
  `npm i -g @foundry-rs/forge @foundry-rs/anvil @foundry-rs/cast`)

## 1. Contracts

```bash
cd contracts
forge test -vv        # 17 tests, no external deps
```

## 2. Three-minute demo (no keys, no network)

Runs the full lifecycle — create markets, bet both sides, lock, "fly",
resolve, fast-forward the dispute window, claim, leaderboard — against a
throwaway anvil with deterministic mock flight data:

```bash
cd contracts && forge build      # demo deploys from forge artifacts
cd ../oracle && npm install && npm run db:generate
npm run demo
```

## 3. Full local stack (wallet-in-browser e2e)

```bash
# terminal 1 — local chain
anvil

# terminal 2 — deploy MockUSDC + FlightMarket, write .env files, start oracle
cd contracts && forge build
cd ../oracle && npm install && npm run db:generate
npm run deploy:local             # writes oracle/.env and web/.env.local
npm run db:push && npm start     # API on :4000, jobs running

# terminal 3 — web
cd web && npm install && npm run dev   # http://localhost:3000
```

Then in the browser: add the anvil network (chain id 31337, RPC
`http://127.0.0.1:8545`) to MetaMask, import two anvil accounts (each is
pre-minted 10,000 mock USDC by `deploy:local`), bet opposite sides of a
market, watch it lock/resolve (mock flights fly in ~1 minute), fast-forward
the dispute window (`cast rpc evm_increaseTime 86460 && cast rpc evm_mine`),
claim, and check `/leaderboard`.

## 4. Testnet deploy (Base Sepolia) — rehearse here first

You need: a funded deployer key (Base Sepolia ETH from a faucet), an RPC URL,
and an oracle address (can be the same key for testing).

```bash
cd contracts
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
ORACLE_ADDRESS=<oracle signer address> \
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org \
  --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Then configure and start the oracle (one command once `.env` is filled):

```bash
cd oracle && cp .env.example .env   # fill in the values, FLIGHT_PROVIDER=aeroapi
npm run db:push && npm start
```

And the web app: copy `web/.env.example` to `web/.env.local` with
`NEXT_PUBLIC_CHAIN_ID=84532`, the deployed address, and your API URL.

## 5. Mainnet deploy (Base) — real money, read this first

⚠️ This MVP has **single-key trust assumptions** (the oracle key resolves
outcomes; the owner key can overturn any resolution within 24h and sweep
fees) and has **not been audited**. Operating a real-money betting market may
require gambling/derivatives licensing in your jurisdiction. Get legal review
and an audit before inviting real users.

Identical to testnet except the constants:

```bash
cd contracts
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
ORACLE_ADDRESS=<oracle signer address> \
forge script script/Deploy.s.sol --rpc-url https://mainnet.base.org \
  --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Oracle `.env`: `RPC_URL=https://mainnet.base.org`, mainnet USDC address, the
deployed `FLIGHT_MARKET_ADDRESS`, `FLIGHT_PROVIDER=aeroapi`, a real
`AEROAPI_KEY`, a strong `ADMIN_SECRET`, and the oracle key funded with a few
dollars of Base ETH for resolve gas. Host it on a VM/container platform
(Railway/Fly/Render) — it's a long-running process with a SQLite file, not a
serverless function. Web `.env`: `NEXT_PUBLIC_CHAIN_ID=8453` + mainnet
addresses; deploys cleanly to Vercel (root directory `web/`).

## Env vars

| Var | Where | Meaning |
| --- | --- | --- |
| `RPC_URL` | oracle | chain RPC (Base mainnet/Sepolia/anvil) |
| `ORACLE_PRIVATE_KEY` | oracle | signs `createMarket`/`resolve` txs |
| `USDC_ADDRESS` | oracle, contracts | USDC token (constructor param) |
| `FLIGHT_MARKET_ADDRESS` | oracle | deployed FlightMarket |
| `ADMIN_SECRET` | oracle | gates `POST /admin/resolve` |
| `DATABASE_URL` | oracle | SQLite, e.g. `file:./dev.db` (relative to `prisma/`) |
| `FLIGHT_PROVIDER` | oracle | `mock` or `aeroapi` |
| `AEROAPI_KEY` | oracle | FlightAware AeroAPI key |
| `NEXT_PUBLIC_API_URL` | web | oracle REST base URL |
| `NEXT_PUBLIC_CHAIN_ID` | web | 8453 / 84532 / 31337 |
| `NEXT_PUBLIC_RPC_URL` | web | RPC for wallet reads |
| `NEXT_PUBLIC_USDC_ADDRESS` | web | USDC token |
| `NEXT_PUBLIC_FLIGHT_MARKET_ADDRESS` | web | deployed FlightMarket |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | web | from cloud.walletconnect.com |

## REST API

- `GET /markets` (`?status=open|locked|resolved`) — pools + implied odds
- `GET /markets/:id` — detail, odds history snapshots, matchups
- `GET /markets/:id/positions/:address` — indexed position
- `GET /leaderboard` — ROI + win streaks from indexed events
- `POST /challenge` `{marketId, side, creator}` → shareable code
- `GET /challenge/:code` / `POST /challenge/:code/accept` `{address}`
- `POST /admin/resolve` `{marketId, outcome, actualTouchdown}` (header `x-admin-secret`) — for flights flagged `needsReview`

Design decisions and their rationale live in [DECISIONS.md](DECISIONS.md).

## Live deployment (Base mainnet)

- **FlightMarket**: [`0x42fc886ea8cab2934981107606a610e18c9a3e56`](https://basescan.org/address/0x42fc886ea8cab2934981107606a610e18c9a3e56)
- **Oracle/owner signer**: `0x414b6C1e7797D3b4Ccb671b9F4B735dc861629e0`
- **Oracle API**: https://oracle-production-ee93.up.railway.app (Railway, AeroAPI provider)
- **Web**: https://predict-flight.vercel.app
