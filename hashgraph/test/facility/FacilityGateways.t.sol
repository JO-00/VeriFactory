// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FacilityGatewaysTest is BaseSetup {
    FacilityRegistry internal f;

    function setUp() public override {
        super.setUp();
        f = FacilityRegistry(payable(_createFacility(admin, "F")));
    }

    function test_assignGateway_admin() public {
        vm.prank(admin);
        f.assignGatewayToRelayer("GW-NEW", address(0x9999), relayer1);

        Gateway memory g = f.getGatewayInfo("GW-NEW");
        assertEq(g.gatewayId, "GW-NEW");
        assertEq(g.activeKey, address(0x9999));
        assertEq(g.managingRelayer, relayer1);
        assertTrue(g.isActive);
    }

    function test_assignGateway_nonAdminReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        f.assignGatewayToRelayer("GW-NEW", address(0x9999), relayer1);
    }

    function test_assignGateway_duplicateReverts() public {
        vm.prank(admin);
        vm.expectRevert("Gateway already exists");
        f.assignGatewayToRelayer("GW-1", address(0x9999), relayer1);
    }

    function test_assignGateway_unknownRelayerReverts() public {
        vm.prank(admin);
        vm.expectRevert("Target address is not an authorized Relayer");
        f.assignGatewayToRelayer("GW-NEW", address(0x9999), stranger);
    }

    function test_banGateway_removesFromGatewayIds() public {
        vm.prank(admin);
        f.banGateway("GW-1");

        string[] memory gws = f.getAllGateways();
        assertEq(gws.length, 1);
        assertEq(gws[0], "GW-2");
    }

    function test_banGateway_removesFromRelayerGateways() public {
        vm.prank(admin);
        f.banGateway("GW-1");

        string[] memory rg = f.getRelayerGateways(relayer1);
        for (uint256 i = 0; i < rg.length; i++) {
            assertTrue(keccak256(bytes(rg[i])) != keccak256(bytes("GW-1")), "GW-1 still in relayerGateways");
        }
    }

    function test_banGateway_nonAdminNonRelayerReverts() public {
        vm.prank(stranger);
        vm.expectRevert("You have no authority to ban this gateway");
        f.banGateway("GW-1");
    }

    function test_banGateway_byManagingRelayer() public {
        vm.prank(relayer1); // relayer1 manages GW-1
        f.banGateway("GW-1");
        assertEq(f.getAllGateways().length, 1);
    }

    function test_setGatewayPolicy() public {
        vm.prank(admin);
        f.setGatewayPolicy("GW-1", 100, 10);

        CadencePolicy memory p = f.getGatewayPolicy("GW-1");
        assertEq(p.expectedInterval, 100);
        assertEq(p.gracePeriod, 10);
    }
}