// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";
import {FacilityAdded} from "./../../src/Events.sol";

contract FactoryCreateTest is BaseSetup {

    function test_createFacility_happyPath() public {
        address clone = _createFacility(admin, "Facility A");

        assertEq(FacilityRegistry(payable(clone)).admin(), admin);
        assertEq(FacilityRegistry(payable(clone)).facilityName(), "Facility A");
        assertEq(factory.getFacilityCount(), 1);
        assertEq(factory.deployedFacilities(0), clone);

        FacilityMeta memory meta = factory.getFacilityGlobalInfo(clone);
        assertEq(meta.facilityAddress, clone);
        assertEq(meta.name, "Facility A");
        assertEq(meta.location, "Tunis");
        assertEq(meta.sectorType, "Energy");
        assertTrue(meta.isActive);
        assertGt(meta.createdAt, 0);
    }

    function test_createFacility_registersRelayers() public {
        address clone = _createFacility(admin, "F");
        address[] memory rs = FacilityRegistry(payable(clone)).getAllRelayers();
        assertEq(rs.length, 2);
        assertEq(rs[0], relayer1);
        assertEq(rs[1], relayer2);
    }

    function test_createFacility_noDuplicateGateways() public {
        address clone = _createFacility(admin, "F");
        string[] memory gws = FacilityRegistry(payable(clone)).getAllGateways();
        assertEq(gws.length, 2, "double-push would make this 4");
        assertEq(gws[0], "GW-1");
        assertEq(gws[1], "GW-2");
    }

    function test_createFacility_revertsOnZeroRelayer() public {
        InitialGateway[] memory gws = new InitialGateway[](1);
        gws[0] = InitialGateway({ id: "GW-X", key: address(0x1), relayer: address(0) });

        vm.prank(admin);
        vm.expectRevert("Gateway relayer not specified");
        factory.createFacility("F", "T", "E", _relayers(), gws, new Document[](2));
    }


    function test_createFacility_multipleIndependent() public {
        address c1 = _createFacility(admin, "A");
        address c2 = _createFacility(stranger, "B");

        assertTrue(c1 != c2);
        assertEq(factory.getFacilityCount(), 2);
        assertEq(FacilityRegistry(payable(c1)).admin(), admin);
        assertEq(FacilityRegistry(payable(c2)).admin(), stranger);
        assertEq(FacilityRegistry(payable(c1)).facilityName(), "A");
        assertEq(FacilityRegistry(payable(c2)).facilityName(), "B");
    }
}