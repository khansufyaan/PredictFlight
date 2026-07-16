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

/** Kayak's 300px set — the highest-resolution source that gets all five marks
 *  right (kiwi caps at 128px with a placeholder WN; gstatic's AS is wrong). */
export function logoUrl(code: string): string {
  return `https://content.r9cdn.net/rimg/provider-logos/airlines/v/${code}.png?crop=false&width=300&height=300`;
}

/** Committed backup of the same 300px marks, used if the CDN ever breaks. */
export function localLogoUrl(code: string): string {
  return `/logos/${code}.png`;
}

export function airlineOf(flightNumber: string): Airline {
  const m = flightNumber.match(/^[A-Z]+/);
  const key = m ? PREFIXES[m[0]] : undefined;
  return AIRLINES.find((a) => a.key === key) ?? OTHER;
}

export const OTHER_AIRLINE = OTHER;
