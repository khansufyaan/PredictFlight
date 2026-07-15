const sections: { h: string; p: string[] }[] = [
  {
    h: "1. What we collect",
    p: [
      "Wallet addresses and on-chain activity. When you connect a wallet or place a position, your public wallet address and your transactions are recorded on a public blockchain. That data is public by design and outside our control once written.",
      "Sign-in details. If you sign in with an email address or a social account, we receive the email address or basic profile identifier needed to create your session and, where applicable, to provision a wallet for you.",
      "Usage data. Like most websites, our infrastructure processes standard technical data such as IP address, browser type, pages viewed, and timestamps, used for security, debugging, and keeping the service running.",
      "Flight data shown on the site relates to aircraft, not to you, and contains no passenger information.",
    ],
  },
  {
    h: "2. What we do not collect",
    p: [
      "We do not collect your name, government ID, physical address, or payment card details. We do not hold your private keys for self-custodied wallets. We do not sell your personal information, and we do not use it for third-party advertising.",
    ],
  },
  {
    h: "3. How we use information",
    p: [
      "To operate the platform: matching your positions to markets, showing your bet history, calculating winnings, and letting you claim them. To secure the service: detecting abuse, fraud, and attacks. To improve the product: aggregate, non-identifying analytics about how the site is used. To communicate: only if you contact us or where a service notice is genuinely required.",
    ],
  },
  {
    h: "4. Sharing",
    p: [
      "We share data only with the service providers that are strictly necessary to run the platform (such as hosting, sign-in, and flight-status infrastructure), each bound to use it solely to provide their service to us; when required by law, regulation, or valid legal process; and in connection with a merger, acquisition, or asset sale, in which case this policy continues to apply to your data.",
    ],
  },
  {
    h: "5. Public blockchain data",
    p: [
      "Positions, claims, and settlements are executed by smart contracts on a public network. Anyone can view them. Blockchain records cannot be edited or deleted by us or anyone else. If you are not comfortable with your wallet's activity being public, do not use the service.",
    ],
  },
  {
    h: "6. Cookies and local storage",
    p: [
      "We use a small amount of browser storage to remember things like whether you have seen the intro screen and to keep you signed in. We do not use cross-site tracking cookies.",
    ],
  },
  {
    h: "7. Data retention",
    p: [
      "Off-chain records (such as your email if you signed in with one, and server logs) are kept only as long as needed for the purposes above or as required by law. On-chain data is permanent by nature of the technology.",
    ],
  },
  {
    h: "8. Your rights",
    p: [
      "Depending on where you live, you may have rights to access, correct, delete, or export the personal data we hold about you off-chain, and to object to or restrict certain processing. To exercise them, email hello@jetlag.fun. We will respond within the timeframe required by applicable law. Note that we cannot alter data recorded on a public blockchain.",
    ],
  },
  {
    h: "9. Children",
    p: [
      "Jetlag is not directed to anyone under 18, and we do not knowingly collect data from minors. If you believe a minor has used the service, contact us and we will act on it.",
    ],
  },
  {
    h: "10. Changes and contact",
    p: [
      "We may update this policy from time to time; the date at the top reflects the latest version. Material changes will be posted on this page. Questions: hello@jetlag.fun.",
    ],
  },
];

export const metadata = { title: "Privacy Policy — Jetlag" };

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flap text-2xl font-extrabold tracking-widest text-board-amber">
          PRIVACY POLICY
        </h1>
        <p className="mt-1 text-xs text-board-dim">Last updated: July 15, 2026</p>
      </div>
      <p className="text-sm leading-relaxed text-board-dim">
        Jetlag is built to know as little about you as possible. This page explains what we
        collect, why, and what we never touch.
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
