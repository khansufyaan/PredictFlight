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

/** Curated per-carrier sources (verified visually): kiwi's 128px set except
 *  Southwest (kiwi's WN is a placeholder; Google's heart mark is correct). */
export function logoUrl(code: string): string {
  if (code === "WN") return "https://www.gstatic.com/flights/airline_logos/70px/WN.png";
  return `https://images.kiwi.com/airlines/128/${code}.png`;
}

export function airlineOf(flightNumber: string): Airline {
  const m = flightNumber.match(/^[A-Z]+/);
  const key = m ? PREFIXES[m[0]] : undefined;
  return AIRLINES.find((a) => a.key === key) ?? OTHER;
}

export const OTHER_AIRLINE = OTHER;
