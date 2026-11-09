// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FacilityAccessTest is BaseSetup {
    FacilityRegistry internal f;

    function setUp() public override {
        super.setUp();
        f = FacilityRegistry(payable(_createFacility(admin, "F")));
    }

    function test_adminHasAdminRole() public view {
        assertTrue(f.hasRole(ADMIN_ROLE, admin));
    }

    function test_grantAccountRole_admin() public {
        vm.prank(admin);
        f.grantAccountRole(ADMIN_ROLE, stranger);
        assertTrue(f.hasRole(ADMIN_ROLE, stranger));
    }

    function test_grantAccountRole_nonAdminReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        f.grantAccountRole(ADMIN_ROLE, stranger);
    }

    function test_revokeAccountRole() public {
        vm.startPrank(admin);
        f.grantAccountRole(ADMIN_ROLE, stranger);
        f.revokeAccountRole(ADMIN_ROLE, stranger);
        vm.stopPrank();
        assertFalse(f.hasRole(ADMIN_ROLE, stranger));
    }

    function test_emergencyOverride_toggle() public {
        assertFalse(f.emergencyOverride());
        vm.prank(admin);
        f.EnableEmergencyOverride();
        assertTrue(f.emergencyOverride());

        vm.prank(admin);
        f.DisableEmergencyOverride();
        assertFalse(f.emergencyOverride());
    }

    function test_emergencyOverride_nonAdminReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        f.EnableEmergencyOverride();
    }
}