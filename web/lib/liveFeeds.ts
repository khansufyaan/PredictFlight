/** Curated 24/7 airport live streams (YouTube), verified running with ATC
 *  audio. Single-purpose channels are embedded BY CHANNEL — the embed always
 *  resolves to whatever the channel is live-streaming right now, so it
 *  survives stream restarts (video ids rot within days; channel ids don't).
 *  Multi-cam operators (PTZtv) pin a specific long-running video id. */

export interface AirportFeed {
  /** channel-based embed: always the channel's current live stream */
  channelId?: string;
  /** fixed-stream embed, for operators that run many unrelated cams */
  videoId?: string;
  /** what the camera shows */
  label: string;
  /** stream operator, credited as plain text */
  credit: string;
}

export const LIVE_FEEDS: Record<string, AirportFeed> = {
  LAX: {
    channelId: "UCox5yCEEjk4iYbhLgyj90EQ", // AirlineVideosLive+ — dedicated 24/7 LAX cams
    label: "runway cams · live ATC",
    credit: "AirlineVideosLive+",
  },
  LAS: {
    channelId: "UCYDCnc3YBEqxfuhvQ4rxqSA", // LAS Vegas Airport LIVE — dedicated 24/7 feed
    label: "runways 26L & 26R · live ATC",
    credit: "LAS Vegas Airport LIVE",
  },
  MIA: {
    videoId: "_GUsXnlVJmo", // PTZtv's long-running MIA cam (channel runs many other cams)
    label: "runway 9/27 · tower radio",
    credit: "PTZtv",
  },
};

export function feedFor(airport: string): AirportFeed | null {
  return LIVE_FEEDS[airport] ?? null;
}

/** Chromeless ambient embed: muted autoplay, no controls, no keyboard, no
 *  fullscreen, no suggestions. Interaction is disabled at the DOM layer too
 *  (pointer-events) — this is a window, not a video player. */
export function embedUrl(feed: AirportFeed): string {
  const params =
    "autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&rel=0&playsinline=1&modestbranding=1";
  if (feed.channelId) {
    return `https://www.youtube-nocookie.com/embed/live_stream?channel=${feed.channelId}&${params}`;
  }
  return `https://www.youtube-nocookie.com/embed/${feed.videoId}?${params}`;
}
