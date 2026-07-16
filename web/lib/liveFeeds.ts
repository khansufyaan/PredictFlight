/** Cam airports and their display metadata. The actual video id is NOT
 *  shipped here — live stream ids rotate every few days, so the oracle
 *  resolves the current one server-side (GET /feeds) and the player asks for
 *  it at runtime. `fallback` is only used if that call fails. */

export interface CamMeta {
  label: string;
  credit: string;
  fallback: string;
}

export const CAMS: Record<string, CamMeta> = {
  LAX: {
    label: "runway cams · live ATC",
    credit: "AirlineVideosLive+",
    fallback: "n4I0d44oBEs",
  },
  LAS: {
    label: "runways 26L & 26R · live ATC",
    credit: "LAS Vegas Airport LIVE",
    fallback: "tBz_zW5c-CY",
  },
  MIA: {
    label: "runway 9/27 · tower radio",
    credit: "PTZtv",
    fallback: "_GUsXnlVJmo",
  },
};

export function feedFor(airport: string): CamMeta | null {
  return CAMS[airport] ?? null;
}
