// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";
import {CandidateVotes} from "../../src/data_structs.sol";

contract RankFreezePathsTest is BaseSetup {
    address internal facA;
    address internal facB;

    address internal v1 = address(0x1001);
    address internal v2 = address(0x1002);
    address internal v3 = address(0x1003);
    address internal v4 = address(0x1004);
    address internal v5 = address(0x1005);

    uint256 internal C1_PK = 0xACEC1;
    uint256 internal C2_PK = 0xACEC2;
    uint256 internal C3_PK = 0xACEC3;
    uint256 internal C4_PK = 0xACEC4;
    uint256 internal C5_PK = 0xACEC5;
    uint256 internal C6_PK = 0xACEC6;

    address internal c1;
    address internal c2;
    address internal c3;
    address internal c4;
    address internal c5;
    address internal c6;

    function setUp() public override {
        super.setUp();

        c1 = vm.addr(C1_PK);
        c2 = vm.addr(C2_PK);
        c3 = vm.addr(C3_PK);
        c4 = vm.addr(C4_PK);
        c5 = vm.addr(C5_PK);
        c6 = vm.addr(C6_PK);

        _stakeFive();
    }

    function _registerCandidates(uint256 n) internal {
        require(n <= 6, "only 6 candidates available");

        uint256[6] memory keys = [C1_PK, C2_PK, C3_PK, C4_PK, C5_PK, C6_PK];
        address[6] memory addrs = [c1, c2, c3, c4, c5, c6];

        for (uint256 i = 0; i < n; i++) {
            vm.prank(addrs[i]);
            committee.become_candidate(new string[](2));
            _signInspectorContract(addrs[i], keys[i]);
        }
    }

    function _stakeFive() internal {
        facA = _createFacility(admin, "A");
        facB = _createFacility(admin, "B");
        vm.deal(admin, 20 ether);

        vm.startPrank(admin);
        committee.set_committee_member{value: 25_000_000}(v1, facA);
        committee.set_committee_member{value: 100_000_000}(v2, facA);
        committee.set_committee_member{value: 100_000_000}(v3, facA);
        committee.set_committee_member{value: 25_000_000}(v4, facB);
        committee.set_committee_member{value: 100_000_000}(v5, facB);
        vm.stopPrank();

        vm.warp(block.timestamp + 4 weeks);
        committee.generate_new_committee();
        assertEq(viz.getCurrentCommittee().length, 5);
    }

    function _p5(address a, address b, address c, address d, address e)
        internal pure returns (address[] memory p)
    {
        p = new address[](5); p[0]=a; p[1]=b; p[2]=c; p[3]=d; p[4]=e;
    }
    function _p1(address a) internal pure returns (address[] memory p) {
        p = new address[](1); p[0] = a;
    }

    function _rank(address voter, address[] memory prefs) internal {
        vm.prank(voter);
        committee.rank_candidates(prefs);
    }

    // ---------- path 1: candidates.length <= 5 ----------

    function test_freeze_path1_candidatesLeq5_OneVote() public {
        _registerCandidates(5);

        assertFalse(viz.votes_frozen());
        _rank(v1, _p1(c1));
        assertTrue(viz.votes_frozen());
    }

    // ---------- path 2: gap >= 5 && voters >= 4 ----------

    function test_freeze_path2_gapAndFourVoters() public {
        _registerCandidates(6);

        _rank(v1, _p5(c1, c2, c3, c4, c5));
        _rank(v2, _p5(c1, c2, c3, c4, c5));
        _rank(v3, _p5(c1, c2, c3, c4, c5));
        assertFalse(viz.votes_frozen());

        _rank(v4, _p5(c5, c1, c2, c3, c4));

        CandidateVotes[] memory t = viz.get_top_6_votes();
        assertEq(t[4].votes, 7);
        assertEq(t[5].votes, 0);
        assertTrue(t[4].votes - t[5].votes >= 5);
        assertEq(viz.get_number_of_voters(), 4);
        assertTrue(viz.votes_frozen());
    }

    // ---------- path 3: voters >= 3 && 2 days ----------

    function test_freeze_path3_threeVotersTwoDays() public {
        _registerCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));

        vm.warp(block.timestamp + 2 days + 1);
        _rank(v3, _p1(c3));

        assertTrue(viz.votes_frozen());
    }

    function test_freeze_path3_notFrozenIfLessThan2Days() public {
        _registerCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));

        vm.warp(block.timestamp + 2 days - 1);
        _rank(v3, _p1(c3));

        assertFalse(viz.votes_frozen());
    }

    // ---------- freeze persistence ----------

    function test_frozen_blocksFurtherVoting() public {
        _registerCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));
        vm.warp(block.timestamp + 2 days + 1);
        _rank(v3, _p1(c3));
        assertTrue(viz.votes_frozen());

        CandidateVotes[] memory before = viz.get_top_6_votes();

        vm.prank(v4);
        vm.expectRevert("votes are already frozen");
        committee.rank_candidates(_p1(c4));

        CandidateVotes[] memory afterFrozen = viz.get_top_6_votes();
        for (uint256 i = 0; i < 6; i++) {
            assertEq(afterFrozen[i].wallet, before[i].wallet);
            assertEq(afterFrozen[i].votes, before[i].votes);
        }
    }

    // ---------- cooldown boundary ----------

    function test_generateCommittee_respectsCooldown() public {
        _registerCandidates(6);
        uint256 t0 = block.timestamp;

        vm.expectRevert("too early to generate committee");
        committee.generate_new_committee();

        vm.warp(t0 + 4 weeks - 1);
        vm.expectRevert("too early to generate committee");
        committee.generate_new_committee();

        vm.warp(t0 + 4 weeks);
        committee.generate_new_committee();
        assertEq(viz.latest_committee_generation_timestamp(), t0 + 4 weeks);
    }

    // ---------- round reset: everything cleared ----------

    function test_generateCommittee_CleansRoundState() public {
        _registerCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));
        vm.warp(block.timestamp + 2 days + 1);
        _rank(v3, _p1(c3));
        assertTrue(viz.votes_frozen());
        assertEq(viz.get_number_of_voters(), 3);

        vm.warp(viz.latest_committee_generation_timestamp() + 4 weeks);
        committee.generate_new_committee();

        assertFalse(viz.votes_frozen(), "votes_frozen must reset");
        assertEq(viz.get_number_of_voters(), 0, "voters must clear");
        assertEq(viz.getCurrentCommittee().length, 5, "new committee picked");

        CandidateVotes[] memory t = viz.get_top_6_votes();
        for (uint256 i = 0; i < 6; i++) {
            assertEq(t[i].wallet, address(0), "top6 wallet must clear");
            assertEq(t[i].votes, 0, "top6 vote must clear");
        }

        vm.prank(v1);
        committee.rank_candidates(_p1(c1));

        t = viz.get_top_6_votes();
        assertEq(t[0].wallet, c1);
        assertEq(t[0].votes, 5, "candidate_votes must have been cleared");
    }

    // ---------- candidate registry preserved across rounds ----------

    function test_generateCommittee_PreservesCandidateRegistry() public {
        _registerCandidates(6);

        uint256 before = viz.getCandidates().length;

        vm.warp(viz.latest_committee_generation_timestamp() + 4 weeks);
        committee.generate_new_committee();

        assertEq(viz.getCandidates().length, before, "candidates must persist");
    }
}