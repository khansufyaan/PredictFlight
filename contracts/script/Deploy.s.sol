// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FlightMarket} from "../src/FlightMarket.sol";

interface VmScript {
    function envAddress(string calldata) external view returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// Deploys FlightMarket. Network-agnostic: point --rpc-url at Base mainnet,
/// Base Sepolia, or a local anvil node.
///
///   USDC_ADDRESS=<token> ORACLE_ADDRESS=<oracle signer> \
///   forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast \
///     --private-key $DEPLOYER_PRIVATE_KEY
contract Deploy {
    VmScript internal constant vm = VmScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (address) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        vm.startBroadcast();
        FlightMarket fm = new FlightMarket(usdc, oracle);
        vm.stopBroadcast();
        return address(fm);
    }
}
