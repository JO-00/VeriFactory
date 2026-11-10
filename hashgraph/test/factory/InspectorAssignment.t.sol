// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";
import {Inspector, CandidateVotes} from "../../src/data_structs.sol";

contract InspectorAssignmentTest is BaseSetup {
    address internal facA;
    address internal facB;
    address internal facC;

    uint256 internal constant C1_PK = 0xA11CE1;
    uint256 internal constant C2_PK = 0xA11CE2;
    uint256 internal constant C3_PK = 0xA11CE3;
    uint256 internal constant C4_PK = 0xA11CE4;
    uint256 internal constant C5_PK = 0xA11CE5;
    address internal c1;
    address internal c2;
    address internal c3;
    address internal c4;
    address internal c5;

    address internal v1 = address(0x1001);
    address internal v2 = address(0x1002);
    address internal v3 = address(0x1003);

    function setUp() public override {
        super.setUp();
        facA = _createFacility(admin, "A");
        facB = _createFacility(admin, "B");
        facC = _createFacility(admin, "C");
        vm.deal(admin, 20 ether);

        string[] memory noDocs = new string[](0);
        c1 = vm.addr(C1_PK);
        c2 = vm.addr(C2_PK);
        c3 = vm.addr(C3_PK);
        c4 = vm.addr(C4_PK);
        c5 = vm.addr(C5_PK);
        address[5] memory cs = [c1, c2, c3, c4, c5];
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(cs[i]);
            committee.become_candidate(noDocs);
        }

        _signInspectorContract(c1, C1_PK);
        _signInspectorContract(c2, C2_PK);
        _signInspectorContract(c3, C3_PK);
        _signInspectorContract(c4, C4_PK);
        _signInspectorContract(c5, C5_PK);

        vm.startPrank(admin);
        committee.set_committee_member{value: 25_000_000}(v1, facA);
        committee.set_committee_member{value: 25_000_000}(v2, facB);
        committee.set_committee_member{value: 25_000_000}(v3, facC);
        vm.stopPrank();

        vm.warp(block.timestamp + 4 weeks);
        committee.generate_new_committee();
    }

    function _rank(address voter, address[] memory prefs) internal {
        vm.prank(voter);
        committee.rank_candidates(prefs);
    }

    function _p1(address a) internal pure returns (address[] memory p) {
        p = new address[](1); p[0] = a;
    }

    function test_assign_inspectors_MapsEachFacility() public {
        _rank(v1, _p1(c1));
        assertTrue(viz.votes_frozen());

        Inspector memory iA = viz.getFacilityInspector(facA);
        Inspector memory iB = viz.getFacilityInspector(facB);
        Inspector memory iC = viz.getFacilityInspector(facC);

        assertEq(iA.wallet, c1, "facA (index 0) -> inspectors[0]");
        assertEq(iB.wallet, address(0), "facB (index 1) -> inspectors[1] = empty");
        assertEq(iC.wallet, address(0), "facC (index 2) -> inspectors[2] = empty");
    }

    function test_assign_inspectors_InspectorToFacilities_Accumulates() public {
        vm.skip(true);
    }

    function test_assign_inspectors_fullTop5() public {
        address facD = _createFacility(admin, "D");
        address c6 = address(0xC6);

        string[] memory noDocs = new string[](0);
        vm.prank(c6);
        committee.become_candidate(noDocs);

        address v4 = address(0x1004);
        address v5 = address(0x1005);
        vm.startPrank(admin);
        committee.set_committee_member{value: 25_000_000}(v4, facD);
        committee.set_committee_member{value: 100_000_000}(v5, facD);
        vm.stopPrank();

        vm.warp(viz.latest_committee_generation_timestamp() + 4 weeks);
        committee.generate_new_committee();
        assertEq(viz.getCurrentCommittee().length, 5);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));
        _rank(v3, _p1(c3));
        assertFalse(viz.votes_frozen());

        vm.warp(block.timestamp + 2 days + 1);
        _rank(v4, _p1(c4));
        assertTrue(viz.votes_frozen());

        Inspector memory iD = viz.getFacilityInspector(facD);
        assertEq(iD.wallet, c4, "facD (index 3) -> inspectors[3] = c4");

        address[] memory c1facs = viz.getInspectorFacilities(c1);
        assertEq(c1facs.length, 1);
        assertEq(c1facs[0], facA);
    }

    function test_clearCommittee_PreviousRoundAssignmentDoesNotLeakIntoNextRound() public {
        _rank(v1, _p1(c1));
        assertTrue(viz.votes_frozen());
        assertEq(viz.getFacilityInspector(facA).wallet, c1);
        assertEq(viz.getFacilityInspector(facB).wallet, address(0));

        vm.warp(viz.latest_committee_generation_timestamp() + 4 weeks);
        committee.generate_new_committee();

        _rank(v2, _p1(c2));
        assertTrue(viz.votes_frozen());

        assertEq(viz.getFacilityInspector(facA).wallet, c2, "facA leaked round 1 inspector");

        address[] memory c1facs = viz.getInspectorFacilities(c1);
        assertEq(c1facs.length, 0, "inspector_to_facilities[c1] leaked round 1");
    }
}