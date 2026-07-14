export const FLIGHT_MARKET_ABI = [
  "constructor(address usdc_, address oracle_)",
  "function usdc() view returns (address)",
  "function owner() view returns (address)",
  "function oracle() view returns (address)",
  "function accruedFees() view returns (uint256)",
  "function computeMarketId(bytes32 flightId, uint64 scheduledDeparture) pure returns (bytes32)",
  "function createMarket(bytes32 flightId, uint64 scheduledDeparture, uint64 scheduledArrival) returns (bytes32)",
  "function deposit(bytes32 marketId, uint8 side, uint256 amount)",
  "function resolve(bytes32 marketId, uint8 outcome, uint64 actualTouchdown)",
  "function overturn(bytes32 marketId, uint8 newOutcome)",
  "function claim(bytes32 marketId)",
  "function absorbOrphanedPool(bytes32 marketId)",
  "function sweepFees(address to)",
  "function getMarket(bytes32 marketId) view returns (tuple(bytes32 flightId, uint64 scheduledDeparture, uint64 scheduledArrival, uint64 resolvedAt, uint64 actualTouchdown, uint8 outcome, bool orphanAbsorbed, uint256 onTimePool, uint256 latePool))",
  "function getStake(bytes32 marketId, address user, uint8 side) view returns (uint256)",
  "function claimed(bytes32 marketId, address user) view returns (bool)",
  "event MarketCreated(bytes32 indexed marketId, bytes32 flightId, uint64 scheduledDeparture, uint64 scheduledArrival)",
  "event Deposited(bytes32 indexed marketId, address indexed user, uint8 side, uint256 amount)",
  "event Resolved(bytes32 indexed marketId, uint8 outcome, uint64 actualTouchdown)",
  "event Overturned(bytes32 indexed marketId, uint8 newOutcome)",
  "event Claimed(bytes32 indexed marketId, address indexed user, uint256 payout)",
  "event FeesSwept(address indexed to, uint256 amount)",
] as const;

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount)", // MockUSDC only
] as const;
