import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My bets",
  description: "Your live and settled flight bets — claim winnings on resolved flights.",
  robots: { index: false }, // wallet-specific page, nothing for crawlers
};

export default function BetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
