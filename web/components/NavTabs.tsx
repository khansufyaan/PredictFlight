"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "✈", label: "Departures", short: "Board" },
  { href: "/bets", icon: "🎟", label: "My bets", short: "My bets" },
  { href: "/past", icon: "🛬", label: "Landed", short: "Landed" },
  { href: "/how", icon: "?", label: "How it works", short: "FAQ" },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Slim inline nav for the desktop header. */
export function NavTabs() {
  const isActive = useActive();
  return (
    <nav className="hidden items-center gap-5 text-[11px] tracking-wide sm:flex">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`whitespace-nowrap uppercase transition-colors ${
            isActive(t.href) ? "font-bold text-board-amber" : "text-board-dim hover:text-board-amber"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Thumb-reachable bottom tab bar for mobile. Must live OUTSIDE the header:
 *  backdrop-blur ancestors hijack position:fixed descendants. */
export function MobileTabs() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-board-line bg-black/95 backdrop-blur sm:hidden">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex flex-col items-center gap-0.5 py-2.5 text-[9px] uppercase tracking-wider transition-colors ${
            isActive(t.href) ? "text-board-amber" : "text-board-dim"
          }`}
        >
          <span className="text-base leading-none">{t.icon}</span>
          {t.short}
        </Link>
      ))}
    </nav>
  );
}
