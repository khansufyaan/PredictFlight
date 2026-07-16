export interface Airline {
  key: string;
  name: string;
  code: string;
  /** brand-inspired badge color (we render color badges, not trademarked logos) */
  color: string;
  text?: string;
}

export const AIRLINES: Airline[] = [
  { key: "united", name: "United", code: "UA", color: "#0033A0" },
  { key: "american", name: "American", code: "AA", color: "#B61F23" },
  { key: "delta", name: "Delta", code: "DL", color: "#C8102E" },
  { key: "southwest", name: "Southwest", code: "WN", color: "#F9B612", text: "#1e293b" },
  { key: "alaska", name: "Alaska", code: "AS", color: "#01426A" },
];

const OTHER: Airline = { key: "other", name: "Other", code: "✈", color: "#475569" };

const PREFIXES: Record<string, string> = {
  UA: "united", UAL: "united",
  AA: "american", AAL: "american",
  DL: "delta", DAL: "delta",
  WN: "southwest", SWA: "southwest",
  AS: "alaska", ASA: "alaska",
};

/** 512px square marks, composited for a consistent crisp look — trimmed square,
 *  Alaska's white mark backed with its navy so it reads on a white tile. Served
 *  from the public repo (pinned commit) so they render on any deploy; the same
 *  files are committed at web/public/logos for same-origin serving once Vercel's
 *  root directory is set to `web`. */
const LOGO_BASE =
  "https://raw.githubusercontent.com/khansufyaan/PredictFlight/c1530dde4ed2162bc114dacaffe2d1478802e5f7/web/public/logos";
export function logoUrl(code: string): string {
  return `${LOGO_BASE}/${code}.png`;
}

export function airlineOf(flightNumber: string): Airline {
  const m = flightNumber.match(/^[A-Z]+/);
  const key = m ? PREFIXES[m[0]] : undefined;
  return AIRLINES.find((a) => a.key === key) ?? OTHER;
}
