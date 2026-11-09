// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./InitFactory.sol";
import "./../data_structs.sol";
import {RandomPicker} from "./../utils.sol";
import {ICommitteeInspector} from "./../interfaces/IFactory.sol";
import {NewCommittee} from "./../Events.sol";


abstract contract CommitteeInspector is FactoryStorageBase, ICommitteeInspector {

    // ------------------------------------------------------------------
    // Generic swap-and-pop helpers
    // ------------------------------------------------------------------

    /// @dev Removes `target` from `arr` (address array) via swap-and-pop.
    ///      Returns true if the element was found and removed, false otherwise.
    function _removeAddressFromArray(address[] storage arr, address target) private returns (bool) {
        uint256 len = arr.length;
        for (uint256 i = 0; i < len; i++) {
            if (arr[i] == target) {
                arr[i] = arr[len - 1];
                arr.pop();
                return true;
            }
        }
        return false;
    }

    /// @dev Removes the Inspector whose wallet == `target` from `arr` via swap-and-pop.
    ///      Returns true if found and removed, false otherwise.
    ///      Note: memory copy of the Inspector (contains a dynamic array) is fine,
    ///      the swap-and-pop pattern works with `Inspector memory` intermediate.
    function _removeInspectorFromArray(Inspector[] storage arr, address target) private returns (bool) {
        uint256 len = arr.length;
        for (uint256 i = 0; i < len; i++) {
            if (arr[i].wallet == target) {
                arr[i] = arr[len - 1];
                arr.pop();
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------------
    // Committee generation
    // ------------------------------------------------------------------

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

        // Clear candidate vote tallies
        uint256 candLen = candidates.length;
        for (uint256 i = 0; i < candLen; i++) {
            delete candidate_votes[candidates[i].wallet];
        }
    }

    // ------------------------------------------------------------------
    // Ranking
    // ------------------------------------------------------------------

    function rank_candidates(address[] calldata preferences)
        external
        isCommitteeMember(msg.sender)
    {
        require(!hasVoted[msg.sender], "You have already voted");
        hasVoted[msg.sender] = true;
        voters.push(msg.sender);

        uint256 n = preferences.length < 5 ? preferences.length : 5;

        for (uint256 i = 0; i < n; i++) {
            address c = preferences[i];

            if (c == address(0)) break;
            require(candidateIndexPlusOne[c] != 0, "not a candidate");

            // reject duplicates within this ranking
            for (uint256 j = 0; j < i; j++) {
                if (preferences[j] == c) revert("duplicate address not allowed");
            }

            candidate_votes[c] += 5 - i;
        }
    }

    

    // ------------------------------------------------------------------
    // Candidacy lifecycle
    // ------------------------------------------------------------------

    mapping(address => uint256) private candidateIndexPlusOne; // for deletion of candidateship optimization

    function become_candidate(string[] memory attached_documents) external {
        require(candidateIndexPlusOne[msg.sender] == 0, "Already a candidate");

        candidates.push(Inspector({
            wallet: msg.sender,
            AttachedDocumentsCIDs: attached_documents
        }));

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
        require(_removeAddressFromArray(members, member), "member not found");

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
        _removeAddressFromArray(current_committee , member);

        (bool ok, ) = payable(msg.sender).call{value: refund}("");
        require(ok, "refund failed");
    }

    // ------------------------------------------------------------------
    // Inspector selection
    // ------------------------------------------------------------------

    function getCurrentInspectors() external view returns (Inspector[5] memory winners) {
        uint256 n = candidates.length;
        require(n >= 5, "fewer than 5 candidates");

        for (uint256 k = 0; k < 5; k++) {
            uint256 bestVotes = type(uint256).max; // sentinel: "no candidate considered yet"
            uint256 bestIdx = type(uint256).max;
            bool found = false;

            for (uint256 i = 0; i < n; i++) {
                address c = candidates[i].wallet;
                uint256 votes = candidate_votes[c];

                // skip if already picked in an earlier slot
                bool already = false;
                for (uint256 j = 0; j < k; j++) {
                    if (winners[j].wallet == c) { already = true; break; }
                }
                if (already) continue;

                // first unpicked candidate always qualifies (even with 0 votes)
                if (!found) {
                    bestVotes = votes;
                    bestIdx = i;
                    found = true;
                    continue;
                }

                // strictly better votes → take it
                if (votes > bestVotes) {
                    bestVotes = votes;
                    bestIdx = i;
                }
                // tie-break: equal votes → lower index in candidates[] wins
                else if (votes == bestVotes && i < bestIdx) {
                    bestIdx = i;
                }
            }

            require(found, "not enough candidates");
            winners[k] = candidates[bestIdx];
        }

        return winners;
    }
}