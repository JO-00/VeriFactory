// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FactoryStorage} from "./FactoryStorageBase.sol";
import {FacilityRegistry} from "./../Facility/FacilityRegistry.sol";

abstract contract FactoryAuth {
    modifier onlyOwner() {
        require(msg.sender == FactoryStorage.layout().owner, "Factory: caller is not the owner");
        _;
    }
    modifier onlyFacilityAdmin(address _facility) {
        require(msg.sender == FacilityRegistry(payable(_facility)).admin(), "Unauthorized");
        _;
    }
    modifier isCommitteeMember(address entity) {
        FactoryStorage.Layout storage l = FactoryStorage.layout();
        bool found = false;
        for (uint256 i = 0 ; i < l.current_committee.length ; i++){
            if (l.current_committee[i] == entity){
                found = true;
                break;
            }
        }
        if (!found){
            revert("not a committee member");
        }
        _;
    }
    modifier Frozen{
        require(FactoryStorage.layout().votes_frozen, "votes are not frozen yet");
        _;
    }
}