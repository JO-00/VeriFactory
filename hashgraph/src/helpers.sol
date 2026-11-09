// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Inspector , CandidateVotes} from "./data_structs.sol";

library helpers {
    function _removeAddressFromArray(address[] storage arr, address target) internal returns (bool) {
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
    function _removeInspectorFromArray(Inspector[] storage arr, address target) internal returns (bool) {
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
    function _removeFromTop6(address who , CandidateVotes[] storage top_6_votes) internal {
        for (uint256 i = 0; i < 6; i++) {
            if (top_6_votes[i].wallet == who) {
                // shift everything after i one slot left
                for (uint256 j = i; j < 5; j++) {
                    top_6_votes[j] = top_6_votes[j + 1];
                }
                // clear the last slot
                top_6_votes[5] = CandidateVotes(address(0), 0);
                return;
            }
        }
    }
    function _insertIntoTop6(address who, uint256 vote , CandidateVotes[] storage top_6_votes) internal {
        if (vote == 0) return; // never store zero-vote candidates

        // Find first slot whose vote is strictly less than `vote` (descending order).
        // If none, it doesn't qualify for the top 6.
        uint256 pos = 6;
        for (uint256 i = 0; i < 6; i++) {
            if (top_6_votes[i].wallet == address(0) || vote > top_6_votes[i].votes) {
                pos = i;
                break;
            }
            // Tie handling: if vote == top_6_votes[i].vote, we keep the existing
            // occupant ahead (stable). Change to `>=` if you want new arrivals to win ties.
        }
        if (pos == 6) return; // doesn't make the cut

        // shift right from pos..5
        for (uint256 j = 5; j > pos; j--) {
            top_6_votes[j] = top_6_votes[j - 1];
        }
        top_6_votes[pos] = CandidateVotes(who, vote);
    }

}