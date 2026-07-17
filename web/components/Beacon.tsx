"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { API_URL } from "@/lib/config";

/** First-party pageview beacon: one POST per route change, straight to our
 *  own oracle — no third-party analytics, nothing identifying stored. */
export function Beacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    fetch(`${API_URL}/track`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {
      /* analytics must never break the page */
    });
  }, [pathname]);
  return null;
}
