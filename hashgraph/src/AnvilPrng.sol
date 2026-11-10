// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Local-only stand-in for Hedera's HIP-351 PRNG precompile.
/// @dev Its runtime bytecode is installed at 0x169 by the Anvil bootstrap.
///      Do not deploy or use this contract on Hedera or a production network.
contract AnvilPrng {
    function getPseudorandomSeed() external view returns (bytes32) {
        return keccak256(
            abi.encode(block.prevrandao, block.timestamp, block.number, msg.sender)
        );
    }
}
