/** Coordinates + city for every airport in the tracked routes, used for the
 *  destination-weather forecast lookup. */
export const AIRPORTS: Record<string, { lat: number; lon: number; city: string }> = {
  ATL: { lat: 33.6407, lon: -84.4277, city: "Atlanta" },
  BOS: { lat: 42.3656, lon: -71.0096, city: "Boston" },
  CLT: { lat: 35.2144, lon: -80.9473, city: "Charlotte" },
  DCA: { lat: 38.8512, lon: -77.0402, city: "Washington" },
  DEN: { lat: 39.8561, lon: -104.6737, city: "Denver" },
  DFW: { lat: 32.8998, lon: -97.0403, city: "Dallas" },
  EWR: { lat: 40.6895, lon: -74.1745, city: "Newark" },
  IAH: { lat: 29.9902, lon: -95.3368, city: "Houston" },
  JFK: { lat: 40.6413, lon: -73.7781, city: "New York" },
  LAS: { lat: 36.086, lon: -115.1537, city: "Las Vegas" },
  LAX: { lat: 33.9416, lon: -118.4085, city: "Los Angeles" },
  LGA: { lat: 40.7769, lon: -73.874, city: "New York" },
  MCO: { lat: 28.4312, lon: -81.3081, city: "Orlando" },
  MIA: { lat: 25.7959, lon: -80.287, city: "Miami" },
  ORD: { lat: 41.9742, lon: -87.9073, city: "Chicago" },
  PHX: { lat: 33.4373, lon: -112.0078, city: "Phoenix" },
  SEA: { lat: 47.4502, lon: -122.3088, city: "Seattle" },
  SFO: { lat: 37.6213, lon: -122.379, city: "San Francisco" },
  SLC: { lat: 40.7899, lon: -111.9791, city: "Salt Lake City" },
};
