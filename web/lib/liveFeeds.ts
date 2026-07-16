/** Curated 24/7 airport live streams (YouTube). Each verified running with
 *  ATC/tower audio. Streams occasionally restart under a new video id — the
 *  UI treats a dead embed as "feed offline", never a broken page. */

export interface AirportFeed {
  /** YouTube video id of the 24/7 stream */
  videoId: string;
  /** what the camera shows */
  label: string;
  /** stream operator, shown as credit */
  credit: string;
}

export const LIVE_FEEDS: Record<string, AirportFeed> = {
  LAX: {
    videoId: "n4I0d44oBEs",
    label: "Runways 24L & 24R · live ATC",
    credit: "AirlineVideosLive+",
  },
  LAS: {
    videoId: "3a4dRftiJ9Y",
    label: "Runways 26L & 26R · live ATC",
    credit: "LAS Vegas Airport LIVE",
  },
  MIA: {
    videoId: "_GUsXnlVJmo",
    label: "Runway 9/27 · tower radio",
    credit: "PTZtv",
  },
};

export function feedFor(airport: string): AirportFeed | null {
  return LIVE_FEEDS[airport] ?? null;
}

export function embedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0`;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
