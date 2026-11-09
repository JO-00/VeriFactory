// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FacilityVisualizationTest is BaseSetup {
    FacilityRegistry internal f;

    function setUp() public override {
        super.setUp();
        f = FacilityRegistry(payable(_createFacility(admin, "F")));
    }

    function test_getAllRelayers() public view {
        address[] memory rs = f.getAllRelayers();
        assertEq(rs.length, 2);
        assertEq(rs[0], relayer1);
        assertEq(rs[1], relayer2);
    }

    function test_getAllGateways() public view {
        string[] memory gws = f.getAllGateways();
        assertEq(gws.length, 2);
        assertEq(gws[0], "GW-1");
        assertEq(gws[1], "GW-2");
    }

    function test_getRelayerGateways() public view {
        string[] memory rg = f.getRelayerGateways(relayer1);
        assertEq(rg.length, 1);
        assertEq(rg[0], "GW-1");
    }

    function test_getGatewayInfo() public view {
        Gateway memory g = f.getGatewayInfo("GW-1");
        assertEq(g.gatewayId, "GW-1");
        assertEq(g.managingRelayer, relayer1);
    }

    function test_getGatewayKey() public view {
        assertEq(f.getGatewayKey("GW-1"), address(0x1111));
    }
}