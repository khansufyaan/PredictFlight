// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FTest} from "./utils/FTest.sol";
import {MockUSDC} from "./utils/MockUSDC.sol";
import {FlightMarket} from "../src/FlightMarket.sol";

contract ReentrantToken is MockUSDC {
    FlightMarket public target;
    bytes32 public marketId;
    bool public armed;
    bytes4 public reentryError;

    function arm(FlightMarket target_, bytes32 marketId_) external {
        target = target_;
        marketId = marketId_;
        armed = true;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (armed) {
            armed = false;
            try target.claim(marketId) {
                reentryError = 0x00000000;
            } catch (bytes memory reason) {
                reentryError = bytes4(reason);
            }
        }
        return super.transfer(to, amount);
    }
}

contract FlightMarketTest is FTest {
    uint256 constant T0 = 1_800_000_000;
    uint64 constant DEP = uint64(T0 + 1 days);
    uint64 constant ARR = uint64(T0 + 1 days + 5 hours);
    bytes32 constant FLIGHT = keccak256("AA123-2027-01-16");

    MockUSDC usdc;
    FlightMarket fm;
    bytes32 mid;

    address oracle = address(0xA11CE);
    address alice = address(0xA1);
    address bob = address(0xB0B);
    address carol = address(0xCA401);

    function setUp() public {
        vm.warp(T0);
        usdc = new MockUSDC();
        fm = new FlightMarket(address(usdc), oracle);
        vm.prank(oracle);
        mid = fm.createMarket(FLIGHT, DEP, ARR);
        for (uint160 i = 0; i < 3; i++) {
            address u = [alice, bob, carol][i];
            usdc.mint(u, 1_000_000_000); // 1,000 USDC
            vm.prank(u);
            usdc.approve(address(fm), type(uint256).max);
        }
    }

    function _deposit(address user, FlightMarket.Side side, uint256 amount) internal {
        vm.prank(user);
        fm.deposit(mid, side, amount);
    }

    function _resolveAfterLock(FlightMarket.Outcome outcome) internal {
        vm.warp(ARR + 30 minutes);
        vm.prank(oracle);
        fm.resolve(mid, outcome, ARR);
    }

    function _openClaims() internal {
        vm.warp(block.timestamp + fm.DISPUTE_WINDOW());
    }

    // ------------------------------------------------------- happy paths

    function test_HappyPath_OnTimeWins() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 100_000_000); // 100
        _deposit(bob, FlightMarket.Side.ON_TIME, 300_000_000); // 300
        _deposit(carol, FlightMarket.Side.LATE, 200_000_000); // 200

        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);
        _openClaims();

        // alice: 100 stake, winnings = 100*200/400 = 50, fee 1, payout 149
        vm.prank(alice);
        fm.claim(mid);
        assertEq(usdc.balanceOf(alice), 900_000_000 + 149_000_000, "alice payout");

        // bob: 300 stake, winnings 150, fee 3, payout 447
        vm.prank(bob);
        fm.claim(mid);
        assertEq(usdc.balanceOf(bob), 700_000_000 + 447_000_000, "bob payout");

        // carol lost: nothing to claim
        vm.expectRevert(FlightMarket.NothingToClaim.selector);
        vm.prank(carol);
        fm.claim(mid);

        assertEq(fm.accruedFees(), 4_000_000, "fees = 2% of 200 losing pool");
        fm.sweepFees(address(0xFEE));
        assertEq(usdc.balanceOf(address(0xFEE)), 4_000_000, "swept");
        assertEq(usdc.balanceOf(address(fm)), 0, "contract drained exactly");
    }

    function test_HappyPath_LateWins() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 500_000_000);
        _deposit(carol, FlightMarket.Side.LATE, 250_000_000);

        _resolveAfterLock(FlightMarket.Outcome.LATE);
        _openClaims();

        // carol: stake 250, winnings 500, fee 10, payout 740
        vm.prank(carol);
        fm.claim(mid);
        assertEq(usdc.balanceOf(carol), 750_000_000 + 740_000_000, "carol payout");
        assertEq(fm.accruedFees(), 10_000_000, "fee");

        vm.expectRevert(FlightMarket.NothingToClaim.selector);
        vm.prank(alice);
        fm.claim(mid);
    }

    function test_UserOnBothSides_WinsOnlyWinningStake() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 100_000_000);
        _deposit(alice, FlightMarket.Side.LATE, 100_000_000);
        _deposit(bob, FlightMarket.Side.ON_TIME, 100_000_000);

        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);
        _openClaims();

        // alice winning stake 100 of 200 pool, winnings 50, fee 1 -> 149
        vm.prank(alice);
        fm.claim(mid);
        assertEq(usdc.balanceOf(alice), 800_000_000 + 149_000_000, "alice both-sides payout");
    }

    // ------------------------------------------------------------- void

    function test_Void_RefundsBothSidesInFull() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 123_456_789);
        _deposit(carol, FlightMarket.Side.LATE, 987_654_321);

        _resolveAfterLock(FlightMarket.Outcome.VOID);
        _openClaims();

        vm.prank(alice);
        fm.claim(mid);
        vm.prank(carol);
        fm.claim(mid);

        assertEq(usdc.balanceOf(alice), 1_000_000_000, "alice fully refunded");
        assertEq(usdc.balanceOf(carol), 1_000_000_000, "carol fully refunded");
        assertEq(fm.accruedFees(), 0, "no fee on void");
        assertEq(usdc.balanceOf(address(fm)), 0, "empty");
    }

    // ---------------------------------------------------------- disputes

    function test_Overturn_ChangesOutcomeAndRestartsWindow() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 100_000_000);
        _deposit(carol, FlightMarket.Side.LATE, 100_000_000);

        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);

        vm.warp(block.timestamp + 12 hours);
        fm.overturn(mid, FlightMarket.Outcome.LATE);

        // window restarted: 13h after original resolve is NOT claimable
        vm.warp(block.timestamp + 1 hours);
        vm.expectRevert(FlightMarket.DisputeWindowOpen.selector);
        vm.prank(carol);
        fm.claim(mid);

        _openClaims();
        vm.prank(carol);
        fm.claim(mid); // stake 100 + winnings 100 - fee 2 = 198
        assertEq(usdc.balanceOf(carol), 900_000_000 + 198_000_000, "carol wins after overturn");

        vm.expectRevert(FlightMarket.NothingToClaim.selector);
        vm.prank(alice);
        fm.claim(mid);
    }

    function test_Overturn_RevertsAfterWindow() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 1_000_000);
        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);
        vm.warp(block.timestamp + fm.DISPUTE_WINDOW());
        vm.expectRevert(FlightMarket.DisputeWindowClosed.selector);
        fm.overturn(mid, FlightMarket.Outcome.LATE);
    }

    function test_Overturn_OnlyOwner() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 1_000_000);
        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);
        vm.expectRevert(FlightMarket.NotOwner.selector);
        vm.prank(alice);
        fm.overturn(mid, FlightMarket.Outcome.LATE);
    }

    // ------------------------------------------------- zero-opposite-pool

    function test_ZeroOppositePool_StakeBackNoFee() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 77_000_001);
        _deposit(bob, FlightMarket.Side.ON_TIME, 33_000_000);

        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);
        _openClaims();

        vm.prank(alice);
        fm.claim(mid);
        vm.prank(bob);
        fm.claim(mid);
        assertEq(usdc.balanceOf(alice), 1_000_000_000, "alice stake back");
        assertEq(usdc.balanceOf(bob), 1_000_000_000, "bob stake back");
        assertEq(fm.accruedFees(), 0, "no fee");
    }

    function test_OrphanedLosingPool_AbsorbedByOwner() public {
        // everyone bet LATE, flight was on time: no winners
        _deposit(carol, FlightMarket.Side.LATE, 50_000_000);
        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);

        vm.expectRevert(FlightMarket.DisputeWindowOpen.selector);
        fm.absorbOrphanedPool(mid);

        _openClaims();
        vm.expectRevert(FlightMarket.NothingToClaim.selector);
        vm.prank(carol);
        fm.claim(mid);

        fm.absorbOrphanedPool(mid);
        assertEq(fm.accruedFees(), 50_000_000, "orphan absorbed");
        vm.expectRevert(FlightMarket.NothingToClaim.selector);
        fm.absorbOrphanedPool(mid); // idempotent

        fm.sweepFees(address(0xFEE));
        assertEq(usdc.balanceOf(address(fm)), 0, "empty");
    }

    // ----------------------------------------------------- fee remainders

    function test_FeeMath_OddRemainders_NeverOverpays() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 3_333_333);
        _deposit(bob, FlightMarket.Side.ON_TIME, 1);
        _deposit(carol, FlightMarket.Side.LATE, 7_777_777);
        uint256 total = 3_333_333 + 1 + 7_777_777;

        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);
        _openClaims();

        vm.prank(alice);
        fm.claim(mid);
        vm.prank(bob);
        fm.claim(mid);

        uint256 paidAlice = usdc.balanceOf(alice) - (1_000_000_000 - 3_333_333);
        uint256 paidBob = usdc.balanceOf(bob) - (1_000_000_000 - 1);

        // each winner gets at least their stake back
        assertTrue(paidAlice >= 3_333_333, "alice >= stake");
        assertTrue(paidBob >= 1, "bob >= stake");
        // pool never overpays: payouts + fees <= total deposits
        assertLe(paidAlice + paidBob + fm.accruedFees(), total, "conservation");
        // dust from rounding stays in the contract and is small
        uint256 dust = total - paidAlice - paidBob - fm.accruedFees();
        assertLe(dust, 10, "dust bounded");
        assertEq(usdc.balanceOf(address(fm)), fm.accruedFees() + dust, "balance = fees + dust");
    }

    // -------------------------------------------------------- reentrancy

    function test_Claim_ReentrancyBlocked() public {
        ReentrantToken evil = new ReentrantToken();
        FlightMarket fm2 = new FlightMarket(address(evil), oracle);
        vm.prank(oracle);
        bytes32 mid2 = fm2.createMarket(FLIGHT, DEP, ARR);

        evil.mint(alice, 100);
        evil.mint(carol, 100);
        vm.prank(alice);
        evil.approve(address(fm2), type(uint256).max);
        vm.prank(carol);
        evil.approve(address(fm2), type(uint256).max);
        vm.prank(alice);
        fm2.deposit(mid2, FlightMarket.Side.ON_TIME, 100);
        vm.prank(carol);
        fm2.deposit(mid2, FlightMarket.Side.LATE, 100);

        vm.warp(ARR + 1 hours);
        vm.prank(oracle);
        fm2.resolve(mid2, FlightMarket.Outcome.ON_TIME, ARR);
        vm.warp(block.timestamp + fm2.DISPUTE_WINDOW());

        evil.arm(fm2, mid2);
        vm.prank(alice);
        fm2.claim(mid2); // token reenters claim() mid-transfer

        assertTrue(evil.reentryError() == FlightMarket.Reentrancy.selector, "reentry blocked by guard");
        assertEq(evil.balanceOf(alice), 198, "outer claim still paid correctly");
    }

    // ------------------------------------------------------- lock & guards

    function test_Deposit_RevertsAfterLock() public {
        vm.warp(DEP); // exactly at departure = locked
        vm.expectRevert(FlightMarket.MarketLocked.selector);
        vm.prank(alice);
        fm.deposit(mid, FlightMarket.Side.ON_TIME, 1_000_000);
    }

    function test_Deposit_RevertsZeroAmountAndUnknownMarket() public {
        vm.expectRevert(FlightMarket.ZeroAmount.selector);
        vm.prank(alice);
        fm.deposit(mid, FlightMarket.Side.ON_TIME, 0);

        vm.expectRevert(FlightMarket.UnknownMarket.selector);
        vm.prank(alice);
        fm.deposit(bytes32(uint256(0xdead)), FlightMarket.Side.ON_TIME, 1);
    }

    function test_Resolve_RevertsBeforeLock() public {
        vm.warp(DEP - 1);
        vm.expectRevert(FlightMarket.NotLockedYet.selector);
        vm.prank(oracle);
        fm.resolve(mid, FlightMarket.Outcome.ON_TIME, ARR);
    }

    function test_Resolve_OnlyOracle_NoDoubleResolve() public {
        vm.warp(DEP + 1);
        vm.expectRevert(FlightMarket.NotOracle.selector);
        fm.resolve(mid, FlightMarket.Outcome.ON_TIME, ARR);

        vm.prank(oracle);
        fm.resolve(mid, FlightMarket.Outcome.ON_TIME, ARR);
        vm.expectRevert(FlightMarket.AlreadyResolved.selector);
        vm.prank(oracle);
        fm.resolve(mid, FlightMarket.Outcome.LATE, ARR);
    }

    function test_Claim_RevertsDuringDisputeWindow_AndDoubleClaim() public {
        _deposit(alice, FlightMarket.Side.ON_TIME, 1_000_000);
        _deposit(carol, FlightMarket.Side.LATE, 1_000_000);
        _resolveAfterLock(FlightMarket.Outcome.ON_TIME);

        vm.expectRevert(FlightMarket.DisputeWindowOpen.selector);
        vm.prank(alice);
        fm.claim(mid);

        _openClaims();
        vm.prank(alice);
        fm.claim(mid);
        vm.expectRevert(FlightMarket.AlreadyClaimed.selector);
        vm.prank(alice);
        fm.claim(mid);
    }

    function test_CreateMarket_GuardsAndDuplicate() public {
        vm.expectRevert(FlightMarket.NotOracle.selector);
        fm.createMarket("X", DEP, ARR);

        vm.startPrank(oracle);
        vm.expectRevert(FlightMarket.BadTimes.selector);
        fm.createMarket("X", uint64(T0), ARR); // departure not in future

        vm.expectRevert(FlightMarket.BadTimes.selector);
        fm.createMarket("X", DEP, DEP); // arrival <= departure

        vm.expectRevert(FlightMarket.MarketExists.selector);
        fm.createMarket(FLIGHT, DEP, ARR); // duplicate of setUp market
        vm.stopPrank();
    }
}
