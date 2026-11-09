// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/Facility/FacilityRegistry.sol";
import {Factory as FacilityFactory} from "../../src/FacilityFactory/Factory.sol";
import "../../src/data_structs.sol";

abstract contract BaseSetup is Test {
    FacilityRegistry internal impl;
    FacilityFactory internal factory;

    address internal admin    = address(0xA11CE);
    address internal relayer1 = address(0xB0B);
    address internal relayer2 = address(0xCAFE);
    address internal stranger = address(0xDEAD);

    bytes32 internal constant ADMIN_ROLE    = keccak256("ADMIN");
    bytes32 internal constant RELAYER_ROLE  = keccak256("RELAYER");

    function setUp() public virtual {
        Document memory emptyDoc; 
        impl = new FacilityRegistry();
        factory = new FacilityFactory(address(impl) , new string[](2) , new Document[](2) , emptyDoc);
    }

    // ---- helpers ----
    function _relayers() internal view returns (address[] memory rs) {
        rs = new address[](2);
        rs[0] = relayer1;
        rs[1] = relayer2;
    }

    function _gateways() internal view returns (InitialGateway[] memory gws) {
        gws = new InitialGateway[](2);
        gws[0] = InitialGateway({ id: "GW-1", key: address(0x1111), relayer: relayer1 });
        gws[1] = InitialGateway({ id: "GW-2", key: address(0x2222), relayer: relayer2 });
    }

    function _createFacility(address caller, string memory name)
        internal
        returns (address clone)
    {
        vm.prank(caller);
        clone = factory.createFacility(name, "Tunis", "Energy", _relayers(), _gateways(), new Document[](2));
    }
}