import { config } from "../config.js";
import { AeroApiProvider } from "./aeroapi.js";
import { MockProvider } from "./mock.js";
import type { FlightDataProvider } from "./types.js";

let instance: FlightDataProvider | undefined;

export function getProvider(): FlightDataProvider {
  if (!instance) {
    instance = config.provider === "aeroapi" ? new AeroApiProvider() : new MockProvider();
    console.log(`[provider] using ${instance.name}`);
  }
  return instance;
}

export type { FlightDataProvider, ScheduledFlight, FlightStatus } from "./types.js";
