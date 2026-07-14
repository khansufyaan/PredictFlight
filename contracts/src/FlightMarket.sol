// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title FlightMarket — parimutuel prediction markets on flight punctuality
/// @notice Registry pattern: one contract holds every market, keyed by marketId.
///         Users deposit USDC on ON_TIME or LATE before the flight's scheduled
///         departure (lock). After resolution and a 24h dispute window, winners
///         split the losing pool pro-rata to stake, minus a 2% protocol fee.
contract FlightMarket {
    enum Side {
        ON_TIME,
        LATE
    }

    enum Outcome {
        UNRESOLVED,
        ON_TIME,
        LATE,
        VOID
    }

    struct Market {
        bytes32 flightId;
        uint64 scheduledDeparture; // lock time
        uint64 scheduledArrival;
        uint64 resolvedAt; // 0 while unresolved; reset on overturn
        uint64 actualTouchdown;
        Outcome outcome;
        bool orphanAbsorbed;
        uint256 onTimePool;
        uint256 latePool;
    }

    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant BPS = 10_000;
    uint256 public constant DISPUTE_WINDOW = 24 hours;

    IERC20 public immutable usdc;
    address public owner;
    address public oracle;
    uint256 public accruedFees;

    mapping(bytes32 => Market) public markets;
    /// marketId => user => side => stake
    mapping(bytes32 => mapping(address => mapping(Side => uint256))) public stakes;
    mapping(bytes32 => mapping(address => bool)) public claimed;

    uint256 private _entered = 1;

    event MarketCreated(
        bytes32 indexed marketId, bytes32 flightId, uint64 scheduledDeparture, uint64 scheduledArrival
    );
    event Deposited(bytes32 indexed marketId, address indexed user, Side side, uint256 amount);
    event Resolved(bytes32 indexed marketId, Outcome outcome, uint64 actualTouchdown);
    event Overturned(bytes32 indexed marketId, Outcome newOutcome);
    event Claimed(bytes32 indexed marketId, address indexed user, uint256 payout);
    event FeesSwept(address indexed to, uint256 amount);
    event OrphanAbsorbed(bytes32 indexed marketId, uint256 amount);
    event OracleChanged(address indexed oracle);
    event OwnerChanged(address indexed owner);

    error NotOwner();
    error NotOracle();
    error MarketExists();
    error UnknownMarket();
    error MarketLocked();
    error NotLockedYet();
    error AlreadyResolved();
    error NotResolved();
    error DisputeWindowOpen();
    error DisputeWindowClosed();
    error AlreadyClaimed();
    error NothingToClaim();
    error ZeroAmount();
    error BadTimes();
    error BadOutcome();
    error Reentrancy();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    modifier nonReentrant() {
        if (_entered != 1) revert Reentrancy();
        _entered = 2;
        _;
        _entered = 1;
    }

    constructor(address usdc_, address oracle_) {
        if (usdc_ == address(0) || oracle_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        oracle = oracle_;
        owner = msg.sender;
    }

    // ------------------------------------------------------------------ admin

    function setOracle(address oracle_) external onlyOwner {
        if (oracle_ == address(0)) revert ZeroAddress();
        oracle = oracle_;
        emit OracleChanged(oracle_);
    }

    function setOwner(address owner_) external onlyOwner {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        emit OwnerChanged(owner_);
    }

    // ---------------------------------------------------------------- markets

    function computeMarketId(bytes32 flightId, uint64 scheduledDeparture) public pure returns (bytes32) {
        return keccak256(abi.encode(flightId, scheduledDeparture));
    }

    function createMarket(bytes32 flightId, uint64 scheduledDeparture, uint64 scheduledArrival)
        external
        onlyOracle
        returns (bytes32 marketId)
    {
        if (scheduledDeparture <= block.timestamp || scheduledArrival <= scheduledDeparture) {
            revert BadTimes();
        }
        marketId = computeMarketId(flightId, scheduledDeparture);
        if (markets[marketId].scheduledDeparture != 0) revert MarketExists();
        markets[marketId] = Market({
            flightId: flightId,
            scheduledDeparture: scheduledDeparture,
            scheduledArrival: scheduledArrival,
            resolvedAt: 0,
            actualTouchdown: 0,
            outcome: Outcome.UNRESOLVED,
            orphanAbsorbed: false,
            onTimePool: 0,
            latePool: 0
        });
        emit MarketCreated(marketId, flightId, scheduledDeparture, scheduledArrival);
    }

    function deposit(bytes32 marketId, Side side, uint256 amount) external nonReentrant {
        Market storage m = markets[marketId];
        if (m.scheduledDeparture == 0) revert UnknownMarket();
        if (block.timestamp >= m.scheduledDeparture) revert MarketLocked();
        if (amount == 0) revert ZeroAmount();

        if (side == Side.ON_TIME) m.onTimePool += amount;
        else m.latePool += amount;
        stakes[marketId][msg.sender][side] += amount;

        _safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(marketId, msg.sender, side, amount);
    }

    function resolve(bytes32 marketId, Outcome outcome, uint64 actualTouchdown) external onlyOracle {
        Market storage m = markets[marketId];
        if (m.scheduledDeparture == 0) revert UnknownMarket();
        if (block.timestamp < m.scheduledDeparture) revert NotLockedYet();
        if (m.resolvedAt != 0) revert AlreadyResolved();
        if (outcome == Outcome.UNRESOLVED) revert BadOutcome();

        m.outcome = outcome;
        m.actualTouchdown = actualTouchdown;
        m.resolvedAt = uint64(block.timestamp);
        emit Resolved(marketId, outcome, actualTouchdown);
    }

    /// @notice Owner may overturn a resolution while the dispute window is open.
    ///         Overturning restarts the 24h window.
    function overturn(bytes32 marketId, Outcome newOutcome) external onlyOwner {
        Market storage m = markets[marketId];
        if (m.resolvedAt == 0) revert NotResolved();
        if (block.timestamp >= uint256(m.resolvedAt) + DISPUTE_WINDOW) revert DisputeWindowClosed();
        if (newOutcome == Outcome.UNRESOLVED) revert BadOutcome();

        m.outcome = newOutcome;
        m.resolvedAt = uint64(block.timestamp);
        emit Overturned(marketId, newOutcome);
    }

    function claim(bytes32 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        if (m.resolvedAt == 0) revert NotResolved();
        if (block.timestamp < uint256(m.resolvedAt) + DISPUTE_WINDOW) revert DisputeWindowOpen();
        if (claimed[marketId][msg.sender]) revert AlreadyClaimed();
        claimed[marketId][msg.sender] = true;

        uint256 payout;
        if (m.outcome == Outcome.VOID) {
            payout = stakes[marketId][msg.sender][Side.ON_TIME] + stakes[marketId][msg.sender][Side.LATE];
        } else {
            (uint256 winnerPool, uint256 loserPool, Side winSide) = m.outcome == Outcome.ON_TIME
                ? (m.onTimePool, m.latePool, Side.ON_TIME)
                : (m.latePool, m.onTimePool, Side.LATE);
            uint256 stake = stakes[marketId][msg.sender][winSide];
            if (stake == 0) revert NothingToClaim();
            if (loserPool == 0) {
                // Nobody on the other side: stake back in full, no fee.
                payout = stake;
            } else {
                uint256 winnings = (stake * loserPool) / winnerPool;
                uint256 fee = (winnings * FEE_BPS) / BPS;
                accruedFees += fee;
                payout = stake + winnings - fee;
            }
        }
        if (payout == 0) revert NothingToClaim();

        _safeTransfer(msg.sender, payout);
        emit Claimed(marketId, msg.sender, payout);
    }

    /// @notice If a market resolved with an empty winning pool, the losing pool
    ///         is unclaimable; owner may absorb it into protocol fees after the
    ///         dispute window closes.
    function absorbOrphanedPool(bytes32 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        if (m.resolvedAt == 0) revert NotResolved();
        if (block.timestamp < uint256(m.resolvedAt) + DISPUTE_WINDOW) revert DisputeWindowOpen();
        if (m.orphanAbsorbed || m.outcome == Outcome.VOID) revert NothingToClaim();

        (uint256 winnerPool, uint256 loserPool) =
            m.outcome == Outcome.ON_TIME ? (m.onTimePool, m.latePool) : (m.latePool, m.onTimePool);
        if (winnerPool != 0 || loserPool == 0) revert NothingToClaim();

        m.orphanAbsorbed = true;
        accruedFees += loserPool;
        emit OrphanAbsorbed(marketId, loserPool);
    }

    function sweepFees(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = accruedFees;
        if (amount == 0) revert ZeroAmount();
        accruedFees = 0;
        _safeTransfer(to, amount);
        emit FeesSwept(to, amount);
    }

    // ------------------------------------------------------------------ views

    function getMarket(bytes32 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getStake(bytes32 marketId, address user, Side side) external view returns (uint256) {
        return stakes[marketId][user][side];
    }

    // --------------------------------------------------------------- internal

    function _safeTransfer(address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(usdc).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _safeTransferFrom(address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) =
            address(usdc).call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
