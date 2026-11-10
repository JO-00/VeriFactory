// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FactoryVisualizationTest is BaseSetup {
    function test_getters_emptyState() public view {
        assertEq(viz.getFacilityCount(), 0);
        assertEq(viz.getDeployedFacilities().length, 0);
        assertEq(viz.getCurrentCommittee().length, 0);
        assertEq(viz.getDAO().length, 0);
        assertEq(viz.getCandidates().length, 0);
    }

    function test_getters_afterCreate() public {
        address clone = _createFacility(admin, "F");
        assertEq(viz.getFacilityCount(), 1);
        assertEq(viz.getDeployedFacilities()[0], clone);
        assertEq(viz.getFacilityGlobalInfo(clone).facilityAddress, clone);
    }

    function test_view_staked_members() public {
        vm.deal(admin, 1 ether);
        address clone = _createFacility(admin, "F");
        vm.prank(admin);
        committee.set_committee_member{value: 25_000_000}(stranger, clone);

        StakedMember[] memory sm = viz.view_staked_members(clone);
        assertEq(sm.length, 1);
        assertEq(sm[0].wallet, stranger);
        assertEq(sm[0].amount, 25_000_000);
    }
}