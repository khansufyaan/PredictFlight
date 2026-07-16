import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flight market",
  description:
    "Will this flight land on time? Predict either way with USDC — winners split the losers' pool.",
  robots: { index: false }, // thousands of short-lived market pages; keep the crawl budget on evergreen pages
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
