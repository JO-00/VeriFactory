// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FactorySignaturesTest is BaseSetup {
    address internal clone;
    uint256 internal signerKey;
    address internal signer;

    string internal constant HEDERA_PREFIX = "\x19Hedera Signed Message:\n";

    function setUp() public override {
        super.setUp();
        signerKey = 0xA11CE;
        signer    = vm.addr(signerKey);
        clone     = _createFacility(signer, "F");
    }

    function _toHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    function _digest(string memory cid, address facility) internal pure returns (bytes32) {
        bytes32 messageHash = keccak256(abi.encodePacked(cid, facility));
        return keccak256(
            abi.encodePacked("\x19Hedera Signed Message:\n66", _toHexString(messageHash))
        );
    }

    function _sign(bytes32 digest, uint256 pk)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        (v, r, s) = vm.sign(pk, digest);
    }

    /* ---------------------------------------------------------------------- */
    /*                          Digest sanity checks                          */
    /* ---------------------------------------------------------------------- */

    // Locks the digest construction so a future change cannot silently drift.
    function test_digest_structure() public view {
        string memory cid = "QmLEGAL";
        bytes32 inner = keccak256(abi.encodePacked(cid, clone));
        string memory hexStr = _toHexString(inner);
        bytes32 digest = _digest(cid, clone);

        assertEq(inner, keccak256(abi.encodePacked(cid, clone)), "inner mismatch");

        bytes memory hb = bytes(hexStr);
        assertEq(hb.length, 66, "hex string must be 66 bytes");
        assertEq(hb[0], bytes1("0"));
        assertEq(hb[1], bytes1("x"));

        bytes32 expected = keccak256(
            abi.encodePacked("\x19Hedera Signed Message:\n66", hexStr)
        );
        assertEq(digest, expected, "digest mismatch");

        // Must differ from legacy Ethereum-style digest
        bytes32 wrong = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", inner)
        );
        assertTrue(digest != wrong, "digest should not equal legacy Eth digest");
    }

    // Golden vector: fill in from a real browser capture to lock end-to-end.
    // Skips while the placeholder is zero.
    function test_digest_goldenVector() public view {
        string memory cid    = "QmLEGAL";
        bytes32 goldenDigest = bytes32(0); // <-- paste captured digest here

        if (goldenDigest == bytes32(0)) return;

        bytes32 computed = _digest(cid, clone);
        assertEq(computed, goldenDigest, "digest drifted from frontend");
    }

    /* ---------------------------------------------------------------------- */
    /*                            Happy path                                  */
    /* ---------------------------------------------------------------------- */

    function test_sign_happyPath() public {
        string memory cid = "QmLEGAL";
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), signerKey);

        vm.prank(signer);
        init.SignTangibleContract(cid, clone, v, r, s);

        SignedContract[] memory sc = viz.getFacilitySignedContracts(clone);
        assertEq(sc.length, 1, "one signed contract expected");
        assertEq(sc[0].DocumentCID, cid, "cid mismatch");

        address[] memory facs = viz.getFacilitiesFromSignedContract(cid);
        assertEq(facs.length, 1, "one facility expected");
        assertEq(facs[0], clone, "facility mismatch");
    }

    /* ---------------------------------------------------------------------- */
    /*                            Revert cases                                */
    /* ---------------------------------------------------------------------- */

    function test_sign_wrongSignerReverts() public {
        string memory cid = "QmLEGAL";
        uint256 wrongKey  = 0xBEEF;
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), wrongKey);

        vm.prank(signer);
        vm.expectRevert("invalid signature");
        init.SignTangibleContract(cid, clone, v, r, s);
    }

    function test_sign_duplicateReverts() public {
        string memory cid = "QmLEGAL";
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), signerKey);

        vm.startPrank(signer);
        init.SignTangibleContract(cid, clone, v, r, s);
        vm.expectRevert("contract already signed");
        init.SignTangibleContract(cid, clone, v, r, s);
        vm.stopPrank();
    }

    function test_sign_tamperedSignatureReverts() public {
        string memory cid = "QmLEGAL";
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), signerKey);

        bytes32 tamperedS = bytes32(uint256(s) ^ 1);

        vm.prank(signer);
        vm.expectRevert();
        init.SignTangibleContract(cid, clone, v, r, tamperedS);
    }

    function test_sign_wrongCidReverts() public {
        // Ensure both documents exist.
        // Use your actual registration mechanism here.

        assertEq(vm.addr(signerKey), signer);

        // Sign the wrong CID.
        (uint8 v, bytes32 r, bytes32 s) =
            _sign(_digest("QmLEGAL", clone), signerKey);

        // Ensure the caller is authorized.
        vm.prank(signer);

        // Expect signature verification failure.
        vm.expectRevert(bytes("invalid signature"));

        init.SignTangibleContract(
            "QmREGISTERED",
            clone,
            v,
            r,
            s
        );
    }

    // Signature is over a *different* facility address.
    function test_sign_wrongFacilityReverts() public {
        address otherFacility = address(0xBEEF);
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest("QmLEGAL", otherFacility), signerKey);

        vm.prank(signer);
        vm.expectRevert(); // reverts on signature check (or admin check, depending on setup)
        init.SignTangibleContract("QmLEGAL", clone, v, r, s);
    }

    /* ---------------------------------------------------------------------- */
    /*                       Alias (Hedera 0x167) behavior                    */
    /* ---------------------------------------------------------------------- */

    // On vanilla Foundry EVM there is no Hedera precompile at 0x167, so
    // _resolveCallerAlias falls back to `return caller`. This proves that
    // fallback path: a normal signature by msg.sender passes, because the alias
    // branch effectively reduces to `recoveredAddress == msg.sender`.
    //
    // (Real alias behavior is exercised on a Hedera testnet fork, where 0x167
    // actually resolves; that is a separate integration test.)
    function test_sign_aliasFallbackOnVanillaEvm() public {
        string memory cid = "QmLEGAL";
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), signerKey);

        vm.prank(signer);
        init.SignTangibleContract(cid, clone, v, r, s);

        SignedContract[] memory sc = viz.getFacilitySignedContracts(clone);
        assertEq(sc.length, 1, "fallback path should accept msg.sender signature");
        assertEq(sc[0].DocumentCID, cid);
    }
}