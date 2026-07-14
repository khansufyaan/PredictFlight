import {
  AbiCoder,
  Contract,
  JsonRpcProvider,
  Wallet,
  id as keccakId,
  keccak256,
} from "ethers";
import { FLIGHT_MARKET_ABI } from "./abi.js";
import { config } from "./config.js";

let _provider: JsonRpcProvider | undefined;
let _wallet: Wallet | undefined;
let _contract: Contract | undefined;

export function provider(): JsonRpcProvider {
  if (!_provider) {
    _provider = new JsonRpcProvider(config.rpcUrl);
    // ethers defaults to 4s receipt polling; local nodes mine instantly
    if (/127\.0\.0\.1|localhost/.test(config.rpcUrl)) _provider.pollingInterval = 200;
  }
  return _provider;
}

export function oracleWallet(): Wallet {
  _wallet ??= new Wallet(config.oraclePrivateKey(), provider());
  return _wallet;
}

export function flightMarket(): Contract {
  _contract ??= new Contract(config.flightMarketAddress(), FLIGHT_MARKET_ABI, oracleWallet());
  return _contract;
}

/** bytes32 flight id = keccak256(utf8(flightKey)) — mirrors nothing on-chain,
 *  the contract treats it as an opaque identifier. */
export function flightIdBytes32(flightKey: string): string {
  return keccakId(flightKey);
}

/** Mirrors FlightMarket.computeMarketId (keccak256(abi.encode(bytes32,uint64))). */
export function computeMarketId(flightKey: string, scheduledDeparture: number): string {
  return keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint64"],
      [flightIdBytes32(flightKey), scheduledDeparture],
    ),
  );
}

export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // contract reverts are deterministic — retrying only wastes time
      if ((err as { code?: string })?.code === "CALL_EXCEPTION") throw err;
      const backoff = 2000 * 2 ** i;
      console.warn(`[chain] ${label} attempt ${i + 1}/${attempts} failed, retrying in ${backoff}ms`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}
