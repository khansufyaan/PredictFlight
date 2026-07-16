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

function dayKey(epochSec: number): string {
  return new Date(epochSec * 1000).toDateString();
}

const isTopCarrier = (m: Market) => airlineOf(m.flightNumber).key !== "other";

export default function Home() {
  const router = useRouter();
  const { data: markets, isLoading, error } = useQuery({ queryKey: ["markets"], queryFn: api.markets });
  const [selected, setSelected] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toUpperCase();

  const open = useMemo(
    () => markets?.filter((m) => m.status === "OPEN" && isTopCarrier(m)) ?? [],
    [markets],
  );

  const byAirline = selected
    ? open.filter((m) => airlineOf(m.flightNumber).key === selected)
    : [];

  const days = useMemo(() => {
    const seen = new Map<string, { label: string; count: number }>();
    for (const m of [...byAirline].sort((a, b) => a.scheduledDeparture - b.scheduledDeparture)) {
      const k = dayKey(m.scheduledDeparture);
      const cur = seen.get(k);
      if (cur) cur.count++;
      else seen.set(k, { label: dayLabel(m.scheduledDeparture), count: 1 });
    }
    return [...seen.entries()].map(([key, v]) => ({ key, ...v }));
  }, [byAirline]);

  const searchHits = useMemo(() => {
    if (!q) return [];
    return (markets ?? [])
      .filter((m) => m.flightNumber.toUpperCase().includes(q))
      .sort((a, b) => b.scheduledDeparture - a.scheduledDeparture)
      .slice(0, 5);
  }, [markets, q]);

  const shown = q
    ? open.filter((m) => m.flightNumber.toUpperCase().includes(q))
    : selected && day
      ? byAirline.filter((m) => dayKey(m.scheduledDeparture) === day)
      : [];

  const pickAirline = (key: string) => {
    setSelected(key === selected ? null : key);
    setDay(null);
  };

  const goToExact = () => {
    const exact = (markets ?? []).find((m) => m.flightNumber.toUpperCase() === q) ?? searchHits[0];
    if (exact) router.push(`/market/${exact.id}`);
  };

  return (
    <div className="space-y-7">
      <h1 className="flap text-center text-sm font-bold text-board-amber">
        Late flight? Get paid.
      </h1>

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

      {!q && (
        <section>
          <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">
            1 · Pick your airline
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {AIRLINES.map((a) => {
              const active = selected === a.key;
              return (
                <button
                  key={a.key}
                  onClick={() => pickAirline(a.key)}
                  className={`board-card overflow-hidden !p-1.5 transition-all ${
                    active
                      ? "border-board-amber shadow-[0_0_18px_rgba(251,191,36,0.3)]"
                      : selected
                        ? "opacity-40 hover:opacity-80"
                        : "hover:border-board-amber/50"
                  }`}
                  aria-label={a.name}
                >
                  <AirlineBadge airline={a} size="fill" />
                </button>
              );
            })}
          </div>

          <h2 className="flap mb-3 mt-6 border-b border-board-line pb-1 text-xs text-board-amber">
            2 · Pick your day
          </h2>
          <div className={`grid grid-cols-3 gap-2 ${!selected ? "pointer-events-none opacity-30" : ""}`}>
            {(days.length ? days.slice(0, 3) : [
              { key: "d1", label: "Today", count: 0 },
              { key: "d2", label: "Tomorrow", count: 0 },
              { key: "d3", label: "Day after", count: 0 },
            ]).map((d) => (
              <button
                key={d.key}
                onClick={() => setDay(d.key)}
                disabled={!selected}
                className={`flap rounded-lg border px-2 py-3 text-[11px] font-bold transition-all ${
                  day === d.key
                    ? "border-board-amber bg-board-amber/15 text-board-amber"
                    : "border-board-line bg-board-panel text-board-dim hover:border-board-amber/40"
                }`}
              >
                {d.label}
                {selected && (
                  <span className="mt-0.5 block text-[9px] font-normal normal-case tracking-normal">
                    {d.count} flights
                  </span>
                )}
              </button>
            ))}
          </div>

          {!selected && (
            <p className="mt-4 text-center text-xs text-board-dim">
              ↑ Pick an airline to see its flights.
            </p>
          )}
          {selected && !day && (
            <p className="mt-4 text-center text-xs text-board-dim">↑ Now pick a day.</p>
          )}
        </section>
      )}

      {shown.length > 0 && (
        <section className="space-y-3">
          {[...shown]
            .sort((a, b) => a.scheduledDeparture - b.scheduledDeparture)
            .map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
        </section>
      )}
      {selected && day && shown.length === 0 && !isLoading && error == null && (
        <p className="text-center text-xs text-board-dim">
          No open flights for that day. New departures hit the board twice a day.
        </p>
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
