"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, type Market } from "@/lib/api";
import { airlineOf } from "@/lib/airlines";
import { AirlineBadge } from "@/components/AirlineBadge";
import { Countdown } from "@/components/Countdown";
import { LiveFeed } from "@/components/LiveFeed";
import { CAMS } from "@/lib/liveFeeds";
import { hhmm, usdc } from "@/lib/format";

/* The pump.fun lesson: the stream and the market belong on the same screen.
 * Each cam airport shows what's landing there right now (in-air markets,
 * biggest pools first) and what's about to leave (one tap to predict). */

const pool = (m: Market) => BigInt(m.onTimePool) + BigInt(m.latePool);

function FlightRow({ m, mode }: { m: Market; mode: "landing" | "departing" }) {
  const airline = airlineOf(m.flightNumber);
  return (
    <Link
      href={`/market/${m.id}`}
      className="flex items-center gap-2.5 rounded-lg border border-board-line bg-board-bg/60 px-3 py-2 transition-colors hover:border-board-amber/60"
    >
      <AirlineBadge airline={airline} />
      <span className="flap text-sm font-bold text-board-amber">{m.flightNumber}</span>
      <span className="flap flex-1 text-xs text-board-dim">
        {m.origin} → {m.destination}
      </span>
      {pool(m) > 0n && (
        <span className="text-xs text-board-dim">${usdc(m.onTimePool)} / ${usdc(m.latePool)}</span>
      )}
      {mode === "landing" ? (
        <span className="text-xs text-board-green">
          lands <Countdown to={m.scheduledArrival} doneLabel="now" />
        </span>
      ) : (
        <span className="text-xs text-board-sky">
          departs {hhmm(m.scheduledDeparture)} · predict →
        </span>
      )}
    </Link>
  );
}

export default function LivePage() {
  const { data: markets } = useQuery({ queryKey: ["markets"], queryFn: api.markets });
  const all = markets ?? [];
  const inAir = all
    .filter((m) => m.status === "LOCKED")
    .sort((a, b) => a.scheduledArrival - b.scheduledArrival);
  const open = all
    .filter((m) => m.status === "OPEN")
    .sort((a, b) => a.scheduledDeparture - b.scheduledDeparture);

  const camAirports = Object.keys(CAMS)
    .map((code) => {
      const landing = inAir.filter((m) => m.destination === code);
      const departing = open.filter((m) => m.origin === code).slice(0, 3);
      const money = landing.reduce((s, m) => s + pool(m), 0n);
      return { code, landing, departing, money };
    })
    .sort((a, b) => (b.money > a.money ? 1 : b.money < a.money ? -1 : b.landing.length - a.landing.length));

  const elsewhere = inAir.filter((m) => !CAMS[m.destination]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="flap text-2xl font-extrabold text-board-amber">Live</h1>

      {camAirports.map(({ code, landing, departing }) => (
        <section key={code} className="board-card space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <span className="flap text-xl font-extrabold text-white">{code}</span>
            {landing.length > 0 && (
              <span className="text-xs text-board-green">
                {landing.length} flight{landing.length > 1 ? "s" : ""} inbound with live markets
              </span>
            )}
          </div>
          <LiveFeed airport={code} />
          {landing.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-widest text-board-dim">Landing here</div>
              {landing.map((m) => (
                <FlightRow key={m.id} m={m} mode="landing" />
              ))}
            </div>
          )}
          {departing.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-widest text-board-dim">Departing soon</div>
              {departing.map((m) => (
                <FlightRow key={m.id} m={m} mode="departing" />
              ))}
            </div>
          )}
        </section>
      ))}

      {elsewhere.length > 0 && (
        <section className="space-y-2">
          <h2 className="flap border-b border-board-line pb-1 text-xs text-board-amber">
            Also in the air right now
          </h2>
          {elsewhere.map((m) => (
            <FlightRow key={m.id} m={m} mode="landing" />
          ))}
        </section>
      )}

      {markets && inAir.length === 0 && (
        <p className="text-center text-xs text-board-dim">
          Nothing in the air with an open pool right now — the cams run 24/7 anyway. Next
          departures are on the <Link href="/" className="text-board-sky underline">board</Link>.
        </p>
      )}
    </div>
  );
}
