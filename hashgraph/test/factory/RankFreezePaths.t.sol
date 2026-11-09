// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";
import {CandidateVotes} from "../../src/data_structs.sol";

contract RankFreezePathsTest is BaseSetup {
    address internal facA;
    address internal facB;

    address internal c1 = address(0xC1);
    address internal c2 = address(0xC2);
    address internal c3 = address(0xC3);
    address internal c4 = address(0xC4);
    address internal c5 = address(0xC5);
    address internal c6 = address(0xC6);

    address internal v1 = address(0x1001);
    address internal v2 = address(0x1002);
    address internal v3 = address(0x1003);
    address internal v4 = address(0x1004);
    address internal v5 = address(0x1005);

    function _stakeFive() internal {
        facA = _createFacility(admin, "A");
        facB = _createFacility(admin, "B");
        vm.deal(admin, 20 ether);

        vm.startPrank(admin);
        factory.set_committee_member{value: 25_000_000}(v1, facA);
        factory.set_committee_member{value: 100_000_000}(v2, facA);
        factory.set_committee_member{value: 100_000_000}(v3, facA);
        factory.set_committee_member{value: 25_000_000}(v4, facB);
        factory.set_committee_member{value: 100_000_000}(v5, facB);
        vm.stopPrank();

        vm.warp(block.timestamp + 4 weeks);
        factory.generate_new_committee();
        assertEq(factory.getCurrentCommittee().length, 5);
    }

    function _regCandidates(uint256 count) internal {
        string[] memory noDocs = new string[](0);
        address[6] memory cs = [c1, c2, c3, c4, c5, c6];
        for (uint256 i = 0; i < count; i++) {
            vm.prank(cs[i]);
            factory.become_candidate(noDocs);
        }
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
        factory.rank_candidates(prefs);
    }

    // ---------- path 1 ----------

    function test_freeze_path1_candidatesLeq5_OneVote() public {
        _stakeFive();
        _regCandidates(5);

        assertFalse(factory.votes_frozen());
        _rank(v1, _p1(c1));
        assertTrue(factory.votes_frozen());
    }

    // ---------- path 2 ----------

    function test_freeze_path2_gapAndFourVoters() public {
        _stakeFive();
        _regCandidates(6);

        _rank(v1, _p5(c1, c2, c3, c4, c5));
        _rank(v2, _p5(c1, c2, c3, c4, c5));
        _rank(v3, _p5(c1, c2, c3, c4, c5));
        assertFalse(factory.votes_frozen());

        _rank(v4, _p5(c5, c1, c2, c3, c4));

        CandidateVotes[] memory t = factory.get_top_6_votes();
        assertEq(t[4].votes, 7);
        assertEq(t[5].votes, 0);
        assertTrue(t[4].votes - t[5].votes >= 5);
        assertEq(factory.get_number_of_voters(), 4);
        assertTrue(factory.votes_frozen());
    }

    // ---------- path 3 ----------

    function test_freeze_path3_threeVotersTwoDays() public {
        _stakeFive();
        _regCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));

        vm.warp(block.timestamp + 2 days + 1);
        _rank(v3, _p1(c3));

        assertTrue(factory.votes_frozen());
    }

    function test_freeze_path3_notFrozenIfLessThan2Days() public {
        _stakeFive();
        _regCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));

        vm.warp(block.timestamp + 2 days - 1);
        _rank(v3, _p1(c3));

        assertFalse(factory.votes_frozen());
    }

    // ---------- freeze persistence ----------

    function test_frozen_blocksFurtherVoting() public {
        _stakeFive();
        _regCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));
        vm.warp(block.timestamp + 2 days + 1);
        _rank(v3, _p1(c3));
        assertTrue(factory.votes_frozen());

        CandidateVotes[] memory before = factory.get_top_6_votes();

        vm.prank(v4);
        vm.expectRevert("votes are already frozen");
        factory.rank_candidates(_p1(c4));

        CandidateVotes[] memory afterFrozen = factory.get_top_6_votes();
        for (uint256 i = 0; i < 6; i++) {
            assertEq(afterFrozen[i].wallet, before[i].wallet);
            assertEq(afterFrozen[i].votes, before[i].votes);
        }
    }

    // ---------- cooldown boundary ----------

    function test_generateCommittee_respectsCooldown() public {
        _stakeFive();
        _regCandidates(6);
        uint256 t0 = block.timestamp; // time of first generate_new_committee()

        vm.expectRevert("too early to generate committee");
        factory.generate_new_committee();

        vm.warp(t0 + 4 weeks - 1);
        vm.expectRevert("too early to generate committee");
        factory.generate_new_committee();

        vm.warp(t0 + 4 weeks);
        factory.generate_new_committee();
        assertEq(factory.latest_committee_generation_timestamp(), t0 + 4 weeks);
    }

    // ---------- round reset: everything cleared ----------

    function test_generateCommittee_CleansRoundState() public {
        _stakeFive();
        _regCandidates(6);

        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));
        vm.warp(block.timestamp + 2 days + 1);
        _rank(v3, _p1(c3));
        assertTrue(factory.votes_frozen());
        assertEq(factory.get_number_of_voters(), 3);

        vm.warp(factory.latest_committee_generation_timestamp() + 4 weeks);
        factory.generate_new_committee();

        // round state cleared
        assertFalse(factory.votes_frozen(), "votes_frozen must reset");
        assertEq(factory.get_number_of_voters(), 0, "voters must clear");
        assertEq(factory.getCurrentCommittee().length, 5, "new committee picked");

        // top_6_votes cleared
        CandidateVotes[] memory t = factory.get_top_6_votes();
        for (uint256 i = 0; i < 6; i++) {
            assertEq(t[i].wallet, address(0), "top6 wallet must clear");
            assertEq(t[i].votes, 0, "top6 vote must clear");
        }

        // hasVoted cleared -> v1 can vote again, candidate_votes cleared (fresh tally)
        vm.prank(v1);
        factory.rank_candidates(_p1(c1));

        t = factory.get_top_6_votes();
        assertEq(t[0].wallet, c1);
        assertEq(t[0].votes, 5, "candidate_votes must have been cleared");
    }

    // ---------- candidate registry preserved across rounds ----------

    function test_generateCommittee_PreservesCandidateRegistry() public {
        _stakeFive();
        _regCandidates(6);

        uint256 before = factory.getCandidates().length;

        vm.warp(factory.latest_committee_generation_timestamp() + 4 weeks);
        factory.generate_new_committee();

        assertEq(factory.getCandidates().length, before, "candidates must persist");
    }
}