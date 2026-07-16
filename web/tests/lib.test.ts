import { describe, expect, it } from "vitest";
import { AIRLINES, airlineOf, logoUrl } from "../lib/airlines";
import { hhmm, pct, shortAddr, usdc } from "../lib/format";
import { estimateOnTimeProb } from "../lib/predict";

describe("format", () => {
  it("formats USDC 6-decimals", () => {
    expect(usdc("25000000")).toBe("25");
    expect(usdc(1234560n, 2)).toBe("1.23");
    expect(usdc("0")).toBe("0");
  });

  it("formats percentages and addresses", () => {
    expect(pct(0.5)).toBe("50%");
    expect(pct(0.789)).toBe("79%");
    expect(shortAddr("0x414b6C1e7797D3b4Ccb671b9F4B735dc861629e0")).toBe("0x414b…29e0");
  });

  it("hhmm renders a wall-clock time", () => {
    expect(hhmm(0)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("airlines", () => {
  it("maps IATA and ICAO prefixes to carriers", () => {
    expect(airlineOf("UA415").key).toBe("united");
    expect(airlineOf("UAL2115").key).toBe("united");
    expect(airlineOf("WN100").key).toBe("southwest");
    expect(airlineOf("SWA100").key).toBe("southwest");
    expect(airlineOf("ZZ999").key).toBe("other");
  });

  it("serves a logo URL for every tracked carrier", () => {
    for (const a of AIRLINES) {
      expect(logoUrl(a.code)).toMatch(new RegExp(`${a.code}\\.png$`));
    }
  });
});

describe("predict", () => {
  const noonTs = Math.floor(new Date("2026-07-16T12:00:00").getTime() / 1000);
  const sixAmTs = Math.floor(new Date("2026-07-16T06:00:00").getTime() / 1000);
  const ninePmTs = Math.floor(new Date("2026-07-16T21:00:00").getTime() / 1000);

  it("returns null for unknown carriers", () => {
    expect(estimateOnTimeProb("ZZ999", noonTs)).toBeNull();
  });

  it("stays inside the clamped 0.50–0.92 band", () => {
    for (const fn of ["UA1", "AA1", "DL1", "WN1", "AS1"]) {
      for (const ts of [sixAmTs, noonTs, ninePmTs]) {
        const p = estimateOnTimeProb(fn, ts)!;
        expect(p).toBeGreaterThanOrEqual(0.5);
        expect(p).toBeLessThanOrEqual(0.92);
      }
    }
  });

  it("morning departures beat evening departures", () => {
    expect(estimateOnTimeProb("UA1", sixAmTs)!).toBeGreaterThan(
      estimateOnTimeProb("UA1", ninePmTs)!,
    );
  });

  it("Delta rates above Southwest at the same hour", () => {
    expect(estimateOnTimeProb("DL1", noonTs)!).toBeGreaterThan(
      estimateOnTimeProb("WN1", noonTs)!,
    );
  });
});
