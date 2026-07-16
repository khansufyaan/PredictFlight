import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ops",
  robots: { index: false, follow: false }, // operator-only, never crawled
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
