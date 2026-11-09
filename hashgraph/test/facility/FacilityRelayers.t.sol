// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FacilityRelayersTest is BaseSetup {
    FacilityRegistry internal f;

    function setUp() public override {
        super.setUp();
        f = FacilityRegistry(payable(_createFacility(admin, "F")));
    }

    function test_registerRelayer_admin() public {
        address r = address(0x1111);
        vm.prank(admin);
        f.registerRelayer(r);
        assertTrue(f.isRelayer(r));
        assertEq(f.getAllRelayers().length, 3); // 2 initial + 1
    }

    function test_registerRelayer_nonAdminReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        f.registerRelayer(address(0x1111));
    }

    function test_registerRelayer_duplicateReverts() public {
        vm.prank(admin);
        vm.expectRevert("Relayer already registered");
        f.registerRelayer(relayer1); // already in initial set
    }

    function test_removeRelayer_basic() public {
        vm.prank(admin);
        f.removeRelayer(relayer1);
        assertFalse(f.isRelayer(relayer1));
        assertEq(f.getAllRelayers().length, 1);
    }

    function test_removeRelayer_reindexMovedElement() public {
        // add a third so removing the first forces a swap
        address r3 = address(0x3333);
        vm.prank(admin);
        f.registerRelayer(r3);

        // relayers = [relayer1, relayer2, r3]
        vm.prank(admin);
        f.removeRelayer(relayer1); // moves r3 into index 0

        address[] memory rs = f.getAllRelayers();
        assertEq(rs.length, 2);
        // r3 must still be removable -> if index map wasn't reindexed, this reverts
        vm.prank(admin);
        f.removeRelayer(r3);
        assertEq(f.getAllRelayers().length, 1);
    }

    function test_removeRelayer_notFoundReverts() public {
        vm.prank(admin);
        vm.expectRevert();
        f.removeRelayer(address(0x9999));
    }
}