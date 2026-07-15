"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { hhmm, dateShort, shortAddr } from "@/lib/format";
import { DepositForm } from "@/components/DepositForm";
import { OddsBar } from "@/components/OddsBar";

export default function ChallengePage() {
  const { code } = useParams<{ code: string }>();
  const { data: ch, error } = useQuery({
    queryKey: ["challenge", code],
    queryFn: () => api.challenge(code),
  });

  if (error != null) return <p className="text-sm text-board-red">Challenge not found.</p>;
  if (!ch) return <p className="text-sm text-board-dim">loading…</p>;

  const m = ch.market;
  const takerSide = ch.oppositeSide === "ON_TIME" ? 0 : (1 as const);

  return (
    <div className="space-y-4">
      <div className="board-card p-4 text-center">
        <div className="flap text-xs text-board-dim">You&apos;ve been challenged</div>
        <div className="flap mt-2 text-2xl font-bold text-board-amber">{m.flightNumber}</div>
        <div className="flap text-sm">
          {m.origin} → {m.destination} · {dateShort(m.scheduledDeparture)} {hhmm(m.scheduledDeparture)}
        </div>
        <p className="mt-3 text-sm">
          <span className="text-board-amber">{shortAddr(ch.creator)}</span> bet this flight lands{" "}
          <b className={ch.side === "ON_TIME" ? "text-board-green" : "text-board-red"}>
            {ch.side.replace("_", " ")}
          </b>
          .
        </p>
        <p className="text-sm text-board-dim">
          Take the other side —{" "}
          <b className={ch.oppositeSide === "ON_TIME" ? "text-board-green" : "text-board-red"}>
            {ch.oppositeSide.replace("_", " ")}
          </b>{" "}
          — to make it a head-to-head.
        </p>
        <div className="mt-3">
          <OddsBar onTimeProb={m.impliedOnTimeProb} />
        </div>
      </div>

      {ch.acceptor ? (
        <div className="board-card p-4 text-center text-sm text-board-dim">
          Already accepted by {shortAddr(ch.acceptor)}.{" "}
          <Link className="text-board-amber underline" href={`/market/${m.id}`}>
            View the market →
          </Link>
        </div>
      ) : m.status !== "OPEN" ? (
        <div className="board-card p-4 text-center text-sm text-board-dim">
          This market is already {m.status.toLowerCase()} — too late to take the bet.
        </div>
      ) : (
        <DepositForm marketId={m.id} deadline={m.scheduledArrival + 900} defaultSide={takerSide} lockSide challengeCode={ch.code} />
      )}

      <div className="text-center">
        <Link className="text-xs text-board-dim underline" href={`/market/${m.id}`}>
          full market page
        </Link>
      </div>
    </div>
  );
}
