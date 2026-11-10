// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";
import {CandidateVotes, Inspector} from "../../src/data_structs.sol";

contract RankCandidatesTest is BaseSetup {
    address internal facA;
    address internal facB;

    uint256 internal C1_PK = 0xACEC1;
    uint256 internal C2_PK = 0xACEC2;
    uint256 internal C3_PK = 0xACEC3;
    uint256 internal C4_PK = 0xACEC4;
    uint256 internal C5_PK = 0xACEC5;
    uint256 internal C6_PK = 0xACEC6;
    address internal c1 = vm.addr(C1_PK);
    address internal c2 = vm.addr(C2_PK);
    address internal c3 = vm.addr(C3_PK);
    address internal c4 = vm.addr(C4_PK);
    address internal c5 = vm.addr(C5_PK);
    address internal c6 = vm.addr(C6_PK);

    address internal v1 = address(0x1001);
    address internal v2 = address(0x1002);
    address internal v3 = address(0x1003);
    address internal v4 = address(0x1004);
    address internal v5 = address(0x1005);

    function setUp() public override {
        super.setUp();
        vm.deal(admin, 20 ether);

        string[] memory noDocs = new string[](0);
        address[6] memory cs = [c1, c2, c3, c4, c5, c6];
        for (uint256 i = 0; i < 6; i++) {
            vm.prank(cs[i]);
            committee.become_candidate(noDocs);
        }

        _signInspectorContract(c1, C1_PK);
        _signInspectorContract(c2, C2_PK);
        _signInspectorContract(c3, C3_PK);
        _signInspectorContract(c4, C4_PK);
        _signInspectorContract(c5, C5_PK);
        _signInspectorContract(c6, C6_PK);

        facA = _createFacility(admin, "A");
        facB = _createFacility(admin, "B");

        vm.startPrank(admin);
        committee.set_committee_member{value: 25_000_000}(v1, facA);
        committee.set_committee_member{value: 100_000_000}(v2, facA);
        committee.set_committee_member{value: 100_000_000}(v3, facA);
        committee.set_committee_member{value: 25_000_000}(v4, facB);
        committee.set_committee_member{value: 100_000_000}(v5, facB);
        vm.stopPrank();

        vm.warp(block.timestamp + 4 weeks);
        committee.generate_new_committee();

        assertEq(viz.getDAO().length, 5);
        assertEq(viz.getCurrentCommittee().length, 5);
    }

    function _p1(address a) internal pure returns (address[] memory p) {
        p = new address[](1); p[0] = a;
    }
    function _p2(address a, address b) internal pure returns (address[] memory p) {
        p = new address[](2); p[0] = a; p[1] = b;
    }
    function _p5(address a, address b, address c, address d, address e)
        internal pure returns (address[] memory p)
    {
        p = new address[](5); p[0]=a; p[1]=b; p[2]=c; p[3]=d; p[4]=e;
    }

    function _top6() internal view returns (CandidateVotes[] memory) {
        return viz.get_top_6_votes();
    }

    function _rank(address voter, address[] memory prefs) internal {
        vm.prank(voter);
        committee.rank_candidates(prefs);
    }

    function test_initialTop6_AllZero() public view {
        CandidateVotes[] memory t = _top6();
        assertEq(t.length, 6);
        for (uint256 i = 0; i < 6; i++) {
            assertEq(t[i].wallet, address(0));
            assertEq(t[i].votes, 0);
        }
    }

    function test_initialVotesNotFrozen() public view {
        assertFalse(viz.votes_frozen());
    }

    function test_rank_singlePreference_InsertsAtSlot0() public {
        _rank(v1, _p1(c1));
        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c1);
        assertEq(t[0].votes, 5);
        assertEq(t[1].wallet, address(0));
    }

    function test_rank_twoPreferences_DescendingOrder() public {
        _rank(v1, _p2(c1, c2));
        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c1); assertEq(t[0].votes, 5);
        assertEq(t[1].wallet, c2); assertEq(t[1].votes, 4);
        assertEq(t[2].wallet, address(0));
    }

    function test_rank_fillAllSixSlots() public {
        _rank(v1, _p5(c1, c2, c3, c4, c5));
        _rank(v2, _p1(c6));

        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c1); assertEq(t[0].votes, 5);
        assertEq(t[1].wallet, c6); assertEq(t[1].votes, 5);
        assertEq(t[2].wallet, c2); assertEq(t[2].votes, 4);
        assertEq(t[3].wallet, c3); assertEq(t[3].votes, 3);
        assertEq(t[4].wallet, c4); assertEq(t[4].votes, 2);
        assertEq(t[5].wallet, c5); assertEq(t[5].votes, 1);
    }

    function test_rank_overtake_ShiftsIncumbentDown() public {
        _rank(v1, _p2(c1, c2));
        _rank(v2, _p1(c2));

        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c2); assertEq(t[0].votes, 9);
        assertEq(t[1].wallet, c1); assertEq(t[1].votes, 5);
    }

    function test_rank_sameCandidateAcrossVoters_Accumulates() public {
        _rank(v1, _p1(c1));
        _rank(v2, _p1(c1));

        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c1);
        assertEq(t[0].votes, 10);
    }

    function test_rank_candidateMovesDown_WhenOthersAccumulate() public {
        _rank(v1, _p2(c1, c2));
        _rank(v2, _p1(c2));
        _rank(v3, _p2(c1, c2));

        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c2); assertEq(t[0].votes, 13);
        assertEq(t[1].wallet, c1); assertEq(t[1].votes, 10);
    }

    function test_rank_tie_incumbentKeepsSlot() public {
        _rank(v1, _p1(c1));
        _rank(v2, _p1(c2));

        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c1);
        assertEq(t[1].wallet, c2);
    }

    function test_rank_zeroVoteCandidate_NotInserted() public {
        _rank(v1, _p1(c1));
        CandidateVotes[] memory t = _top6();
        for (uint256 i = 0; i < 6; i++) {
            assertTrue(t[i].wallet != c6);
        }
    }

    function test_rank_duplicateInRanking_Reverts() public {
        address[] memory p = new address[](2);
        p[0] = c1; p[1] = c1;

        vm.prank(v1);
        vm.expectRevert("duplicate address not allowed");
        committee.rank_candidates(p);
    }

    function test_rank_nonCandidate_Reverts() public {
        vm.prank(v1);
        vm.expectRevert("not a candidate");
        committee.rank_candidates(_p1(stranger));
    }

    function test_rank_addressZero_BreaksAndIgnoresRest() public {
        address[] memory p = new address[](3);
        p[0] = c1; p[1] = address(0); p[2] = c2;

        _rank(v1, p);

        CandidateVotes[] memory t = _top6();
        assertEq(t[0].wallet, c1); assertEq(t[0].votes, 5);
        for (uint256 i = 0; i < 6; i++) {
            assertTrue(t[i].wallet != c2);
        }
    }

    function test_rank_capsAtFivePreferences() public {
        address[] memory p = new address[](7);
        p[0]=c1; p[1]=c2; p[2]=c3; p[3]=c4; p[4]=c5; p[5]=c6; p[6]=stranger;

        _rank(v1, p);

        CandidateVotes[] memory t = _top6();
        for (uint256 i = 0; i < 6; i++) {
            assertTrue(t[i].wallet != c6);
        }
    }

    function test_rank_doubleVote_Reverts() public {
        _rank(v1, _p1(c1));
        vm.prank(v1);
        vm.expectRevert("You have already voted");
        committee.rank_candidates(_p1(c2));
    }

    function test_rank_nonCommitteeMember_Reverts() public {
        vm.prank(stranger);
        vm.expectRevert("not a committee member");
        committee.rank_candidates(_p1(c1));
    }

    function test_getCurrentInspectors_RevertsBeforeFreeze() public {
        vm.expectRevert("votes are not frozen yet");
        committee.getCurrentInspectors();
    }

    function test_getCurrentInspectors_ReturnsTop5AfterFreeze() public {
        _rank(v1, _p5(c1, c2, c3, c4, c5));
        _rank(v2, _p5(c6, c5, c4, c3, c2));
        vm.warp(block.timestamp + 2 days + 1);
        _rank(v3, _p1(c1));
        assertTrue(viz.votes_frozen());

        Inspector[5] memory w = committee.getCurrentInspectors();
        CandidateVotes[] memory t = _top6();
        for (uint256 i = 0; i < 5; i++) {
            assertEq(w[i].wallet, t[i].wallet);
        }
    }

    /// @notice Documents that quit_candidateship leaves a stale top6 entry
    ///         (unless quit_candidateship also calls _refreshTop6 / zeroes the slot).
    function test_KNOWN_BUG_quitCandidateship_LeavesStaleTop6Entry() public {
        _rank(v1, _p2(c1, c2));
        CandidateVotes[] memory before = _top6();
        assertEq(before[0].wallet, c1);

        vm.prank(c1);
        committee.quit_candidateship();

        CandidateVotes[] memory afterQ = _top6();
        assertEq(afterQ[0].wallet, c1, "KNOWN BUG: stale entry after quit");
    }
}