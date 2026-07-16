import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live — airport cams & flights landing now",
  description:
    "Watch live airport feeds with ATC audio and the flights landing right now — with real prediction markets riding on every touchdown.",
  alternates: { canonical: "/live" },
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
