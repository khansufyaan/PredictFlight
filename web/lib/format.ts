export function usdc(raw: string | bigint, digits = 0): string {
  const n = Number(raw) / 1e6;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function hhmm(epochSec: number): string {
  return new Date(epochSec * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function dateShort(epochSec: number): string {
  return new Date(epochSec * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
