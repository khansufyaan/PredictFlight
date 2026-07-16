import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import { Logo } from "@/components/Logo";
import { MobileTabs, NavTabs } from "@/components/NavTabs";
import { PlaneFly } from "@/components/PlaneFly";
import { Splash } from "@/components/Splash";

export const metadata: Metadata = {
  metadataBase: new URL("https://jetlag.fun"),
  title: {
    default: "Jetlag — bet on late flights",
    template: "%s | Jetlag",
  },
  description:
    "The jet is lagging. Bet USDC on whether real flights land on time — winners split the losers' pool. Peer-to-peer flight prediction markets with verified results.",
  keywords: [
    "flight delay betting",
    "flight prediction market",
    "will my flight be late",
    "bet on flight delays",
    "on-time flight odds",
    "parimutuel flight betting",
    "USDC prediction market",
  ],
  applicationName: "Jetlag",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Jetlag — bet on late flights",
    description:
      "Bet USDC on whether flights land on time. Winners split the losers' pool. Challenge your friends.",
    url: "https://jetlag.fun",
    siteName: "Jetlag",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Jetlag — bet on late flights",
    description: "Predict the landing. Win back your fare. jetlag.fun",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="sticky top-0 z-10 border-b border-board-line bg-board-bg/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
              <Link href="/" className="flex shrink-0 items-center">
                <Logo />
              </Link>
              <NavTabs />
              <ConnectButton />
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-8">{children}</main>
          <MobileTabs />
          <Splash />
          <PlaneFly />
          <footer className="mx-auto max-w-3xl space-y-1.5 px-4 pb-8 text-center text-[10px] text-board-dim">
            <div>
              jetlag.fun ✈ the jet is lagging · parimutuel pools · 2% fee on winnings · 24h
              dispute window before claims
            </div>
            <div>
              <Link href="/terms" className="underline hover:text-board-amber">
                Terms &amp; Conditions
              </Link>
              <span className="mx-2">·</span>
              <Link href="/privacy" className="underline hover:text-board-amber">
                Privacy Policy
              </Link>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
