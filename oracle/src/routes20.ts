/** 20 high-volume US routes markets are created for, with a representative
 *  carrier flight number per route (used verbatim by MockProvider; the
 *  AeroApiProvider queries the schedule for whatever actually flies). */
export interface Route {
  origin: string;
  destination: string;
  flightNumber: string;
}

export const ROUTES: Route[] = [
  { origin: "SFO", destination: "LAX", flightNumber: "UA415" },
  { origin: "SFO", destination: "JFK", flightNumber: "DL310" },
  { origin: "LAX", destination: "JFK", flightNumber: "AA2" },
  { origin: "ORD", destination: "DEN", flightNumber: "UA1128" },
  { origin: "ATL", destination: "MIA", flightNumber: "DL1586" },
  { origin: "JFK", destination: "MIA", flightNumber: "B6801" },
  { origin: "LAX", destination: "SEA", flightNumber: "AS1085" },
  { origin: "DFW", destination: "ORD", flightNumber: "AA1234" },
  { origin: "DEN", destination: "PHX", flightNumber: "WN1502" },
  { origin: "BOS", destination: "DCA", flightNumber: "AA2150" },
  { origin: "ATL", destination: "ORD", flightNumber: "DL2020" },
  { origin: "SEA", destination: "SFO", flightNumber: "AS304" },
  { origin: "LAS", destination: "LAX", flightNumber: "WN2043" },
  { origin: "MCO", destination: "ATL", flightNumber: "DL1177" },
  { origin: "EWR", destination: "SFO", flightNumber: "UA1701" },
  { origin: "PHX", destination: "DFW", flightNumber: "AA612" },
  { origin: "IAH", destination: "DEN", flightNumber: "UA2402" },
  { origin: "MIA", destination: "LGA", flightNumber: "AA1099" },
  { origin: "SLC", destination: "DEN", flightNumber: "DL2872" },
  { origin: "CLT", destination: "ATL", flightNumber: "AA509" },
];
