const sections: { h: string; p: string[] }[] = [
  {
    h: "1. What Jetlag is",
    p: [
      "Jetlag (jetlag.fun) is a peer-to-peer prediction platform where users stake USDC, a digital stablecoin, on whether a scheduled commercial flight will arrive on time. Positions on each side of a flight are pooled together; when the flight's outcome is determined, the pool of the losing side is distributed proportionally among the winning side, less a platform fee applied to winnings only.",
      "Jetlag is not an airline, travel agency, insurer, broker, bank, or money transmitter. Jetlag never takes the other side of your position — every market is user versus user.",
    ],
  },
  {
    h: "2. Eligibility",
    p: [
      "You must be at least 18 years old (or the age of majority where you live, if higher) and legally permitted to use this service in your jurisdiction. Prediction markets, skill gaming, and digital-asset products are restricted or prohibited in some places. It is solely your responsibility to determine whether your use of Jetlag is lawful where you are. Do not use Jetlag if it is not.",
      "You may not use Jetlag if you are subject to sanctions or located in a sanctioned jurisdiction.",
    ],
  },
  {
    h: "3. How outcomes are decided",
    p: [
      "A flight counts as ON TIME if it arrives at the gate no later than 15 minutes after its published scheduled arrival time. Otherwise it counts as LATE. If a flight is cancelled or its data cannot be reliably determined, the market is voided and all stakes are returned in full.",
      "Arrival times are sourced from professional flight-status data. After an outcome is posted there is a 24-hour review window before winnings can be claimed, during which an incorrect result can be corrected. Posted outcomes after the review window are final.",
    ],
  },
  {
    h: "4. Fees",
    p: [
      "A 2% fee is applied to winnings only — never to your original stake and never to refunds from voided markets. Network transaction costs (gas) are separate and are not charged by or paid to Jetlag.",
    ],
  },
  {
    h: "5. Your wallet and funds",
    p: [
      "Positions are held in smart contracts on a public blockchain; Jetlag does not take custody of your funds. Winnings and refunds must be claimed by you and are sent directly to your connected wallet. You are responsible for safeguarding access to your wallet and account. Transactions on a blockchain are irreversible — double-check every action before confirming it.",
    ],
  },
  {
    h: "6. Risks",
    p: [
      "You can lose your entire stake. Digital assets are volatile and the regulatory treatment of prediction markets is evolving. Smart contracts, blockchains, wallets, and data feeds can contain bugs, suffer outages, or behave unexpectedly. Flight schedules change. You accept all of these risks by using Jetlag.",
      "Nothing on this site is financial, legal, or tax advice. Never stake more than you can afford to lose.",
    ],
  },
  {
    h: "7. Fair use",
    p: [
      "You agree not to interfere with the platform's operation, exploit bugs, manipulate flight data or outcomes, use the service for money laundering or any unlawful purpose, or access it with automated systems in a way that degrades service for others. We may restrict or suspend access to the website interface for violations. Voided or manipulated markets may be refunded rather than paid out.",
    ],
  },
  {
    h: "8. Availability and changes",
    p: [
      "The service is provided “as is” and “as available” without warranties of any kind, express or implied. We may modify, pause, or discontinue any part of the website at any time. We may update these terms; continued use after an update constitutes acceptance. Material changes will be reflected by the date at the top of this page.",
    ],
  },
  {
    h: "9. Limitation of liability",
    p: [
      "To the maximum extent permitted by law, Jetlag and its operators are not liable for any indirect, incidental, special, consequential, or exemplary damages, or for lost profits or lost funds arising from your use of the service, including losses caused by data errors, network failures, third-party services, or your own transactions. Our aggregate liability for any claim is limited to the total fees you paid to Jetlag in the 12 months preceding the claim.",
    ],
  },
  {
    h: "10. Contact",
    p: [
      "Questions about these terms can be sent to hello@jetlag.fun.",
    ],
  },
];

export const metadata = { title: "Terms & Conditions — Jetlag" };

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flap text-2xl font-extrabold tracking-widest text-board-amber">
          TERMS &amp; CONDITIONS
        </h1>
        <p className="mt-1 text-xs text-board-dim">Last updated: July 15, 2026</p>
      </div>
      <p className="text-sm leading-relaxed text-board-dim">
        By accessing jetlag.fun or placing a position, you agree to these terms. If you do not
        agree, do not use the service.
      </p>
      {sections.map((s) => (
        <section key={s.h} className="board-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-board-amber">{s.h}</h2>
          {s.p.map((para, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-board-dim">
              {para}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
