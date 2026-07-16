import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Landed flights — verified results",
  description:
    "Every settled flight bet with third-party flight-tracking proof and the on-chain settlement transaction.",
  alternates: { canonical: "/past" },
};

export default function PastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
