/** Resolves each cam channel's CURRENT live video id by reading the channel's
 *  /live page server-side. YouTube live streams restart under a new video id
 *  every few days, so the id must be resolved at request time, not shipped in
 *  the frontend bundle. Cached in-memory; falls back to the last id that
 *  worked (or a pinned one) if YouTube is unreadable for a moment. */

interface ChannelCam {
  /** YouTube channel id — resolved live at request time */
  channelId?: string;
  /** fixed video id for operators whose channel runs many unrelated cams */
  pinned?: string;
  /** last resort if resolution fails before we ever succeed */
  fallback: string;
  label: string;
  credit: string;
}

const CAMS: Record<string, ChannelCam> = {
  LAX: {
    channelId: "UCox5yCEEjk4iYbhLgyj90EQ", // AirlineVideosLive+ (24/7 LAX cams)
    fallback: "n4I0d44oBEs",
    label: "runway cams · live ATC",
    credit: "AirlineVideosLive+",
  },
  LAS: {
    channelId: "UCYDCnc3YBEqxfuhvQ4rxqSA", // LAS Vegas Airport LIVE (24/7)
    fallback: "tBz_zW5c-CY",
    label: "runways 26L & 26R · live ATC",
    credit: "LAS Vegas Airport LIVE",
  },
  MIA: {
    pinned: "_GUsXnlVJmo", // PTZtv's long-running MIA cam; their channel mixes in beach/port cams
    fallback: "_GUsXnlVJmo",
    label: "runway 9/27 · tower radio",
    credit: "PTZtv",
  },
};

export interface FeedInfo {
  airport: string;
  videoId: string;
  label: string;
  credit: string;
}

/** First live videoId in a channel /live page, or null. Exported for tests. */
export function parseLiveVideoId(html: string): string | null {
  if (!html.includes('"isLive":true')) return null;
  const m = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  return m ? m[1] : null;
}

const TTL_MS = 10 * 60_000;
let cache: { at: number; feeds: FeedInfo[] } | null = null;
const lastGood: Record<string, string> = {};

async function resolveChannel(channelId: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
    headers: {
      // plain-browser UA so YouTube serves the real page, not a bot wall
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      cookie: "CONSENT=YES+1",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return parseLiveVideoId(await res.text());
}

export async function currentFeeds(): Promise<FeedInfo[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.feeds;
  const feeds = await Promise.all(
    Object.entries(CAMS).map(async ([airport, cam]) => {
      let videoId = cam.pinned ?? null;
      if (!videoId && cam.channelId) {
        try {
          videoId = await resolveChannel(cam.channelId);
        } catch {
          videoId = null;
        }
      }
      videoId = videoId ?? lastGood[airport] ?? cam.fallback;
      lastGood[airport] = videoId;
      return { airport, videoId, label: cam.label, credit: cam.credit };
    }),
  );
  cache = { at: Date.now(), feeds };
  return feeds;
}
