// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FactoryStorage} from "./FactoryStorageBase.sol";
import {FactoryAuth} from "./FactoryAuth.sol";
import "../data_structs.sol";
import {RandomPicker} from "./../utils.sol";
import {ICommitteeInspector} from "./../interfaces/IFactory.sol";
import {NewCommittee, CommitteeVotesFrozen} from "./../Events.sol";
import {helpers} from "./../helpers.sol";

contract CommitteeInspector is FactoryAuth, ICommitteeInspector {

    // Weak PRNG fix: uses Hedera HIP-351 PRNG via RandomPicker (non-view now).
    function generate_new_committee() external {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        require(
            block.timestamp >= l.latest_committee_generation_timestamp + 4 weeks,
            "too early to generate committee"
        );

        clear_committee_votes();

        if (l.DAO.length <= 5) {
            l.current_committee = l.DAO;
        } else {
            l.current_committee = RandomPicker.pickRandom(l.DAO, 5);
        }

        l.latest_committee_generation_timestamp = block.timestamp;
        emit NewCommittee(block.timestamp);
    }

    function clear_committee_votes() internal {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        // Clear hasVoted for everyone who voted
        uint256 votersLen = l.voters.length;
        for (uint256 i = 0; i < votersLen; i++) {
            delete l.hasVoted[l.voters[i]];
        }
        delete l.voters;
        l.votes_frozen = false;

        // Clear candidate vote tallies
        uint256 candLen = l.candidates.length;
        for (uint256 i = 0; i < candLen; i++) {
            delete l.candidate_votes[l.candidates[i].wallet];
            delete l.inspector_to_facilities[l.candidates[i].wallet];
        }
        for (uint8 i = 0 ; i < l.top_6_votes.length ; i++){
            delete l.top_6_votes[i];
        }
        for (uint256 i = 0 ; i < l.deployedFacilities.length ; i ++){
            delete l.facility_to_inspector[l.deployedFacilities[i]];
        }
    }

    // ------------------------------------------------------------------
    // Ranking
    // ------------------------------------------------------------------

    function _refreshTop6(address who) internal {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        helpers._removeFromTop6(who, l.top_6_votes);
        helpers._insertIntoTop6(who, l.candidate_votes[who], l.top_6_votes);
    }

    function rank_candidates(address[] calldata preferences)
        external
        isCommitteeMember(msg.sender)
    {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        require(!l.votes_frozen, "votes are already frozen");
        require(!l.hasVoted[msg.sender], "You have already voted");
        l.hasVoted[msg.sender] = true;
        l.voters.push(msg.sender);

        uint256 n = preferences.length < 5 ? preferences.length : 5;

        for (uint256 i = 0; i < n; i++) {
            address c = preferences[i];
            if (c == address(0)) break;
            require(l.candidateIndexPlusOne[c] != 0, "not a candidate");
            require(l.CandidateIsCompliant[c], "the candidate you chose isn't compliant");

            for (uint256 j = 0; j < i; j++) {
                if (preferences[j] == c) revert("duplicate address not allowed");
            }

            l.candidate_votes[c] += 5 - i;

            _refreshTop6(c);   // <-- slide / insert / drop as needed
        }
        if (!l.votes_frozen){

            if (
                    (l.candidates.length <= 5) ||
                    (l.top_6_votes[4].votes - l.top_6_votes[5].votes >= 5 && l.voters.length >= 4) ||
                    (l.voters.length >= 3 && block.timestamp - l.latest_committee_generation_timestamp >= 2 days)
                ) {
                    l.votes_frozen = true;
                    assign_inspectors_to_facilities();
                    emit CommitteeVotesFrozen(block.timestamp);
                }

        }
    }

    function getCurrentInspectors() Frozen public view returns (Inspector[5] memory winners) {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        for (uint8 i = 0 ; i < 5 ; i++){
            winners[i] = l.candidate_addresses[l.top_6_votes[i].wallet];
        }
    }

    function assign_inspectors_to_facilities() internal {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        Inspector[5] memory inspectors = getCurrentInspectors();
        for (uint256 i = 0 ; i < l.deployedFacilities.length ; i++){
            l.facility_to_inspector[l.deployedFacilities[i]] = inspectors[i % 5];
            l.inspector_to_facilities[inspectors[i%5].wallet].push(l.deployedFacilities[i]);
        }
    }

    // ------------------------------------------------------------------
    // Candidacy lifecycle
    // ------------------------------------------------------------------

    function become_candidate(string[] memory attached_documents) external {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        require(l.candidateIndexPlusOne[msg.sender] == 0, "Already a candidate");
        Inspector memory inspector = Inspector({
            wallet: msg.sender,
            AttachedDocumentsCIDs: attached_documents
        });
        l.candidates.push(inspector);
        l.candidate_addresses[msg.sender] = inspector;

        l.candidateIndexPlusOne[msg.sender] = l.candidates.length;
    }

    function quit_candidateship() external {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        uint256 indexPlusOne = l.candidateIndexPlusOne[msg.sender];
        require(indexPlusOne != 0, "Not a candidate");

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = l.candidates.length - 1;

        if (index != lastIndex) {
            Inspector memory lastCandidate = l.candidates[lastIndex];
            l.candidates[index] = lastCandidate;
            l.candidateIndexPlusOne[lastCandidate.wallet] = indexPlusOne;
        }

        l.candidates.pop();
        delete l.candidateIndexPlusOne[msg.sender];
        delete l.candidate_votes[msg.sender];
        delete l.candidate_addresses[msg.sender];
        l.CandidateIsCompliant[msg.sender] = false;
    }

    function InspectorSignContract(
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        require(l.candidateIndexPlusOne[msg.sender] != 0, "Not a candidate");

        // 1. Build the message hash (must match what the signer signed)
        bytes32 messageHash = keccak256(abi.encodePacked(l.inspector_contract.cid));

        // 2. If the signer used the EIP-191 prefix (MetaMask / ethers.signMessage),
        //    wrap the hash with the same prefix before recovering.
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // 3. Recover the signer
        address signer = ecrecover(ethSignedHash, v, r, s);

        // 4. ecrecover returns address(0) on failure — reject that
        require(signer != address(0), "Invalid signature");

        // 5. Ensure the recovered address is the sender
        require(signer == msg.sender, "Signature does not match sender");
        l.CandidateIsCompliant[msg.sender] = true;
    }

    function change_candidate_documents(string[] memory new_docs) external {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        require(l.candidateIndexPlusOne[msg.sender] != 0, "Not even a candidate");
        l.candidates[l.candidateIndexPlusOne[msg.sender] - 1].AttachedDocumentsCIDs = new_docs;
    }

    // ------------------------------------------------------------------
    // DAO membership
    // ------------------------------------------------------------------

    function set_committee_member(address new_member, address facility_contract)
        external
        payable
        onlyFacilityAdmin(facility_contract)
    {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        if (new_member == address(0)) revert("invalid member");
        address[] storage members = l.committee_members_per_facility[facility_contract];
        uint256 requiredFee = members.length == 0 ? 25_000_000 : 100_000_000;
        require(msg.value >= requiredFee, "insufficient fee");
        require(members.length < 3, "cannot add more members from your facility");
        require(l.DAOIndexPlusOne[new_member] == 0, "already a committee member");

        members.push(new_member);
        l.DAO.push(new_member);
        l.DAOIndexPlusOne[new_member] = l.DAO.length;
        l.memberStake[new_member] = requiredFee;

        uint256 excess = msg.value - requiredFee;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            require(ok, "refund failed");
        }
    }

    function remove_committee_member(address member, address facility_contract)
        external
        onlyFacilityAdmin(facility_contract)
    {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        address[] storage members = l.committee_members_per_facility[facility_contract];

        // Remove from the facility's own list using the generic helper
        require(helpers._removeAddressFromArray(members, member), "member not found");

        // Remove from the global DAO array using O(1) swap-and-pop via DAOIndexPlusOne
        uint256 daoIdxPlusOne = l.DAOIndexPlusOne[member];
        require(daoIdxPlusOne != 0, "member not in DAO array");
        uint256 daoIdx = daoIdxPlusOne - 1;
        uint256 daoLast = l.DAO.length - 1;

        if (daoIdx != daoLast) {
            address lastMember = l.DAO[daoLast];
            l.DAO[daoIdx] = lastMember;
            l.DAOIndexPlusOne[lastMember] = daoIdx + 1; // fix the moved member's index
        }
        l.DAO.pop();
        delete l.DAOIndexPlusOne[member];

        uint256 refund = l.memberStake[member];
        delete l.memberStake[member];
        helpers._removeAddressFromArray(l.current_committee , member);

        (bool ok, ) = payable(msg.sender).call{value: refund}("");
        require(ok, "refund failed");
    }
}