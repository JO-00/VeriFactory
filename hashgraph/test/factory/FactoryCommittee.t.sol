// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../shared/BaseSetup.sol";

contract FactoryCommitteeTest is BaseSetup {
    address internal clone;

    function setUp() public override {
        super.setUp();
        clone = _createFacility(admin, "F");
    }

    function test_becomeCandidate() public {
        string[] memory docs = new string[](1);
        docs[0] = "QmDOC";

        vm.prank(stranger);
        factory.become_candidate(docs);

        WrappedCandidate[] memory cs = factory.getCandidates();
        assertEq(cs.length, 1);
        assertEq(cs[0].candidate.wallet, stranger);
    }

    function test_becomeCandidate_duplicateReverts() public {
        string[] memory docs = new string[](0);
        vm.startPrank(stranger);
        factory.become_candidate(docs);
        vm.expectRevert("Already a candidate");
        factory.become_candidate(docs);
        vm.stopPrank();
    }

    function test_quitCandidateship() public {
        string[] memory docs = new string[](0);
        vm.startPrank(stranger);
        factory.become_candidate(docs);
        factory.quit_candidateship();
        vm.stopPrank();

        assertEq(factory.getCandidates().length, 0);
    }

    function test_quitCandidateship_swapAndPop() public {
        string[] memory docs = new string[](0);
        address a = address(0xA1);
        address b = address(0xB2);
        address c = address(0xC3);

        vm.prank(a); factory.become_candidate(docs);
        vm.prank(b); factory.become_candidate(docs);
        vm.prank(c); factory.become_candidate(docs);

        // remove middle (b) -> c moves into index 1
        vm.prank(b); factory.quit_candidateship();

        WrappedCandidate[] memory cs = factory.getCandidates();
        assertEq(cs.length, 2);
        assertEq(cs[0].candidate.wallet, a);
        assertEq(cs[1].candidate.wallet, c);

        // c must still be removable (index map fixed)
        vm.prank(c); factory.quit_candidateship();
        assertEq(factory.getCandidates().length, 1);
    }

    function test_setCommitteeMember_firstFee() public {
        vm.deal(admin, 1 ether);
        vm.prank(admin);
        factory.set_committee_member{value: 25_000_000}(stranger, clone);

        assertEq(factory.memberStake(stranger), 25_000_000);
        address[] memory members = factory.getFacilityCommitteeMembers(clone);
        assertEq(members.length, 1);
        assertEq(members[0], stranger);
    }

    function test_setCommitteeMember_secondFee() public {
        vm.deal(admin, 1 ether);
        address m2 = address(0xF00D);

        vm.startPrank(admin);
        factory.set_committee_member{value: 25_000_000}(stranger, clone);
        factory.set_committee_member{value: 100_000_000}(m2, clone);
        vm.stopPrank();

        assertEq(factory.getFacilityCommitteeMembers(clone).length, 2);
    }

    function test_setCommitteeMember_insufficientFeeReverts() public {
        vm.deal(admin, 1 ether);
        vm.prank(admin);
        vm.expectRevert("insufficient fee");
        factory.set_committee_member{value: 1}(stranger, clone);
    }

    function test_setCommitteeMember_maxThreeReverts() public {
        vm.deal(admin, 1 ether);
        address[4] memory ms = [address(0x1), address(0x2), address(0x3), address(0x4)];

        vm.startPrank(admin);
        factory.set_committee_member{value: 25_000_000}(ms[0], clone);
        factory.set_committee_member{value: 100_000_000}(ms[1], clone);
        factory.set_committee_member{value: 100_000_000}(ms[2], clone);
        vm.expectRevert("cannot add more members from your facility");
        factory.set_committee_member{value: 100_000_000}(ms[3], clone);
        vm.stopPrank();
    }

    function test_removeCommitteeMember_swapAndPop() public {
        vm.deal(admin, 1 ether);
        address a = address(0xA1);
        address b = address(0xB2);
        address c = address(0xC3);

        vm.startPrank(admin);
        factory.set_committee_member{value: 25_000_000}(a, clone);
        factory.set_committee_member{value: 100_000_000}(b, clone);
        factory.set_committee_member{value: 100_000_000}(c, clone);

        // remove b (middle) -> c should be moved, still removable
        factory.remove_committee_member(b, clone);

        address[] memory members = factory.getFacilityCommitteeMembers(clone);
        assertEq(members.length, 2);
        assertEq(members[0], a);
        assertEq(members[1], c);

        // c still removable -> proves DAOIndexPlusOne reindex worked
        factory.remove_committee_member(c, clone);
        vm.stopPrank();

        assertEq(factory.getFacilityCommitteeMembers(clone).length, 1);
    }

    function test_generateCommittee_tooEarlyReverts() public {
        vm.expectRevert("too early to generate committee");
        factory.generate_new_committee();
    }

    function test_generateCommittee_smallDAO() public {
        vm.deal(admin, 1 ether);
        vm.prank(admin);
        factory.set_committee_member{value: 25_000_000}(stranger, clone);

        vm.warp(block.timestamp + 4 weeks);
        factory.generate_new_committee();

        address[] memory cm = factory.getCurrentCommittee();
        assertEq(cm.length, 1);
        assertEq(cm[0], stranger);
    }

    function test_generateCommittee_largeDAO_skipped() public {
        vm.skip(true); // RandomPicker (Hedera HIP-351) unavailable in forge
    }
}