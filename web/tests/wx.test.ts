import { describe as suite, expect, it } from "vitest";
import { AIRPORTS } from "../lib/airports";
import { embedUrl, feedFor } from "../lib/liveFeeds";
import { describe, gcPoints, severity } from "../lib/wx";

suite("severity", () => {
  it("clear and cloudy are calm", () => {
    expect(severity(0)).toBe(0);
    expect(severity(3)).toBe(0);
  });
  it("fog, drizzle, light rain slow things down", () => {
    expect(severity(45)).toBe(1);
    expect(severity(51)).toBe(1);
    expect(severity(61)).toBe(1);
    expect(severity(80)).toBe(1);
  });
  it("thunderstorms, snow, heavy rain are delay risk", () => {
    expect(severity(95)).toBe(2);
    expect(severity(99)).toBe(2);
    expect(severity(71)).toBe(2);
    expect(severity(66)).toBe(2);
    expect(severity(86)).toBe(2);
  });
});

suite("describe", () => {
  it("maps codes to icons", () => {
    expect(describe(0).label).toBe("clear");
    expect(describe(96).label).toBe("thunderstorms");
  });
});

suite("gcPoints", () => {
  const ewr = AIRPORTS.EWR;
  const sfo = AIRPORTS.SFO;
  it("returns n points anchored at both ends", () => {
    const pts = gcPoints(ewr, sfo, 7);
    expect(pts).toHaveLength(7);
    expect(pts[0].lat).toBeCloseTo(ewr.lat, 3);
    expect(pts[0].lon).toBeCloseTo(ewr.lon, 3);
    expect(pts[6].lat).toBeCloseTo(sfo.lat, 3);
    expect(pts[6].lon).toBeCloseTo(sfo.lon, 3);
  });
  it("great-circle midpoint arcs north of the straight line", () => {
    const mid = gcPoints(ewr, sfo, 3)[1];
    // straight-line midpoint latitude would be ~39.15; the great circle bows north
    expect(mid.lat).toBeGreaterThan(40);
    expect(mid.lon).toBeGreaterThan(-123);
    expect(mid.lon).toBeLessThan(-74);
  });
  it("handles identical endpoints", () => {
    const pts = gcPoints(ewr, ewr, 3);
    expect(pts[1].lat).toBeCloseTo(ewr.lat, 3);
  });
});

suite("liveFeeds", () => {
  it("knows curated airports and ignores the rest", () => {
    expect(feedFor("LAX")?.channelId).toBeTruthy();
    expect(feedFor("LAS")?.channelId).toBeTruthy();
    expect(feedFor("MIA")?.videoId).toBeTruthy();
    expect(feedFor("XYZ")).toBeNull();
  });
  it("channel feeds embed the channel's current live stream", () => {
    const url = embedUrl({ channelId: "UCabc", label: "", credit: "" });
    expect(url).toContain("embed/live_stream?channel=UCabc");
  });
  it("embeds are chromeless, muted, and privacy-friendly", () => {
    const url = embedUrl({ videoId: "abc123", label: "", credit: "" });
    expect(url).toContain("youtube-nocookie.com/embed/abc123");
    for (const p of ["mute=1", "controls=0", "disablekb=1", "fs=0"]) expect(url).toContain(p);
  });
});
