// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./InitFactory.sol";
import "./../data_structs.sol";
import {RandomPicker} from "./../utils.sol";
import {ICommitteeInspector} from "./../interfaces/IFactory.sol";
import {NewCommittee, CommitteeVotesFrozen} from "./../Events.sol";
import {helpers} from "./../helpers.sol";


abstract contract CommitteeInspector is FactoryStorageBase, ICommitteeInspector {


    // Weak PRNG fix: uses Hedera HIP-351 PRNG via RandomPicker (non-view now).
    function generate_new_committee() external {
        require(
            block.timestamp >= latest_committee_generation_timestamp + 4 weeks,
            "too early to generate committee"
        );

        clear_committee_votes();

        if (DAO.length <= 5) {
            current_committee = DAO;
        } else {
            current_committee = RandomPicker.pickRandom(DAO, 5);
        }

        latest_committee_generation_timestamp = block.timestamp;
        emit NewCommittee();
    }

    function clear_committee_votes() internal {
        // Clear hasVoted for everyone who voted
        uint256 votersLen = voters.length;
        for (uint256 i = 0; i < votersLen; i++) {
            delete hasVoted[voters[i]];
        }
        delete voters;
        votes_frozen = false;

        // Clear candidate vote tallies
        uint256 candLen = candidates.length;
        for (uint256 i = 0; i < candLen; i++) {
            delete candidate_votes[candidates[i].wallet];
        }
        for (uint8 i = 0 ; i < top_6_votes.length ; i++){
            delete top_6_votes[i];
        }
    }

    // ------------------------------------------------------------------
    // Ranking
    // ------------------------------------------------------------------

    function _refreshTop6(address who) internal {
        helpers._removeFromTop6(who, top_6_votes);
        helpers._insertIntoTop6(who, candidate_votes[who] , top_6_votes);
    }


   function rank_candidates(address[] calldata preferences)
    external
    isCommitteeMember(msg.sender)
    {
        require(!votes_frozen, "votes are already frozen");
        require(!hasVoted[msg.sender], "You have already voted");
        hasVoted[msg.sender] = true;
        voters.push(msg.sender);

        uint256 n = preferences.length < 5 ? preferences.length : 5;

        for (uint256 i = 0; i < n; i++) {
            address c = preferences[i];
            if (c == address(0)) break;
            require(candidateIndexPlusOne[c] != 0, "not a candidate");

            for (uint256 j = 0; j < i; j++) {
                if (preferences[j] == c) revert("duplicate address not allowed");
            }

            candidate_votes[c] += 5 - i;

            _refreshTop6(c);   // <-- slide / insert / drop as needed
        }
        if (!votes_frozen){

            if (
                    (candidates.length <= 5) ||
                    (top_6_votes[4].votes - top_6_votes[5].votes >= 5 && voters.length >= 4) ||
                    (voters.length >= 3 && block.timestamp - latest_committee_generation_timestamp >= 2 days)
                ) {
                    votes_frozen = true;
                }
            
        }

    }

    

    // ------------------------------------------------------------------
    // Candidacy lifecycle
    // ------------------------------------------------------------------

    mapping(address => uint256) private candidateIndexPlusOne; // for deletion of candidateship optimization
    

    function become_candidate(string[] memory attached_documents) external {
        require(candidateIndexPlusOne[msg.sender] == 0, "Already a candidate");
        Inspector memory inspector = Inspector({
            wallet: msg.sender,
            AttachedDocumentsCIDs: attached_documents
        });
        candidates.push(inspector);
        candidate_addresses[msg.sender] = inspector;

        candidateIndexPlusOne[msg.sender] = candidates.length;
    }

    function quit_candidateship() external {
        uint256 indexPlusOne = candidateIndexPlusOne[msg.sender];
        require(indexPlusOne != 0, "Not a candidate");

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = candidates.length - 1;

        if (index != lastIndex) {
            Inspector memory lastCandidate = candidates[lastIndex];
            candidates[index] = lastCandidate;
            candidateIndexPlusOne[lastCandidate.wallet] = indexPlusOne;
        }

        candidates.pop();
        delete candidateIndexPlusOne[msg.sender];
        delete candidate_votes[msg.sender];
        delete candidate_addresses[msg.sender];
        CandidateIsCompliant[msg.sender] = false;
    }

    function InspectorSignContract(
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(candidateIndexPlusOne[msg.sender] != 0, "Not a candidate");

        // 1. Build the message hash (must match what the signer signed)
        bytes32 messageHash = keccak256(abi.encodePacked(inspector_contract.cid));

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
        CandidateIsCompliant[msg.sender] = true;
    }

    function change_candidate_documents(string[] memory new_docs) external {
        require(candidateIndexPlusOne[msg.sender] != 0, "Not even a candidate");
        candidates[candidateIndexPlusOne[msg.sender] - 1].AttachedDocumentsCIDs = new_docs;
    }

    // ------------------------------------------------------------------
    // DAO membership
    // ------------------------------------------------------------------

    mapping(address => uint256) private DAOIndexPlusOne; // for deletion of DAO entry optimization
    

    function set_committee_member(address new_member, address facility_contract)
        external
        payable
        onlyFacilityAdmin(facility_contract)
    {
        if (new_member == address(0)) revert("invalid member");
        address[] storage members = committee_members_per_facility[facility_contract];
        uint256 requiredFee = members.length == 0 ? 25_000_000 : 100_000_000;
        require(msg.value >= requiredFee, "insufficient fee");
        require(members.length < 3, "cannot add more members from your facility");
        require(DAOIndexPlusOne[new_member] == 0, "already a committee member");

        members.push(new_member);
        DAO.push(new_member);
        DAOIndexPlusOne[new_member] = DAO.length;
        memberStake[new_member] = requiredFee;

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
        address[] storage members = committee_members_per_facility[facility_contract];

        // Remove from the facility's own list using the generic helper
        require(helpers._removeAddressFromArray(members, member), "member not found");

        // Remove from the global DAO array using O(1) swap-and-pop via DAOIndexPlusOne
        uint256 daoIdxPlusOne = DAOIndexPlusOne[member];
        require(daoIdxPlusOne != 0, "member not in DAO array");
        uint256 daoIdx = daoIdxPlusOne - 1;
        uint256 daoLast = DAO.length - 1;

        if (daoIdx != daoLast) {
            address lastMember = DAO[daoLast];
            DAO[daoIdx] = lastMember;
            DAOIndexPlusOne[lastMember] = daoIdx + 1; // fix the moved member's index
        }
        DAO.pop();
        delete DAOIndexPlusOne[member];

        uint256 refund = memberStake[member];
        delete memberStake[member];
        helpers._removeAddressFromArray(current_committee , member);

        (bool ok, ) = payable(msg.sender).call{value: refund}("");
        require(ok, "refund failed");
    }

    // ------------------------------------------------------------------
    // Inspector selection
    // ------------------------------------------------------------------

    
}