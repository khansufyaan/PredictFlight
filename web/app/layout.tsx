import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { Beacon } from "@/components/Beacon";
import { ConnectButton } from "@/components/ConnectButton";
import { Logo } from "@/components/Logo";
import { MobileTabs, NavTabs } from "@/components/NavTabs";
import { PlaneFly } from "@/components/PlaneFly";
import { Splash } from "@/components/Splash";

export const metadata: Metadata = {
  metadataBase: new URL("https://jetlag.fun"),
  title: {
    default: "Jetlag — Late flight? Get paid.",
    template: "%s | Jetlag",
  },
  description:
    "Late flight? Get paid. Predict whether real flights land on time — winners split the losers' pool. Peer-to-peer flight prediction markets with verified results.",
  keywords: [
    "flight delay prediction",
    "flight prediction market",
    "will my flight be late",
    "get paid for flight delays",
    "on-time flight odds",
    "parimutuel flight predictions",
    "USDC prediction market",
  ],
  applicationName: "Jetlag",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Jetlag — Late flight? Get paid.",
    description:
      "Predict whether flights land on time. Winners split the losers' pool. Challenge your friends.",
    url: "https://jetlag.fun",
    siteName: "Jetlag",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Jetlag — Late flight? Get paid.",
    description: "When the jet lags, you win. jetlag.fun",
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
          <Beacon />
          <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-[10px] text-board-dim">
            <Link href="/terms" className="underline hover:text-board-amber">
              Terms &amp; Conditions
            </Link>
            <span className="mx-2">·</span>
            <Link href="/privacy" className="underline hover:text-board-amber">
              Privacy Policy
            </Link>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
