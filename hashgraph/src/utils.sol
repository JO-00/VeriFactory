// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPrngSystemContract {
    function getPseudorandomSeed() external returns (bytes32);
}

library RandomPicker {
    address constant PRECOMPILE_ADDRESS = address(0x169);

    /// @notice Fetches a pseudorandom seed from Hedera's HIP-351 PRNG precompile.
    /// @dev This is NOT a view function. Calling it consumes gas.
    function _getSeed() private returns (uint256) {
        return uint256(
            IPrngSystemContract(PRECOMPILE_ADDRESS)
                .getPseudorandomSeed()
        );
    }

    function pickRandom(address[] memory arr, uint256 k)
        internal
        returns (address[] memory)
    {
        require(k <= arr.length, "k > length");
        address[] memory result = new address[](k);
        uint256 seed = _getSeed();

        for (uint256 i = 0; i < k; i++) {
            uint256 j = i + (uint256(keccak256(abi.encode(seed, i))) % (arr.length - i));
            (arr[i], arr[j]) = (arr[j], arr[i]);
            result[i] = arr[i];
        }
        return result;
    }

    function pickRandom(uint256[] memory arr, uint256 k)
        internal
        returns (uint256[] memory)
    {
        require(k <= arr.length, "k > length");
        uint256[] memory result = new uint256[](k);
        uint256 seed = _getSeed();

        for (uint256 i = 0; i < k; i++) {
            uint256 j = i + (uint256(keccak256(abi.encode(seed, i))) % (arr.length - i));
            (arr[i], arr[j]) = (arr[j], arr[i]);
            result[i] = arr[i];
        }
        return result;
    }
}