// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FacilityKeysTest is BaseSetup {
    FacilityRegistry internal f;

    function setUp() public override {
        super.setUp();
        f = FacilityRegistry(payable(_createFacility(admin, "F")));
    }

    function test_rotateKey_admin() public {
        address newKey = address(0xABCD);
        vm.prank(admin);
        f.rotateKey("GW-1", newKey);

        assertEq(f.getGatewayKey("GW-1"), newKey);
        Gateway memory g = f.getGatewayInfo("GW-1");
        assertEq(g.activeKey, newKey);
    }

    function test_rotateKey_nonAdminReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        f.rotateKey("GW-1", address(0xABCD));
    }

    function test_rotateKey_unknownGatewayReverts() public {
        vm.prank(admin);
        vm.expectRevert();
        f.rotateKey("GW-NOPE", address(0xABCD));
    }
}