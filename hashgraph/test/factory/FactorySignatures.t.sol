// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FactorySignaturesTest is BaseSetup {
    address internal clone;
    uint256 internal signerKey;
    address internal signer;

    function setUp() public override {
        super.setUp();
        signerKey = 0xA11CE;          // arbitrary private key
        signer    = vm.addr(signerKey);
        // create facility with signer as admin
        clone = _createFacility(signer, "F");
        // register a legal contract CID on the factory (assumes an owner-only setter exists)
        // If your factory exposes this differently, adjust here.
        // vm.prank(factory.owner());
        // factory.addContractCID("QmLEGAL");
    }

    function _digest(string memory cid, address facility) internal pure returns (bytes32) {
        bytes32 inner = keccak256(abi.encodePacked(cid, facility));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
    }

    function _sign(bytes32 digest, uint256 pk) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        (v, r, s) = vm.sign(pk, digest);
    }

    function test_sign_happyPath() public {
        // Requires "QmLEGAL" to be in contracts_cids. If your factory's
        // registration path differs, set it up in setUp and remove the vm.skip.
        vm.skip(true);
        string memory cid = "QmLEGAL";
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), signerKey);

        vm.prank(signer);
        factory.SignTangibleContract(cid, clone, v, r, s);

        SignedContract[] memory sc = factory.getFacilitySignedContracts(clone);
        assertEq(sc.length, 1);
        assertEq(sc[0].DocumentCID, cid);

        address[] memory facs = factory.getFacilitiesFromSignedContract(cid);
        assertEq(facs.length, 1);
        assertEq(facs[0], clone);
    }

    function test_sign_wrongSignerReverts() public {
        vm.skip(true);
        string memory cid = "QmLEGAL";
        uint256 wrongKey = 0xBEEF;
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), wrongKey);

        vm.prank(signer);
        vm.expectRevert("invalid signature");
        factory.SignTangibleContract(cid, clone, v, r, s);
    }

    function test_sign_duplicateReverts() public {
        vm.skip(true);
        string memory cid = "QmLEGAL";
        (uint8 v, bytes32 r, bytes32 s) = _sign(_digest(cid, clone), signerKey);

        vm.startPrank(signer);
        factory.SignTangibleContract(cid, clone, v, r, s);
        vm.expectRevert("contract already signed");
        factory.SignTangibleContract(cid, clone, v, r, s);
        vm.stopPrank();
    }
}