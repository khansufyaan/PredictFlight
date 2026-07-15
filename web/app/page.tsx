"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, type Market } from "@/lib/api";
import { AIRLINES, airlineOf } from "@/lib/airlines";
import { AirlineBadge } from "@/components/AirlineBadge";
import { MarketCard } from "@/components/MarketCard";

function dayLabel(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const isTopCarrier = (m: Market) => airlineOf(m.flightNumber).key !== "other";

export default function Home() {
  const router = useRouter();
  const { data: markets, isLoading, error } = useQuery({ queryKey: ["markets"], queryFn: api.markets });
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toUpperCase();

  const open = useMemo(
    () => markets?.filter((m) => m.status === "OPEN" && isTopCarrier(m)) ?? [],
    [markets],
  );
  const locked = markets?.filter((m) => m.status === "LOCKED" && isTopCarrier(m)) ?? [];

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of open) {
      const k = airlineOf(m.flightNumber).key;
      c.set(k, (c.get(k) ?? 0) + 1);
    }
    return c;
  }, [open]);

  // flight-number search across every market, any status
  const searchHits = useMemo(() => {
    if (!q) return [];
    return (markets ?? [])
      .filter((m) => m.flightNumber.toUpperCase().includes(q))
      .sort((a, b) => b.scheduledDeparture - a.scheduledDeparture)
      .slice(0, 5);
  }, [markets, q]);

  const shown = open
    .filter((m) => !selected || airlineOf(m.flightNumber).key === selected)
    .filter((m) => !q || m.flightNumber.toUpperCase().includes(q));

  const byDay = useMemo(() => {
    const g = new Map<string, Market[]>();
    for (const m of [...shown].sort((a, b) => a.scheduledDeparture - b.scheduledDeparture)) {
      const label = dayLabel(m.scheduledDeparture);
      g.set(label, [...(g.get(label) ?? []), m]);
    }
    return g;
  }, [shown]);

  const goToExact = () => {
    const exact =
      (markets ?? []).find((m) => m.flightNumber.toUpperCase() === q) ?? searchHits[0];
    if (exact) router.push(`/market/${exact.id}`);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="flap text-sm font-bold text-board-amber">
          Predict the landing. Win back your fare.
        </h1>
        <p className="mt-1 text-xs text-board-dim">
          Bet USDC on whether flights land <span className="text-board-green">on time</span> or{" "}
          <span className="text-board-red">late</span> — winners split the losers&apos; pool.
        </p>
      </div>

      <div>
        <div className="board-card flex items-center gap-2 px-3 py-2">
          <span className="text-board-dim">✈</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToExact()}
            placeholder="Search your flight number — e.g. UA415"
            className="w-full bg-transparent text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:text-board-dim focus:outline-none"
          />
          {q && (
            <button onClick={() => setQuery("")} className="text-xs text-board-dim hover:text-board-amber">
              ✕
            </button>
          )}
        </div>
        {q && searchHits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {searchHits.map((m) => (
              <Link
                key={m.id}
                href={`/market/${m.id}`}
                className="board-card flex items-center gap-2 px-2.5 py-1.5 text-xs hover:border-board-amber/60"
              >
                <AirlineBadge airline={airlineOf(m.flightNumber)} />
                <span className="flap font-bold text-board-amber">{m.flightNumber}</span>
                <span className="text-board-dim">
                  {m.origin}→{m.destination} · {m.status.toLowerCase()}
                </span>
              </Link>
            ))}
          </div>
        )}
        {q && searchHits.length === 0 && (
          <p className="mt-2 text-center text-[11px] text-board-dim">
            No market for &ldquo;{q}&rdquo; yet — markets open up to 3 days before departure.
          </p>
        )}
      </div>

      <section>
        <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">
          Pick your airline
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {AIRLINES.map((a) => {
            const n = counts.get(a.key) ?? 0;
            const active = selected === a.key;
            return (
              <button
                key={a.key}
                onClick={() => setSelected(active ? null : a.key)}
                disabled={n === 0}
                className={`board-card flex flex-col items-center gap-1.5 p-2.5 transition-all disabled:opacity-35 ${
                  active
                    ? "border-board-amber/70 shadow-[0_0_14px_rgba(251,191,36,0.15)]"
                    : "hover:border-board-amber/40"
                }`}
              >
                <AirlineBadge airline={a} size="lg" />
                <span className="text-[9px] font-bold uppercase tracking-wider">{a.name}</span>
                <span className="text-[9px] text-board-dim">{n} open</span>
              </button>
            );
          })}
        </div>
      </section>

      {[...byDay.entries()].map(([label, list]) => (
        <section key={label}>
          <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">
            {label} — betting open
          </h2>
          <div className="space-y-3">
            {list.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        </section>
      ))}
      {shown.length === 0 && !isLoading && error == null && (
        <p className="text-center text-xs text-board-dim">
          No open flights match. New departures hit the board twice a day.
        </p>
      )}

      {locked.length > 0 && !q && (
        <section>
          <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">
            In the air — locked
          </h2>
          <div className="space-y-3">
            {locked.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        </section>
      )}

      <div className="text-center">
        <Link href="/past" className="text-xs text-board-sky underline underline-offset-4">
          Landed flights &amp; verified results →
        </Link>
      </div>

      {isLoading && <div className="text-center text-sm text-board-dim">loading the board…</div>}
      {error != null && (
        <div className="text-center text-sm text-board-red">
          API unreachable — is the oracle running?
        </div>
      )}
    </div>
  );
}
