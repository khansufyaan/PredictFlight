"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api, type Market } from "@/lib/api";
import { AIRLINES, airlineOf, OTHER_AIRLINE } from "@/lib/airlines";
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

export default function Home() {
  const { data: markets, isLoading, error } = useQuery({ queryKey: ["markets"], queryFn: api.markets });
  const [selected, setSelected] = useState<string | null>(null);

  const open = useMemo(() => markets?.filter((m) => m.status === "OPEN") ?? [], [markets]);
  const locked = markets?.filter((m) => m.status === "LOCKED") ?? [];

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of open) {
      const k = airlineOf(m.flightNumber).key;
      c.set(k, (c.get(k) ?? 0) + 1);
    }
    return c;
  }, [open]);

  const shown = selected ? open.filter((m) => airlineOf(m.flightNumber).key === selected) : open;
  const byDay = useMemo(() => {
    const g = new Map<string, Market[]>();
    for (const m of [...shown].sort((a, b) => a.scheduledDeparture - b.scheduledDeparture)) {
      const label = dayLabel(m.scheduledDeparture);
      g.set(label, [...(g.get(label) ?? []), m]);
    }
    return g;
  }, [shown]);

  const airlineChoices = [...AIRLINES, OTHER_AIRLINE].filter(
    (a) => a.key !== "other" || (counts.get("other") ?? 0) > 0,
  );

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="flap text-sm font-bold text-board-amber">
          Call the landing. Win back your airfare.
        </h1>
        <p className="mt-1 text-xs text-board-dim">
          Bet USDC on whether flights land <span className="text-board-green">on time</span> or{" "}
          <span className="text-board-red">late</span> — winners split the losers&apos; pool.
        </p>
      </div>

      <section>
        <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">
          Pick your airline
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <button
            onClick={() => setSelected(null)}
            className={`board-card flex flex-col items-center gap-1.5 p-3 transition-all ${
              selected === null ? "border-board-amber/70 shadow-[0_0_14px_rgba(251,191,36,0.15)]" : "hover:border-board-amber/40"
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-board-line text-base font-bold">
              ✈
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider">All</span>
            <span className="text-[9px] text-board-dim">{open.length} open</span>
          </button>
          {airlineChoices.map((a) => {
            const n = counts.get(a.key) ?? 0;
            return (
              <button
                key={a.key}
                onClick={() => setSelected(a.key)}
                disabled={n === 0}
                className={`board-card flex flex-col items-center gap-1.5 p-3 transition-all disabled:opacity-35 ${
                  selected === a.key ? "border-board-amber/70 shadow-[0_0_14px_rgba(251,191,36,0.15)]" : "hover:border-board-amber/40"
                }`}
              >
                <AirlineBadge airline={a} size="lg" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{a.name}</span>
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
          No open flights{selected ? " for this airline" : ""} right now. New departures board every
          few hours.
        </p>
      )}

      {locked.length > 0 && (
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
