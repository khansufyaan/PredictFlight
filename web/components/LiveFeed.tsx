"use client";

import { embedUrl, feedFor } from "@/lib/liveFeeds";

/** Ambient live window onto an airport — not a video player. Muted, no
 *  controls, and pointer-events are off so it can't be paused, expanded, or
 *  clicked through to anywhere. Renders nothing for airports without a
 *  curated feed. */
export function LiveFeed({ airport }: { airport: string }) {
  const feed = feedFor(airport);
  if (!feed) return null;

  return (
    <div>
      <div className="pointer-events-none relative aspect-video select-none overflow-hidden rounded-lg border border-board-line bg-black">
        <iframe
          src={embedUrl(feed)}
          title={`${airport} live — ${feed.label}`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media"
          tabIndex={-1}
          loading="lazy"
        />
        {/* quiet the stream's own top-of-frame chrome and the embed's
            fading title overlay */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/85 to-transparent" />
        <div className="absolute left-3 top-2.5 text-[11px] font-bold uppercase tracking-widest text-white/90">
          <span className="text-board-red">●</span> live · {airport}
        </div>
      </div>
      <div className="mt-1.5 text-[11px] text-board-dim">
        {feed.label} · feed: {feed.credit}
      </div>
    </div>
  );
}
