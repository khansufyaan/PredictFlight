import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import { Logo } from "@/components/Logo";
import { PlaneFly } from "@/components/PlaneFly";
import { Splash } from "@/components/Splash";

export const metadata: Metadata = {
  metadataBase: new URL("https://jetlag.fun"),
  title: "Jetlag — bet on late flights",
  description:
    "The jet is lagging. Bet USDC on whether flights land on time, winners split the losers' pool. PvP flight prediction markets on Base.",
  openGraph: {
    title: "Jetlag — bet on late flights",
    description: "Bet USDC on whether flights land on time. Challenge your friends. jetlag.fun",
    url: "https://jetlag.fun",
    siteName: "Jetlag",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="sticky top-0 z-10 border-b border-board-line bg-board-bg/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between">
              <div className="flex w-full items-center justify-between sm:w-auto">
                <Link href="/" className="flex items-center">
                  <Logo />
                </Link>
                <span className="sm:hidden">
                  <ConnectButton />
                </span>
              </div>
              <nav className="flex items-center gap-4 text-xs text-board-dim">
                <Link href="/" className="flap hover:text-board-amber">
                  <span className="hidden sm:inline">Departures</span>
                  <span className="sm:hidden">Board</span>
                </Link>
                <Link href="/bets" className="flap whitespace-nowrap hover:text-board-amber">
                  My bets
                </Link>
                <Link href="/past" className="flap hover:text-board-amber">
                  Landed
                </Link>
                <Link href="/how" className="flap whitespace-nowrap hover:text-board-amber">
                  <span className="hidden sm:inline">How it works</span>
                  <span className="sm:hidden">FAQ</span>
                </Link>
                <span className="hidden sm:block">
                  <ConnectButton />
                </span>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
          <Splash />
          <PlaneFly />
          <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-[10px] text-board-dim">
            jetlag.fun ✈ the jet is lagging · parimutuel pools · 2% fee on winnings · 24h dispute
            window before claims
          </footer>
        </Providers>
      </body>
    </html>
  );
}
