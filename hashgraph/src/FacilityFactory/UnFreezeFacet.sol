// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FactoryStorage} from "./FactoryStorageBase.sol";
import {FactoryAuth} from "./FactoryAuth.sol";
import {Inspector} from "./../data_structs.sol";

contract UnfreezeFacet is FactoryAuth {
    
    function unfreeze_votes() external {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        
        require(l.voters.length >= 5, "Not all 5 members have voted yet");
        
        l.votes_frozen = true;

        uint256 votersLen = l.voters.length;
        for (uint256 i = 0; i < votersLen; i++) {
            delete l.hasVoted[l.voters[i]];
        }
        delete l.voters;
    }
    function assign_inspectors_if_frozen() external {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        
        // 1. Ensure votes are actually frozen before doing this
        require(l.votes_frozen, "Votes are not frozen yet");

        // 2. We must recreate the getCurrentInspectors logic here
        // (Copy-pasted from CommitteeInspector)
        Inspector[5] memory inspectors;
        for (uint8 i = 0 ; i < 5 ; i++){
            inspectors[i] = l.candidate_addresses[l.top_6_votes[i].wallet];
        }

        // 3. We must recreate assign_inspectors_to_facilities logic here
        // (Copy-pasted from CommitteeInspector)
        for (uint256 i = 0 ; i < l.deployedFacilities.length ; i++) {
            l.facility_to_inspector[l.deployedFacilities[i]] = inspectors[i % 5];
            l.inspector_to_facilities[inspectors[i % 5].wallet].push(l.deployedFacilities[i]);
        }
    }
}