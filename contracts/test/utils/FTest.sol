// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// Minimal cheatcode surface — subset of forge's Vm we actually use.
/// (Vendored instead of forge-std: this session has no GitHub access for
/// submodules, and modern forge treats any revert in a test as a failure,
/// so a tiny assert helper is all we need.)
interface Vm {
    function warp(uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function expectEmit(bool, bool, bool, bool) external;
    function label(address, string calldata) external;
}

abstract contract FTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 a, uint256 b, string memory tag) internal pure {
        if (a != b) revert(string.concat("assertEq failed: ", tag));
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        assertEq(a, b, "uint256");
    }

    function assertEq(address a, address b, string memory tag) internal pure {
        if (a != b) revert(string.concat("assertEq failed: ", tag));
    }

    function assertTrue(bool ok, string memory tag) internal pure {
        if (!ok) revert(string.concat("assertTrue failed: ", tag));
    }

    function assertLe(uint256 a, uint256 b, string memory tag) internal pure {
        if (a > b) revert(string.concat("assertLe failed: ", tag));
    }
}
