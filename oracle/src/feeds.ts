/** Resolves each cam channel's CURRENT live video id by reading the channel's
 *  /live page server-side. YouTube live streams restart under a new video id
 *  every few days, so the id must be resolved at request time, not shipped in
 *  the frontend bundle.
 *
 *  Hardened: a channel /live page that is NOT currently live is a normal
 *  channel page full of unrelated recommended videos — grabbing the first
 *  videoId in the HTML can select a completely wrong video. So we (1) only
 *  parse inside the player response and only when it says isLiveNow, and
 *  (2) confirm the candidate's author via oEmbed before trusting it. Anything
 *  short of full confidence falls back to the last verified id. */

interface ChannelCam {
  /** YouTube channel id — resolved live at request time */
  channelId?: string;
  /** substring the oEmbed author_name must contain for a candidate to count */
  author: string;
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
    author: "AirlineVideos",
    fallback: "n4I0d44oBEs",
    label: "runway cams · live ATC",
    credit: "AirlineVideosLive+",
  },
  LAS: {
    channelId: "UCYDCnc3YBEqxfuhvQ4rxqSA", // LAS Vegas Airport LIVE (24/7)
    author: "LAS Vegas",
    fallback: "iIUCaiiMmNs",
    label: "runways 26L & 26R · live ATC",
    credit: "LAS Vegas Airport LIVE",
  },
  MIA: {
    pinned: "_GUsXnlVJmo", // PTZtv's long-running MIA cam; their channel mixes in beach/port cams
    author: "PTZtv",
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

/** The live videoId from a channel /live page, or null unless the page's own
 *  player says it is live RIGHT NOW. Exported for tests. */
export function parseLiveVideoId(html: string): string | null {
  const at = html.indexOf("ytInitialPlayerResponse");
  if (at < 0) return null;
  const scope = html.slice(at, at + 200_000);
  if (!scope.includes('"isLiveNow":true')) return null;
  const m = scope.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  return m ? m[1] : null;
}

const TTL_MS = 10 * 60_000;
let cache: { at: number; feeds: FeedInfo[] } | null = null;
const lastGood: Record<string, string> = {};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** True only if YouTube's oEmbed confirms the video exists AND is by the
 *  expected operator — the guard against ever serving an unrelated video. */
async function verifyAuthor(videoId: string, author: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      { headers: { "user-agent": UA }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return false;
    const j = (await res.json()) as { author_name?: string };
    return (j.author_name ?? "").toLowerCase().includes(author.toLowerCase());
  } catch {
    return false;
  }
}

async function resolveChannel(cam: ChannelCam): Promise<string | null> {
  if (!cam.channelId) return null;
  const res = await fetch(`https://www.youtube.com/channel/${cam.channelId}/live`, {
    headers: { "user-agent": UA, cookie: "CONSENT=YES+1" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  // the page must actually be about the expected channel, not a bot wall
  if (!html.includes(cam.channelId)) return null;
  const candidate = parseLiveVideoId(html);
  if (!candidate) return null;
  return (await verifyAuthor(candidate, cam.author)) ? candidate : null;
}

export async function currentFeeds(): Promise<FeedInfo[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.feeds;
  const feeds = await Promise.all(
    Object.entries(CAMS).map(async ([airport, cam]) => {
      let videoId = cam.pinned ?? null;
      if (!videoId) {
        try {
          videoId = await resolveChannel(cam);
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
