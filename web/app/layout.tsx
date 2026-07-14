import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";

export const metadata: Metadata = {
  title: "FlightPool — bet on flights landing on time",
  description: "PvP parimutuel prediction markets on flight punctuality, settled in USDC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="sticky top-0 z-10 border-b border-board-line bg-board-bg/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
              <Link href="/" className="flap text-lg font-bold text-board-amber">
                ✈ FLIGHTPOOL
              </Link>
              <nav className="flex items-center gap-3 text-xs text-board-dim">
                <Link href="/" className="flap hover:text-board-amber">
                  Departures
                </Link>
                <Link href="/leaderboard" className="flap hover:text-board-amber">
                  Leaders
                </Link>
                <ConnectButton />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-[10px] text-board-dim">
            Parimutuel pools · 2% fee on winnings · 24h dispute window before claims
          </footer>
        </Providers>
      </body>
    </html>
  );
}
