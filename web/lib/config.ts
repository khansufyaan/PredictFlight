export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const FLIGHT_MARKET_ADDRESS = (process.env.NEXT_PUBLIC_FLIGHT_MARKET_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "flightpool-dev";
