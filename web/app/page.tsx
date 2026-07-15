"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MarketCard } from "@/components/MarketCard";

export default function Home() {
  const { data: markets, isLoading, error } = useQuery({ queryKey: ["markets"], queryFn: api.markets });

  const open = markets?.filter((m) => m.status === "OPEN") ?? [];
  const locked = markets?.filter((m) => m.status === "LOCKED") ?? [];
  const resolved = markets?.filter((m) => m.status === "RESOLVED").slice(-8).reverse() ?? [];

  return (
    <div className="space-y-8">
      <p className="text-center text-xs text-board-dim">
        Bet USDC on whether flights land <span className="text-board-green">on time</span> or{" "}
        <span className="text-board-red">late</span>. Winners split the losers&apos; pool.
      </p>
      <Section title="Departures — betting open" empty="No open markets. The board refreshes as flights are scheduled.">
        {open.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </Section>
      {locked.length > 0 && (
        <Section title="In the air — locked" empty="">
          {locked.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </Section>
      )}
      {resolved.length > 0 && (
        <Section title="Arrived — resolved" empty="">
          {resolved.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </Section>
      )}
      {isLoading && <div className="text-center text-sm text-board-dim">loading the board…</div>}
      {error != null && (
        <div className="text-center text-sm text-board-red">
          API unreachable — is the oracle running?
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section>
      <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">{title}</h2>
      {children.length > 0 ? (
        <div className="space-y-3">{children}</div>
      ) : (
        empty && <p className="text-xs text-board-dim">{empty}</p>
      )}
    </section>
  );
}
