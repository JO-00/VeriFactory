// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FactoryVisualizationTest is BaseSetup {
    function test_getters_emptyState() public view {
        assertEq(factory.getFacilityCount(), 0);
        assertEq(factory.getDeployedFacilities().length, 0);
        assertEq(factory.getCurrentCommittee().length, 0);
        assertEq(factory.getDAO().length, 0);
        assertEq(factory.getCandidates().length, 0);
    }

    function test_getters_afterCreate() public {
        address clone = _createFacility(admin, "F");
        assertEq(factory.getFacilityCount(), 1);
        assertEq(factory.getDeployedFacilities()[0], clone);
        assertEq(factory.getFacilityGlobalInfo(clone).facilityAddress, clone);
    }

    function test_view_staked_members() public {
        vm.deal(admin, 1 ether);
        address clone = _createFacility(admin, "F");
        vm.prank(admin);
        factory.set_committee_member{value: 25_000_000}(stranger, clone);

        StakedMember[] memory sm = factory.view_staked_members(clone);
        assertEq(sm.length, 1);
        assertEq(sm[0].wallet, stranger);
        assertEq(sm[0].amount, 25_000_000);
    }
}