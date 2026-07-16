import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My predictions",
  description: "Your live and settled flight predictions — claim winnings on resolved flights.",
  robots: { index: false }, // wallet-specific page, nothing for crawlers
};

export default function BetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
