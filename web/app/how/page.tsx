import Link from "next/link";

export const metadata = {
  title: "How it works",
  description:
    "How Jetlag works: pick a real flight, predict on-time or late with USDC, winners split the losers' pool. 2% fee on winnings only, verified results.",
  alternates: { canonical: "/how" },
};

/** Plain-text mirror of the FAQ for search engines (FAQPage rich results). */
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      q: "What is Jetlag?",
      a: "A game where you predict whether a real flight lands on time or late. Everyone's predictions go into two pools — ON TIME and LATE. When the flight lands, the winning side splits the losing side's money.",
    },
    {
      q: "What counts as on time?",
      a: "Wheels touching the runway within 15 minutes of the scheduled arrival. Anything later — including diversions — counts as LATE.",
    },
    {
      q: "What if the flight is cancelled?",
      a: "The market is voided and everyone gets a full refund. No fee, no winners, no losers.",
    },
    {
      q: "What's the fee?",
      a: "2% of winnings only. Your own stake is never charged and refunds are free.",
    },
    {
      q: "How do I know results are fair?",
      a: "Every result comes from live flight data and every settlement is a public transaction on Base, so any outcome can be independently verified.",
    },
  ].map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is Jetlag?",
    a: "A game where you predict whether a real flight lands on time or late. Everyone's predictions go into two pools — ON TIME and LATE. When the flight lands, the winning side splits the losing side's money.",
  },
  {
    q: "How do I make a prediction?",
    a: "Pick a flight, choose ON TIME or LATE, enter an amount of USDC, and confirm in your wallet (two taps: approve, then deposit). Predictions close the moment the flight is scheduled to depart.",
  },
  {
    q: "What counts as \"on time\"?",
    a: "Wheels touching the runway within 15 minutes of the scheduled arrival. Anything later — including diversions to another airport — counts as LATE.",
  },
  {
    q: "How much can I win?",
    a: "Your share of the losing pool, proportional to your stake. Example: you put $50 on LATE, the LATE pool is $100, the ON TIME pool is $200. The flight is late — you get your $50 back plus $98 (half of the $200, minus the 2% fee).",
  },
  {
    q: "What if the flight is cancelled?",
    a: "The market is voided and everyone gets a full refund. No fee, no winners, no losers.",
  },
  {
    q: "When do I get paid?",
    a: "Results settle on-chain right after landing, then there's a 24-hour review window before claims open. After that, hit Claim on the flight's page — the USDC goes straight to your wallet.",
  },
  {
    q: "How do I know results are fair?",
    a: (
      <>
        Every result comes from FlightAware's live flight data, and every settlement is a public
        transaction on Base. The{" "}
        <Link href="/past" className="text-board-sky underline">
          Landed tab
        </Link>{" "}
        links both for every flight, so you can verify any outcome yourself.
      </>
    ),
  },
  {
    q: "What do I need to play?",
    a: "A crypto wallet (like MetaMask or Coinbase Wallet) with USDC on the Base network, plus a little ETH on Base for transaction fees (a few cents).",
  },
  {
    q: "What's the fee?",
    a: "2% of winnings only. Your own stake is never charged, refunds are free, and if nobody predicted against you, you simply get your money back.",
  },
  {
    q: "Can I challenge a friend?",
    a: "Yes — on any open flight, create a challenge link and send it. If your friend takes the other side, you're matched head-to-head on the flight page. Loser buys the drinks too, presumably.",
  },
];

export default function HowPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <h1 className="flap mb-1 text-sm font-bold text-board-amber">How it works</h1>
      <p className="mb-5 text-xs text-board-dim">
        Late flight? Get paid. Here&apos;s everything in plain words.
      </p>
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <div key={i} className="board-card p-4">
            <h2 className="mb-1.5 text-sm font-bold text-board-amber">{f.q}</h2>
            <p className="text-xs leading-relaxed text-gray-300">{f.a}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-[10px] text-board-dim">
        Only stake what you can afford to lose. Flights are unpredictable — that&apos;s the point.
      </p>
    </div>
  );
}
