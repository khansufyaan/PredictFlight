"use client";

import { embedUrl, feedFor, watchUrl } from "@/lib/liveFeeds";

/** Embedded 24/7 live stream of an airport (muted autoplay). Renders nothing
 *  for airports without a curated feed; if the stream itself is between
 *  restarts, YouTube shows its own offline card inside the frame. */
export function LiveFeed({ airport }: { airport: string }) {
  const feed = feedFor(airport);
  if (!feed) return null;

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-board-line bg-black">
        <iframe
          src={embedUrl(feed.videoId)}
          title={`${airport} live — ${feed.label}`}
          className="aspect-video w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-board-dim">
        <span>
          <span className="text-board-red">●</span> {airport} live · {feed.label}
        </span>
        <a
          href={watchUrl(feed.videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-board-amber"
        >
          {feed.credit} ↗
        </a>
      </div>
    </div>
  );
}
